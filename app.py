from flask import Flask, jsonify, send_from_directory, request, redirect
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
import json, os, joblib, requests, warnings
from dotenv import load_dotenv
load_dotenv()
import pandas as pd
import numpy as np
warnings.filterwarnings("ignore")

from utils.alert_engine import (
    add_subscriber, remove_subscriber, get_subscriber_status,
    get_subscriptions_for_email, check_and_send_alerts, aqi_category as alert_aqi_category
)

app = Flask(__name__)
CORS(app)

# config 

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
STATIONS = {
    "Ratnapark":  {"lat": 27.706597826440785, "lon": 85.31535151033474},
    "Pulchowk":   {"lat": 27.67836766910165,  "lon": 85.31610049584009},
    "Bhaisipati": {"lat": 27.658885515759717, "lon": 85.32517963485796},
    "Bhaktapur":  {"lat": 27.67357783708027,  "lon": 85.42737758679067},
    "Shankapark": {"lat": 27.679954767188494, "lon": 85.33040590299137},
}
MAP_ONLY_STATIONS = {
    "Thamel":        {"lat": 27.715000, "lon": 85.312000},
    "Boudha":        {"lat": 27.721400, "lon": 85.361700},
    "Kirtipur":      {"lat": 27.675000, "lon": 85.281400},
    "Gongabu":       {"lat": 27.734600, "lon": 85.312000},
    "Pashupatinath": {"lat": 27.710700, "lon": 85.348600},
}
MAP_ONLY_CACHE = {}
MODEL_DIR               = "models"
FORECAST_DIR            = "forecasts"
FORECAST_HOURS          = 48
UPDATE_INTERVAL_MINUTES = 60

os.makedirs(FORECAST_DIR, exist_ok=True)

# Rate limit guard: tracks last successful API call per station 

LAST_GOOGLE_CALL = {}

LAG_FEATURES = [
    "PM10","hour","dayofweek","month","is_weekend",
    "pm25_lag1","pm25_lag2","pm25_lag3","pm25_lag6","pm25_lag12","pm25_lag24","pm25_lag48",
    "pm10_lag1","pm10_lag6","pm10_lag24",
    "pm25_roll6_mean","pm25_roll24_mean","pm25_roll24_std","pm25_roll24_max",
    "pm25_diff1","pm25_diff24",
]

# AQI helpers

def pm25_to_aqi(pm25):
    """
    US EPA PM2.5 → AQI piecewise linear. Breakpoint table has intentional
    microgaps (e.g. 35.4–35.5 µg/m³), values there must not fall through to
    a bogus max AQI. NaN/inf from the model also must not become 500.
    """
    try:
        pm25 = float(pm25)
    except (TypeError, ValueError):
        return 0
    if not np.isfinite(pm25):
        return 0
    pm25 = float(max(0.0, min(pm25, 500.0)))
    bp = [(0,12,0,50),(12.1,35.4,51,100),(35.5,55.4,101,150),
          (55.5,150.4,151,200),(150.5,250.4,201,300),(250.5,500.4,301,500)]
    # Map EPA gaps to the start of the next bracket 
    gap_pairs = [(12.0, 12.1), (35.4, 35.5), (55.4, 55.5), (150.4, 150.5), (250.4, 250.5)]
    for lo, hi in gap_pairs:
        if lo < pm25 < hi:
            pm25 = hi
            break
    eps = 1e-9
    for cl, ch, il, ih in bp:
        if cl - eps <= pm25 <= ch + eps:
            return int(round((ih - il) / (ch - cl) * (pm25 - cl) + il))
    # Should not happen after gap snap last-bin clamp as safety net
    cl, ch, il, ih = bp[-1]
    pc = min(max(pm25, cl), ch)
    return int(round((ih - il) / (ch - cl) * (pc - cl) + il))
# GOOGLE AIR QUALITY API 

def aqi_category(aqi):
    if aqi <= 50:  return "Good",                           "#00e400"
    if aqi <= 100: return "Moderate",                       "#ffff00"
    if aqi <= 150: return "Unhealthy for Sensitive Groups", "#ff7e00"
    if aqi <= 200: return "Unhealthy",                      "#ff0000"
    if aqi <= 300: return "Very Unhealthy",                 "#8f3f97"
    return "Hazardous",                                     "#7e0023"

