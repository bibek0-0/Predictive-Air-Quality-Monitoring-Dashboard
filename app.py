
from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
import json, os, joblib, requests, warnings
from dotenv import load_dotenv
load_dotenv()
import pandas as pd
import numpy as np
warnings.filterwarnings("ignore")

app = Flask(__name__)
CORS(app)

#  CONFIG

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

STATIONS = {
    'Ratnapark':  {'lat': 27.706597826440785, 'lon': 85.31535151033474},
    'Pulchowk':   {'lat': 27.67836766910165,  'lon': 85.31610049584009},
    'Bhaisipati': {'lat': 27.658885515759717, 'lon': 85.32517963485796},
    'Bhaktapur':  {'lat': 27.67357783708027,  'lon': 85.42737758679067},
    'Shankapark': {'lat': 27.679954767188494, 'lon': 85.33040590299137},
}

MODEL_DIR               = 'models'
FORECAST_DIR            = 'forecasts'
FORECAST_HOURS          = 48
UPDATE_INTERVAL_MINUTES = 60

# Rate limit guard: tracks last successful API call per station 
LAST_GOOGLE_CALL = {}


LAG_FEATURES = [
    'PM10',
    'hour', 'dayofweek', 'month', 'is_weekend',
    'pm25_lag1',  'pm25_lag2',  'pm25_lag3',
    'pm25_lag6',  'pm25_lag12', 'pm25_lag24', 'pm25_lag48',
    'pm10_lag1',  'pm10_lag6',  'pm10_lag24',
    'pm25_roll6_mean',  'pm25_roll24_mean',
    'pm25_roll24_std',  'pm25_roll24_max',
    'pm25_diff1', 'pm25_diff24',
]

os.makedirs(FORECAST_DIR, exist_ok=True)


#  AQI HELPERS


def pm25_to_aqi(pm25):
    bp = [(0,12,0,50),(12.1,35.4,51,100),(35.5,55.4,101,150),
          (55.5,150.4,151,200),(150.5,250.4,201,300),(250.5,500.4,301,500)]
    pm25 = float(max(0, min(pm25, 500)))
    for cl, ch, il, ih in bp:
        if cl <= pm25 <= ch:
            return int(round((ih-il)/(ch-cl)*(pm25-cl)+il))
    return 500

def aqi_category(aqi):
    if aqi <= 50:  return 'Good',                           '#00e400'
    if aqi <= 100: return 'Moderate',                       '#ffff00'
    if aqi <= 150: return 'Unhealthy for Sensitive Groups', '#ff7e00'
    if aqi <= 200: return 'Unhealthy',                      '#ff0000'
    if aqi <= 300: return 'Very Unhealthy',                 '#8f3f97'
    return              'Hazardous',                        '#7e0023'


#  GOOGLE AIR QUALITY API 

