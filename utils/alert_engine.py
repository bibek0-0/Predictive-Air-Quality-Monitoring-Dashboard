"""
AirKTM Pro — Alert Engine

"""

import json, os, re, threading
from datetime import datetime, timedelta

DATA_DIR        = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
SUBSCRIBERS_FILE = os.path.join(DATA_DIR, "subscribers.json")
COOLDOWN_HOURS  = 2
VALID_STATIONS  = ["Ratnapark", "Pulchowk", "Bhaisipati", "Bhaktapur", "Shankapark"]
EMAIL_REGEX     = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")

_file_lock = threading.Lock()

os.makedirs(DATA_DIR, exist_ok=True)


# AQI Category 

def aqi_category(aqi):
    if aqi <= 50:  return "Good",                           "#00e400"
    if aqi <= 100: return "Moderate",                       "#ffff00"
    if aqi <= 150: return "Unhealthy for Sensitive Groups", "#ff7e00"
    if aqi <= 200: return "Unhealthy",                      "#ff0000"
    if aqi <= 300: return "Very Unhealthy",                 "#8f3f97"
    return "Hazardous",                                     "#7e0023"


# Subscriber File I/O 

def load_subscribers():
    with _file_lock:
        if not os.path.exists(SUBSCRIBERS_FILE):
            return {"subscribers": []}
        try:
            with open(SUBSCRIBERS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {"subscribers": []}


def save_subscribers(data):
    with _file_lock:
        tmp_path = SUBSCRIBERS_FILE + ".tmp"
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        # Atomic replace
        if os.path.exists(SUBSCRIBERS_FILE):
            os.replace(tmp_path, SUBSCRIBERS_FILE)
        else:
            os.rename(tmp_path, SUBSCRIBERS_FILE)


# Subscriber CRUD 

def add_subscriber(email, station):
    """Add a new subscriber. Returns (success: bool, message: str)."""
    email = email.strip().lower()

    if not EMAIL_REGEX.match(email):
        return False, "Invalid email format."

    if station not in VALID_STATIONS:
        return False, f"Invalid station. Must be one of: {', '.join(VALID_STATIONS)}"

    data = load_subscribers()

    # Check for duplicate
    for sub in data["subscribers"]:
        if sub["email"] == email and sub["station"] == station:
            return False, f"Already subscribed to {station} alerts."

    data["subscribers"].append({
        "email":                 email,
        "station":               station,
        "subscribed_at":         datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "last_alerted_aqi":      None,
        "last_alerted_category": None,
        "last_alert_sent_at":    None,
    })
    save_subscribers(data)
    return True, f"Successfully subscribed to {station} alerts!"


def remove_subscriber(email, station):
    """Remove a subscriber. Returns (success, message)."""
    email = email.strip().lower()
    data = load_subscribers()

    original_count = len(data["subscribers"])
    data["subscribers"] = [
        s for s in data["subscribers"]
        if not (s["email"] == email and s["station"] == station)
    ]

    if len(data["subscribers"]) == original_count:
        return False, "Subscription not found."

    save_subscribers(data)
    return True, f"Unsubscribed from {station} alerts."


def get_subscriber_status(email, station):
    """Check if a subscriber exists. Returns dict or None."""
    email = email.strip().lower()
    data = load_subscribers()

    for sub in data["subscribers"]:
        if sub["email"] == email and sub["station"] == station:
            return sub
    return None


def get_subscriptions_for_email(email):
    """Get all station subscriptions for a given email."""
    email = email.strip().lower()
    data = load_subscribers()
    return [s for s in data["subscribers"] if s["email"] == email]


# Alert Logic

def _is_in_cooldown(subscriber):
    """Check if the subscriber is within the 2-hour cooldown window."""
    last_sent = subscriber.get("last_alert_sent_at")
    if not last_sent:
        return False
    try:
        last_time = datetime.strptime(last_sent, "%Y-%m-%dT%H:%M:%S")
        return (datetime.now() - last_time) < timedelta(hours=COOLDOWN_HOURS)
    except (ValueError, TypeError):
        return False


def _category_changed(old_category, new_category):
    """Check if AQI has crossed a category boundary."""
    if old_category is None:
        return True  # First alert ever
    return old_category != new_category


def check_and_send_alerts(station, current_aqi, current_category, current_color, forecast_data=None):
    """
    Main alert function — called after each station forecast refresh.

    1. Load subscribers for this station
    2. Check real-time category change → send email if threshold crossed
    3. Check forecast for upcoming threshold crossing → send forecast email
    4. Update subscriber records
    """
    from utils.email_sender import send_realtime_alert, send_forecast_alert

    data = load_subscribers()
    station_subs = [s for s in data["subscribers"] if s["station"] == station]

    if not station_subs:
        return

    print(f" Checking alerts for {station}: {len(station_subs)} subscriber(s)")

    changed = False

    for sub in station_subs:
        # Cooldown check 
        if _is_in_cooldown(sub):
            print(f"   {sub['email']}: in cooldown, skipping")
            continue

        # CASE A: Real-time category change
        old_cat = sub.get("last_alerted_category")
        if _category_changed(old_cat, current_category):
            # Determine if AQI improved or worsened
            improved = False
            if old_cat is not None:
                cat_order = ["Good", "Moderate", "Unhealthy for Sensitive Groups",
                             "Unhealthy", "Very Unhealthy", "Hazardous"]
                try:
                    old_idx = cat_order.index(old_cat)
                    new_idx = cat_order.index(current_category)
                    improved = new_idx < old_idx
                except ValueError:
                    pass

            print(f" {sub['email']}: category changed {old_cat} → {current_category}")
            success = send_realtime_alert(
                sub["email"], station, current_aqi, current_category, current_color, improved
            )

            if success:
                sub["last_alerted_aqi"]      = current_aqi
                sub["last_alerted_category"] = current_category
                sub["last_alert_sent_at"]    = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
                changed = True
            # Removed 'continue' so forecast alerts can trigger

        # CASE B: Forecast threshold crossing
        if forecast_data:
            # Look ahead 24 hours in forecast for first category crossing
            forecast_24h = [f for f in forecast_data if f.get("hour_ahead", 99) <= 24]

            for fc_point in forecast_24h:
                fc_cat = fc_point.get("category")
                if fc_cat and fc_cat != current_category:
                    fc_aqi   = fc_point.get("aqi", 0)
                    fc_color = fc_point.get("color", "#666")
                    fc_hours = fc_point.get("hour_ahead", 0)

                    print(f" {sub['email']}: forecast {current_category} → {fc_cat} in {fc_hours}h")
                    success = send_forecast_alert(
                        sub["email"], station, fc_aqi, fc_cat, fc_color, fc_hours
                    )

                    if success:
                        sub["last_alert_sent_at"] = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
                        changed = True
                    break  # Only one forecast alert per cycle

    if changed:
        save_subscribers(data)