def live_from_seed(station):
    """
    Last row of the station seed CSV: raw PM2.5 → EPA AQI.
    Same source as map-nodes and alert realtime AQI 
    """
    seed_path = os.path.join(MODEL_DIR, f"{station}_seed.csv")
    if not os.path.exists(seed_path):
        return None
    try:
        seed_df = pd.read_csv(seed_path)
        if "PM2.5" not in seed_df.columns:
            return None
        last_pm25 = float(seed_df["PM2.5"].iloc[-1])
        if "PM10" in seed_df.columns and pd.notna(seed_df["PM10"].iloc[-1]):
            last_pm10 = float(seed_df["PM10"].iloc[-1])
        else:
            last_pm10 = round(last_pm25 * 1.5, 2)
        live_aqi = pm25_to_aqi(last_pm25)
        live_cat, live_col = aqi_category(live_aqi)
        live_ts = None
        if "time" in seed_df.columns:
            live_ts = str(seed_df["time"].iloc[-1])
        else:
            tcol = seed_df.columns[0]
            if tcol not in ("PM2.5", "PM10"):
                live_ts = str(seed_df.iloc[-1, 0])
        return {
            "aqi":        live_aqi,
            "pm25":       round(last_pm25, 2),
            "pm10":       round(last_pm10, 2),
            "category":   live_cat,
            "color":      live_col,
            "timestamp":  live_ts or datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        }
    except Exception:
        return None

# GOOGLE HISTORY API 

def seed_from_google_history(lat, lon, station, hours=72):
    if not GOOGLE_API_KEY:
        print(f"  SKIP {station}: GOOGLE_API_KEY not set")
        return False
    url = "https://airquality.googleapis.com/v1/history:lookup"
    payload = {
        "hours": hours,
        "location": {"latitude": lat, "longitude": lon},
        "extraComputations": ["POLLUTANT_CONCENTRATION"],
        "languageCode": "en"
    }
    all_rows = []
    page_token = None
    try:
        while True:
            request_payload = payload.copy()
            if page_token:
                request_payload["pageToken"] = page_token
            res = requests.post(url, json=request_payload, params={"key": GOOGLE_API_KEY}, timeout=15)
                
            if res.status_code != 200:
                print(f"  History API error {station}: {res.status_code} {res.text[:120]}")
                return False
            data = res.json()
            for hour_entry in data.get("hoursInfo", []):
                dt   = hour_entry.get("dateTime")
                pm25 = pm10 = None
                for p in hour_entry.get("pollutants", []):
                    code = p.get("code")
                    val  = p.get("concentration", {}).get("value")
                    if code == "pm25" and val is not None: pm25 = float(val)
                    if code == "pm10" and val is not None: pm10 = float(val)
                if pm25 is not None:
                    pm10 = pm10 if pm10 is not None else round(pm25 * 1.5, 2)
                    all_rows.append({"time": dt, "PM2.5": pm25, "PM10": pm10})
            page_token = data.get("nextPageToken")
            if not page_token:
                break
        if not all_rows:
            print(f"  No history rows returned for {station}")
            return False
        df = pd.DataFrame(all_rows).set_index("time")
        df.index = pd.to_datetime(df.index, utc=True).tz_convert("Asia/Kathmandu").tz_localize(None)
        df = df.sort_index()
        df = df.resample("1h").mean()
        df["PM2.5"] = df["PM2.5"].interpolate(method="time", limit=6)
        df["PM10"]  = df["PM10"].interpolate(method="time", limit=6)
        df["PM10"] = df["PM10"].fillna(df["PM2.5"] * 1.5)
        df.loc[df["PM10"] == df["PM2.5"], "PM10"] = df["PM2.5"] * 1.5
        df = df.dropna(subset=["PM2.5"])
        df = df.tail(72)
        seed_path = os.path.join(MODEL_DIR, f"{station}_seed.csv")
        df.to_csv(seed_path)
            
        if len(df) < 72:                                              
            print(f"Warning: only {len(df)}/72 rows for {station}")
        else:
            print(f"History seeded {station}: {len(df)} rows → {df.index[0]} to {df.index[-1]}")
        return True

    except Exception as e:
        print(f"  History API exception {station}: {e}")
        return False

# INITIALIZE SEEDS