def update_seed_from_google(lat, lon, station):
    """
    Fetch current PM2.5 + PM10 from Google Air Quality API.

    Rate-limit guard:
      - Blocks duplicate calls within 50 minutes for the same station
      - Even if scheduler fires multiple times accidentally max 1 call
        per station per hour → 120 calls/day for 5 stations 

    Returns dict { pm25, pm10, aqi, category, color } or None on skip/error.
    """

    # Guard: skip if called too recently 
    now = datetime.now()
    if station in LAST_GOOGLE_CALL:
        elapsed = now - LAST_GOOGLE_CALL[station]
        if elapsed < timedelta(minutes=50):
            remaining = 50 - int(elapsed.total_seconds() // 60)
            print(f"  [SKIP] {station}: API call blocked — {remaining} min until next allowed")
            return None
    
    if not GOOGLE_API_KEY:
        print(f"  [SKIP] {station}: GOOGLE_API_KEY env var not set")
        return None

    url = "https://airquality.googleapis.com/v1/currentConditions:lookup"
    payload = {
        "location": {"latitude": lat, "longitude": lon},
        "extraComputations": ["POLLUTANT_CONCENTRATION"],
        "languageCode": "en"
    }
    try:
        res = requests.post(
            url,
            json    = payload,
            params  = {"key": GOOGLE_API_KEY},
            timeout = 10
        )

        if res.status_code != 200:
            print(f"  [Google] {station}: HTTP {res.status_code} — {res.text[:120]}")
            return None

        # Record successful call time ONLY after confirmed 200 
        LAST_GOOGLE_CALL[station] = now
     

        data = res.json()
        pm25 = pm10 = None

        for p in data.get("pollutants", []):
            code = p.get("code", "")
            val  = p.get("concentration", {}).get("value")
            if code == "pm25" and val is not None: pm25 = float(val)
            if code == "pm10" and val is not None: pm10 = float(val)

        if pm25 is None:
            print(f"  [Google] {station}: PM2.5 not in response")
            return None

        pm10    = pm10 if pm10 else round(pm25 * 1.5, 2)
        aqi_val = pm25_to_aqi(pm25)
        cat, col = aqi_category(aqi_val)

        # directly update seed — no need to return data to frontend
        update_seed_with_live(station, pm25, pm10)
        print(f"  [Seed] {station}: PM2.5={round(pm25,2)} PM10={round(pm10,2)} written to seed")
        return True

    except Exception as e:
        print(f"  [Google] {station}: Request failed — {e}")
        return None


def update_seed_with_live(station, live_pm25, live_pm10):
    seed_path = os.path.join(MODEL_DIR, f'{station}_seed.csv')
    if not os.path.exists(seed_path):
        print(f"  [WARN] Seed not found for {station}")
        return

    seed    = pd.read_csv(seed_path, index_col=0, parse_dates=True)
    new_row = pd.DataFrame([{'PM2.5': live_pm25, 'PM10': live_pm10}],
                           index=[pd.Timestamp.now().floor('h')])
    seed = pd.concat([seed, new_row])
    seed = seed[~seed.index.duplicated(keep='last')]
    seed = seed.tail(72)
    seed.to_csv(seed_path)

#  XGBOOST FORECAST ENGINE


def run_forecast_for_station(station):
    model_path = os.path.join(MODEL_DIR, f'{station}_xgb.joblib')
    seed_path  = os.path.join(MODEL_DIR, f'{station}_seed.csv')

    if not os.path.exists(model_path) or not os.path.exists(seed_path):
        print(f"  [SKIP] {station}: model or seed missing")
        return None

    model   = joblib.load(model_path)
    seed    = pd.read_csv(seed_path, index_col=0, parse_dates=True)
    seed    = seed.dropna(subset=['PM2.5']).tail(72)

    pm25_buf = list(seed['PM2.5'].values)
    pm10_buf = list(seed['PM10'].fillna(seed['PM2.5'] * 1.5).values)
    last_ts  = seed.index[-1]
    output   = []

    for step in range(1, FORECAST_HOURS + 1):
        ts  = last_ts + pd.Timedelta(hours=step)
        row = {
            'PM10':             pm10_buf[-1],
            'hour':             ts.hour,
            'dayofweek':        ts.dayofweek,
            'month':            ts.month,
            'is_weekend':       int(ts.dayofweek >= 5),
            'pm25_lag1':        pm25_buf[-1],
            'pm25_lag2':        pm25_buf[-2]  if len(pm25_buf)>=2  else pm25_buf[-1],
            'pm25_lag3':        pm25_buf[-3]  if len(pm25_buf)>=3  else pm25_buf[-1],
            'pm25_lag6':        pm25_buf[-6]  if len(pm25_buf)>=6  else pm25_buf[-1],
            'pm25_lag12':       pm25_buf[-12] if len(pm25_buf)>=12 else pm25_buf[-1],
            'pm25_lag24':       pm25_buf[-24] if len(pm25_buf)>=24 else pm25_buf[-1],
            'pm25_lag48':       pm25_buf[-48] if len(pm25_buf)>=48 else pm25_buf[-1],
            'pm10_lag1':        pm10_buf[-1],
            'pm10_lag6':        pm10_buf[-6]  if len(pm10_buf)>=6  else pm10_buf[-1],
            'pm10_lag24':       pm10_buf[-24] if len(pm10_buf)>=24 else pm10_buf[-1],
            'pm25_roll6_mean':  float(np.mean(pm25_buf[-6:])),
            'pm25_roll24_mean': float(np.mean(pm25_buf[-24:])),
            'pm25_roll24_std':  float(np.std(pm25_buf[-24:])),
            'pm25_roll24_max':  float(np.max(pm25_buf[-24:])),
            'pm25_diff1':       pm25_buf[-1] - pm25_buf[-2]  if len(pm25_buf)>=2  else 0.0,
            'pm25_diff24':      pm25_buf[-1] - pm25_buf[-25] if len(pm25_buf)>=25 else 0.0,
        }

        pm25_pred = float(max(0.0, model.predict(
            pd.DataFrame([row])[LAG_FEATURES])[0]))

        # stabilize recursive forecast blends prediction with last known value
        
        pm25_pred = 0.8 * pm25_pred + 0.2 * pm25_buf[-1]

        aqi_val   = pm25_to_aqi(pm25_pred)
        cat, col  = aqi_category(aqi_val)

        pm25_buf.append(pm25_pred)
        pm10_buf.append(pm25_pred * 1.5)
        if len(pm25_buf) > 80: pm25_buf.pop(0)
        if len(pm10_buf) > 80: pm10_buf.pop(0)

        output.append({
            'timestamp':  ts.strftime('%Y-%m-%dT%H:%M:%S'),
            'hour_ahead': step,
            'pm25':       round(pm25_pred, 2),
            'aqi':        aqi_val,
            'category':   cat,
            'color':      col,
        })

    return output


#  SCHEDULED JOB

def refresh_all_forecasts():
    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Refreshing forecasts...")

    for station, coords in STATIONS.items():
        try:
            updated = update_seed_from_google(coords['lat'], coords['lon'], station)
            if not updated:
                print(f"  [XGBoost]  {station}: Google skipped — using existing seed")

            fc = run_forecast_for_station(station)
            if fc:
                out = os.path.join(FORECAST_DIR, f'{station}_forecast.json')
                with open(out, 'w') as f:
                    json.dump(fc, f, indent=2)
                print(f"  [Forecast] {station}: 48h saved")

        except Exception as e:
            print(f" {station}: {e}")

    print(f"  Done. Next refresh in {UPDATE_INTERVAL_MINUTES} min.")
    print(f"  API call log: { {s: t.strftime('%H:%M') for s,t in LAST_GOOGLE_CALL.items()} }")


#  STATIC FILE SERVING


@app.route('/')
def home():
    return send_from_directory('.', 'index.html')

@app.route('/pages/<path:filename>')
def pages(filename):
    return send_from_directory('pages', filename)

@app.route('/js/<path:filename>')
def js_files(filename):
    return send_from_directory('js', filename)

@app.route('/css/<path:filename>')
def css_files(filename):
    return send_from_directory('css', filename)

@app.route('/assets/<path:filename>')
def assets(filename):
    return send_from_directory('assets', filename)


#  API ROUTES

# Google API is used only to update seeds.
# The frontend reads XGBoost forecast output.

@app.route('/api/forecast/<station>')
def get_forecast(station):
    if station not in STATIONS:
        return jsonify({'error': 'Station not found'}), 404
    path = os.path.join(FORECAST_DIR, f'{station}_forecast.json')
    if not os.path.exists(path):
        fc = run_forecast_for_station(station)
        if not fc:
            return jsonify({'error': 'Model not ready'}), 500
        with open(path, 'w') as f:
            json.dump(fc, f, indent=2)
    with open(path) as f:
        data = json.load(f)
    return jsonify({
        'station':      station,
        'forecast':     data,
        'generated_at': datetime.fromtimestamp(
                            os.path.getmtime(path)
                        ).strftime('%Y-%m-%d %H:%M:%S')
    })

@app.route('/api/forecast/all/summary')
def forecast_summary():
    result = []
    for station in STATIONS:
        path = os.path.join(FORECAST_DIR, f'{station}_forecast.json')
        if os.path.exists(path):
            with open(path) as f:
                fc = json.load(f)
            first = fc[0]
            result.append({
                'station':  station,
                'pm25':     first['pm25'],
                'aqi':      first['aqi'],
                'category': first['category'],
                'color':    first['color'],
            })
    return jsonify(result)

@app.route('/api/metrics')
def get_metrics():
    path = os.path.join(MODEL_DIR, 'xgb_metrics.csv')
    if not os.path.exists(path):
        return jsonify({'error': 'Metrics file not found'}), 404
    df = pd.read_csv(path, index_col=0)
    return jsonify(df.reset_index().to_dict(orient='records'))

@app.route('/api/status')
def status():
    info = {}
    for s in STATIONS:
        path = os.path.join(FORECAST_DIR, f'{s}_forecast.json')
        last_call = LAST_GOOGLE_CALL.get(s)
        info[s] = {
            'forecast_ready': os.path.exists(path),
            'last_forecast':  datetime.fromtimestamp(
                                  os.path.getmtime(path)
                              ).strftime('%Y-%m-%d %H:%M:%S') if os.path.exists(path) else None,
            'last_seed_update': last_call.strftime('%Y-%m-%d %H:%M:%S') if last_call else 'never',
            'next_seed_update': (last_call + timedelta(minutes=50)).strftime('%H:%M') if last_call else 'now',
        }
    return jsonify({
        'status':           'running',
        'google_api':       'seed-update only — ' + ('configured' if GOOGLE_API_KEY else 'NOT SET — run: set GOOGLE_API_KEY=your_key'),
        'stations':         info,
        'refresh_interval': f'{UPDATE_INTERVAL_MINUTES} min',
        'max_calls_per_day': len(STATIONS) * 24,
    })

@app.route('/api/refresh', methods=['POST'])
def manual_refresh():
    refresh_all_forecasts()
    return jsonify({'status': 'ok', 'refreshed_at': datetime.now().strftime('%H:%M:%S')})


#  START


if __name__ == '__main__':
    #refresh_all_forecasts()

    #scheduler = BackgroundScheduler()
    #scheduler.add_job(
    #    refresh_all_forecasts,
    #    trigger  = 'interval',
    #    minutes  = UPDATE_INTERVAL_MINUTES,
    #    id       = 'forecast_refresh'
    #)
    #scheduler.start()

    print(f"\n http://localhost:5050")
    print(f"   Google API: {'Configured' if GOOGLE_API_KEY else 'Not set'}")
    print(f"   Rate limit: max 1 seed update per station per 50 min = 120 calls/day")
    print(f"   Google API: seed updates")
    print(f"   Auto-refresh: every {UPDATE_INTERVAL_MINUTES} min\n")

    try:
        app.run(debug=False, port=5050, use_reloader=False)
    except (KeyboardInterrupt, SystemExit):
        #scheduler.shutdown()
        print("\n Server stopped.")