def initialize_seeds():
    print("Checking seed freshness...")
    for station, coords in STATIONS.items():
        seed_path = os.path.join(MODEL_DIR, f"{station}_seed.csv")
        needs_reseed = True
        if os.path.exists(seed_path):
            try:
                df = pd.read_csv(seed_path, index_col=0, parse_dates=True)
                if len(df) > 0:
                    last_ts  = df.index[-1]
                    first_ts = df.index[0]
                    is_recent = pd.Timestamp.now() - last_ts  < pd.Timedelta(days=2)
                    is_clean  = pd.Timestamp.now() - first_ts < pd.Timedelta(days=5)
                    if is_recent and is_clean:
                        print(f"  {station} seed is fresh — skipping")
                        needs_reseed = False
                    else:
                        print(f"  {station} seed has old data — force re-seeding")
            except Exception:
                pass
        if needs_reseed:
            print(f"  {station} fetching 72h history from Google...")
            seed_from_google_history(coords["lat"], coords["lon"], station, hours=72)

def update_seed_from_google(lat, lon, station):
    now = datetime.now()
    if station in LAST_GOOGLE_CALL:
        elapsed = now - LAST_GOOGLE_CALL[station]
        if elapsed < timedelta(minutes=50):
            remaining = 50 - int(elapsed.total_seconds() / 60)
            print(f"  SKIP {station}: blocked {remaining} min")
            return None
    if not GOOGLE_API_KEY:
        print(f"  SKIP {station}: GOOGLE_API_KEY not set")
        return None
    url = "https://airquality.googleapis.com/v1/currentConditions:lookup"
    payload = {
        "location": {"latitude": lat, "longitude": lon},
        "extraComputations": ["POLLUTANT_CONCENTRATION"],
        "languageCode": "en"
    }
    try:
        res = requests.post(url, json=payload, params={"key": GOOGLE_API_KEY}, timeout=10)
        if res.status_code != 200:
            print(f"  Google {station} HTTP {res.status_code}: {res.text[:120]}")
            return None
        LAST_GOOGLE_CALL[station] = now
        data = res.json()
        pm25 = pm10 = None
        for p in data.get("pollutants", []):
            code = p.get("code")
            val  = p.get("concentration", {}).get("value")
            if code == "pm25" and val is not None: pm25 = float(val)
            if code == "pm10" and val is not None: pm10 = float(val)
        if pm25 is None:
            print(f"  Google {station}: PM2.5 not in response")
            return None
        pm10 = pm10 if pm10 is not None else round(pm25 * 1.5, 2)
        update_seed_with_live(station, pm25, pm10)
        print(f"  Seed {station}: PM2.5={round(pm25,2)} PM10={round(pm10,2)}")
        return True
    except Exception as e:
        print(f"  Google {station}: {e}")
        return None

def update_seed_with_live(station, live_pm25, live_pm10):
    seed_path = os.path.join(MODEL_DIR, f"{station}_seed.csv")
    if not os.path.exists(seed_path):
        print(f"  WARN: Seed not found for {station}")
        return
    seed = pd.read_csv(seed_path, index_col=0, parse_dates=True)
    new_row = pd.DataFrame(
        {"PM2.5": live_pm25, "PM10": live_pm10},
        index=[pd.Timestamp.now(tz="Asia/Kathmandu").replace(tzinfo=None).floor("h")]
    )
    seed = pd.concat([seed, new_row])
    seed = seed[~seed.index.duplicated(keep="last")]
    seed = seed.tail(72)
    seed.to_csv(seed_path)
    
# XGBOOST FORECAST ENGINE

def run_forecast_for_station(station):
    model_path = os.path.join(MODEL_DIR, f"{station}_xgb.joblib")
    seed_path  = os.path.join(MODEL_DIR, f"{station}_seed.csv")
    if not os.path.exists(model_path) or not os.path.exists(seed_path):
        print(f"  SKIP {station}: model or seed missing")
        return None
    model = joblib.load(model_path)
    seed  = pd.read_csv(seed_path, index_col=0, parse_dates=True)
    seed  = seed.dropna(subset=["PM2.5"]).tail(72)
    pm25_buf = list(seed["PM2.5"].values)
    pm10_buf = list(seed["PM10"].fillna(seed["PM2.5"] * 1.5).values)
    last_ts  = seed.index[-1]
    output   = []
    for step in range(1, FORECAST_HOURS + 1):
        ts  = last_ts + pd.Timedelta(hours=step)
        row = {
            "PM10":             pm10_buf[-1],
            "hour":             ts.hour,
            "dayofweek":        ts.dayofweek,
            "month":            ts.month,
            "is_weekend":       int(ts.dayofweek >= 5),
            "pm25_lag1":        pm25_buf[-1],
            "pm25_lag2":        pm25_buf[-2]  if len(pm25_buf) >= 2  else pm25_buf[-1],
            "pm25_lag3":        pm25_buf[-3]  if len(pm25_buf) >= 3  else pm25_buf[-1],
            "pm25_lag6":        pm25_buf[-6]  if len(pm25_buf) >= 6  else pm25_buf[-1],
            "pm25_lag12":       pm25_buf[-12] if len(pm25_buf) >= 12 else pm25_buf[-1],
            "pm25_lag24":       pm25_buf[-24] if len(pm25_buf) >= 24 else pm25_buf[-1],
            "pm25_lag48":       pm25_buf[-48] if len(pm25_buf) >= 48 else pm25_buf[-1],
            "pm10_lag1":        pm10_buf[-1],
            "pm10_lag6":        pm10_buf[-6]  if len(pm10_buf) >= 6  else pm10_buf[-1],
            "pm10_lag24":       pm10_buf[-24] if len(pm10_buf) >= 24 else pm10_buf[-1],
            "pm25_roll6_mean":  float(np.mean(pm25_buf[-6:])),
            "pm25_roll24_mean": float(np.mean(pm25_buf[-24:])),
            "pm25_roll24_std":  float(np.std(pm25_buf[-24:])),
            "pm25_roll24_max":  float(np.max(pm25_buf[-24:])),
            "pm25_diff1":       pm25_buf[-1] - pm25_buf[-2]  if len(pm25_buf) >= 2  else 0.0,
            "pm25_diff24":      pm25_buf[-1] - pm25_buf[-25] if len(pm25_buf) >= 25 else 0.0,
        }
        pm25_pred = float(max(0.0, model.predict(pd.DataFrame([row])[LAG_FEATURES])[0]))
        pm25_pred = 0.7 * pm25_pred + 0.3 * pm25_buf[-1]
        pm25_pred = float(np.clip(pm25_pred, 0, 250))
        if not np.isfinite(pm25_pred):
            pm25_pred = float(pm25_buf[-1])
        aqi_val   = pm25_to_aqi(pm25_pred)
        cat, col  = aqi_category(aqi_val)
        pm25_buf.append(pm25_pred)
        pm10_buf.append(pm25_pred * 1.5)
        if len(pm25_buf) > 80: pm25_buf.pop(0)
        if len(pm10_buf) > 80: pm10_buf.pop(0)
        output.append({
            "timestamp":  ts.strftime("%Y-%m-%dT%H:%M:%S"),
            "hour_ahead": step,
            "pm25":       round(pm25_pred, 2),
            "aqi":        aqi_val,
            "category":   cat,
            "color":      col,
        })
    return output

# SCHEDULED JOB 

def refresh_all_forecasts():
    print(f"{datetime.now().strftime('%H:%M:%S')} Refreshing forecasts...")
    for station, coords in STATIONS.items():
        try:
            updated = update_seed_from_google(coords["lat"], coords["lon"], station)
            if not updated:
                print(f"  XGBoost {station}: Google skipped, using existing seed")
            # Extract real-time AQI from the freshly updated seed
            realtime_aqi, realtime_cat, realtime_col = None, None, None
            try:
                seed_path = os.path.join(MODEL_DIR, f"{station}_seed.csv")
                seed_df = pd.read_csv(seed_path)
                last_pm25 = float(seed_df["PM2.5"].iloc[-1])
                realtime_aqi = pm25_to_aqi(last_pm25)
                realtime_cat, realtime_col = aqi_category(realtime_aqi)
            except Exception as e:
                print(f"  Could not read realtime seed for {station}: {e}")
                
            fc = run_forecast_for_station(station)
            if fc:
                out = os.path.join(FORECAST_DIR, f"{station}_forecast.json")
                with open(out, "w") as f:
                    json.dump(fc, f, indent=2)
                print(f"  Forecast {station}: 48h saved")

                # Pro Alert Integration - use True Realtime AQI + Forecast data
                if realtime_aqi is not None:
                    try:
                        check_and_send_alerts(station, realtime_aqi, realtime_cat, realtime_col, fc)
                    except Exception as alert_err:
                        print(f" Alert check error for {station}: {alert_err}")

        except Exception as e:
            print(f"  {station}: {e}")
    print(f"Done. Next refresh in {UPDATE_INTERVAL_MINUTES} min.")

# STATIC FILE SERVING

@app.route("/")
def home():
    return send_from_directory(".", "index.html")

@app.route("/pages/<path:filename>")
def pages(filename):
    return send_from_directory("pages", filename)

@app.route("/js/<path:filename>")
def js_files(filename):
    return send_from_directory("js", filename)

@app.route("/css/<path:filename>")
def css_files(filename):
    return send_from_directory("css", filename)

@app.route("/assets/<path:filename>")
def assets(filename):
    return send_from_directory("assets", filename)
#  API ROUTES

@app.route("/api/forecast/<station>")
def get_forecast(station):
    if station not in STATIONS:
        return jsonify({"error": "Station not found"}), 404
    path = os.path.join(FORECAST_DIR, f"{station}_forecast.json")
    if not os.path.exists(path):
        fc = run_forecast_for_station(station)
        if not fc:
            return jsonify({"error": "Model not ready"}), 500
        with open(path, "w") as f:
            json.dump(fc, f, indent=2)
    with open(path) as f:
        data = json.load(f)
    live = live_from_seed(station)
    return jsonify({
        "station": station,
        "forecast": data,
        "live": live,
        "generated_at": datetime.fromtimestamp(os.path.getmtime(path)).strftime("%Y-%m-%d %H:%M:%S")
    })

@app.route("/api/forecast/all/summary")
def forecast_summary():
    result = []
    for station in STATIONS:
        live = live_from_seed(station)
        path = os.path.join(FORECAST_DIR, f"{station}_forecast.json")
        if live:
            result.append({
                "station":  station,
                "pm25":     live["pm25"],
                "aqi":      live["aqi"],
                "category": live["category"],
                "color":    live["color"],
            })
        elif os.path.exists(path):
            with open(path) as f:
                fc = json.load(f)
            first = fc[0]
            result.append({
                "station":  station,
                "pm25":     first["pm25"],
                "aqi":      first["aqi"],
                "category": first["category"],
                "color":    first["color"],
            })
    return jsonify(result)

@app.route("/api/map-nodes")
def map_nodes():
    # Serves the exact same data as WAQI but sourced securely from Google API backend.
    result = []
    
    # 1. FORECAST STATIONS — prefer live seed PM2.5, fall back to forecast[0]
    for station, coords in STATIONS.items():
        fc_path = os.path.join(FORECAST_DIR, f"{station}_forecast.json")
        live = live_from_seed(station)

        if live is not None:
            result.append({
                "name": station,
                "lat": coords["lat"],
                "lng": coords["lon"],
                "aqi": live["aqi"],
                "category": live["category"],
                "color": live["color"],
                "timestamp": live["timestamp"],
            })
        elif os.path.exists(fc_path):
            with open(fc_path) as f:
                fc = json.load(f)
            first = fc[0]
            result.append({
                "name": station,
                "lat": coords["lat"],
                "lng": coords["lon"],
                "aqi": first["aqi"],
                "category": first["category"],
                "color": first["color"],
                "timestamp": first["timestamp"]
            })
            
    # 2. MAP ONLY STATIONS (Live fetch from Google, short cache)
    now = datetime.now()
    for station, coords in MAP_ONLY_STATIONS.items():
        cached = MAP_ONLY_CACHE.get(station)
        # Refresh if not cached or > 50 mins old
        if not cached or (now - cached["last_fetched"]).total_seconds() > 50 * 60:
            if GOOGLE_API_KEY:
                url = "https://airquality.googleapis.com/v1/currentConditions:lookup"
                payload = {
                    "location": {"latitude": coords["lat"], "longitude": coords["lon"]},
                    "extraComputations": ["POLLUTANT_CONCENTRATION"],
                    "languageCode": "en"
                }
                try:
                    res = requests.post(url, json=payload, params={"key": GOOGLE_API_KEY}, timeout=10)
                    if res.status_code == 200:
                        data = res.json()
                        pm25 = None
                        for p in data.get("pollutants", []):
                            if p.get("code") == "pm25":
                                pm25 = float(p.get("concentration", {}).get("value"))
                        
                        if pm25 is not None:
                            aqi_val = pm25_to_aqi(pm25)
                            cat, col = aqi_category(aqi_val)
                            
                            MAP_ONLY_CACHE[station] = {
                                "name": station,
                                "lat": coords["lat"],
                                "lng": coords["lon"],
                                "aqi": aqi_val,
                                "category": cat,
                                "color": col,
                                "timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
                                "last_fetched": now
                            }
                except Exception as e:
                    print(f"Failed to fetch {station} map data: {e}")
                    
        cached_item = MAP_ONLY_CACHE.get(station)
        if cached_item:
            # Create a copy to avoid mutating cache and remove datetime object before jsonify
            item_to_return = dict(cached_item)
            item_to_return.pop("last_fetched", None)
            result.append(item_to_return)
        else:
            # Add fallback so the station shows up even if API fails or key is missing
            result.append({
                "name": station,
                "lat": coords["lat"],
                "lng": coords["lon"],
                "aqi": 0,
                "category": "No Data",
                "color": "#9ca3af",
                "timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
            })

    return jsonify(result)

@app.route("/api/status")
def status():
    info = {}
    for s in STATIONS:
        path = os.path.join(FORECAST_DIR, f"{s}_forecast.json")
        last_call = LAST_GOOGLE_CALL.get(s)
        info[s] = {
            "forecast_ready":   os.path.exists(path),
            "last_forecast":    datetime.fromtimestamp(os.path.getmtime(path)).strftime("%Y-%m-%d %H:%M:%S") if os.path.exists(path) else None,
            "last_seed_update": last_call.strftime("%Y-%m-%d %H:%M:%S") if last_call else "never",
            "next_seed_update": (last_call + timedelta(minutes=50)).strftime("%H:%M") if last_call else "now",
        }
    return jsonify({
        "status": "running",
        "google_api": "configured" if GOOGLE_API_KEY else "NOT SET",
        "stations": info,
        "refresh_interval": f"{UPDATE_INTERVAL_MINUTES} min",
    })

@app.route("/api/refresh", methods=["POST"])
def manual_refresh():
    refresh_all_forecasts()
    return jsonify({"status": "ok", "refreshed_at": datetime.now().strftime("%H:%M:%S")})


# RO SUBSCRIPTION API ROUTES

@app.route("/api/subscribe", methods=["POST"])
def subscribe():
    body = request.get_json(force=True, silent=True) or {}
    email   = body.get("email", "").strip()
    station = body.get("station", "").strip()

    if not email or not station:
        return jsonify({"success": False, "message": "Email and station are required."}), 400

    success, message = add_subscriber(email, station)
    status_code = 200 if success else 409
    return jsonify({"success": success, "message": message}), status_code


@app.route("/api/subscribe/status")
def subscribe_status():
    email   = request.args.get("email", "").strip()
    station = request.args.get("station", "").strip()

    if not email:
        return jsonify({"subscribed": False, "subscriptions": []})

    if station:
        sub = get_subscriber_status(email, station)
        return jsonify({
            "subscribed": sub is not None,
            "subscription": sub,
        })
    else:
        subs = get_subscriptions_for_email(email)
        return jsonify({
            "subscribed": len(subs) > 0,
            "subscriptions": subs,
        })


@app.route("/api/unsubscribe", methods=["POST", "GET"])
def unsubscribe():
    if request.method == "GET":
        email   = request.args.get("email", "").strip()
        station = request.args.get("station", "").strip()
    else:
        body = request.get_json(force=True, silent=True) or {}
        email   = body.get("email", "").strip()
        station = body.get("station", "").strip()

    if not email or not station:
        return jsonify({"success": False, "message": "Email and station are required."}), 400

    success, message = remove_subscriber(email, station)

    # For GET requests 
    if request.method == "GET":
        if success:
            return f'''<html><body style="font-family:Arial;text-align:center;padding:60px;">
                <h2>Unsubscribed</h2>
                <p>You have been unsubscribed from <strong>{station}</strong> AQI alerts.</p>
                <a href="/" style="color:#1e40af;">← Back to AirKTM</a>
            </body></html>'''
        else:
            return f'''<html><body style="font-family:Arial;text-align:center;padding:60px;">
                <h2>Not Found</h2>
                <p>No active subscription found for this email and station.</p>
                <a href="/" style="color:#1e40af;">← Back to AirKTM</a>
            </body></html>'''

    status_code = 200 if success else 404
    return jsonify({"success": success, "message": message}), status_code

# START 
initialize_seeds()
refresh_all_forecasts()

#scheduler = BackgroundScheduler()
#scheduler.add_job(
#    refresh_all_forecasts,
#    trigger="interval",
#    minutes=UPDATE_INTERVAL_MINUTES,
#    id="forecast_refresh"
#)
#scheduler.start()

if __name__ == "__main__":
    print(f"\n  http://localhost:5050")
    print(f"  Google API: {'Configured' if GOOGLE_API_KEY else 'Not set'}")
    print(f"  Auto-refresh: every {UPDATE_INTERVAL_MINUTES} min\n")
    try:
        port = int(os.environ.get("FLASK_PORT", 5050))
        app.run(debug=False, host="0.0.0.0", port=port, use_reloader=False)
    except (KeyboardInterrupt, SystemExit):
        print("\n  Server stopped.")
