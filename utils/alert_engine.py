"""
AirKTM Pro — Alert Engine

"""

import os
import re
from datetime import datetime, timedelta

from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError

COOLDOWN_HOURS = 2
VALID_STATIONS = ["Ratnapark", "Pulchowk", "Bhaisipati", "Bhaktapur", "Shankapark"]
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")

SUBSCRIBERS_COLLECTION = "subscribers"

_mongo_client = None
_indexes_ensured = False


def _get_collection():
    global _mongo_client, _indexes_ensured
    uri = (os.environ.get("MONGO_URI") or "").strip()
    if not uri:
        return None
    if _mongo_client is None:
        _mongo_client = MongoClient(uri)
    db = _mongo_client.get_default_database()
    if db is None:
        db_name = os.environ.get("MONGO_DB_NAME", "test")
        db = _mongo_client[db_name]
    coll = db[SUBSCRIBERS_COLLECTION]
    if not _indexes_ensured:
        try:
            coll.create_index([("email", 1), ("station", 1)], unique=True)
        except Exception:
            pass
        _indexes_ensured = True
    return coll


def _serialize_doc(doc):
    if doc is None:
        return None
    out = dict(doc)
    if "_id" in out:
        out["_id"] = str(out["_id"])
    return out


# AQI Category

def aqi_category(aqi):
    if aqi <= 50:
        return "Good", "#00e400"
    if aqi <= 100:
        return "Moderate", "#ffff00"
    if aqi <= 150:
        return "Unhealthy for Sensitive Groups", "#ff7e00"
    if aqi <= 200:
        return "Unhealthy", "#ff0000"
    if aqi <= 300:
        return "Very Unhealthy", "#8f3f97"
    return "Hazardous", "#7e0023"


# Subscriber CRUD (MongoDB)

def add_subscriber(email, station):
    """Add a new subscriber. Returns (success: bool, message: str)."""
    email = email.strip().lower()

    if not EMAIL_REGEX.match(email):
        return False, "Invalid email format."

    if station not in VALID_STATIONS:
        return False, f"Invalid station. Must be one of: {', '.join(VALID_STATIONS)}"

    coll = _get_collection()
    if coll is None:
        return False, "Alert database is not configured (set MONGO_URI)."

    doc = {
        "email": email,
        "station": station,
        "subscribed_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "last_alerted_aqi": None,
        "last_alerted_category": None,
        "last_alert_sent_at": None,
    }
    try:
        coll.insert_one(doc)
    except DuplicateKeyError:
        return False, f"Already subscribed to {station} alerts."
    return True, f"Successfully subscribed to {station} alerts!"


def remove_subscriber(email, station):
    """Remove a subscriber. Returns (success, message)."""
    email = email.strip().lower()
    coll = _get_collection()
    if coll is None:
        return False, "Alert database is not configured (set MONGO_URI)."

    result = coll.delete_one({"email": email, "station": station})
    if result.deleted_count == 0:
        return False, "Subscription not found."
    return True, f"Unsubscribed from {station} alerts."


def get_subscriber_status(email, station):
    """Check if a subscriber exists. Returns dict or None (JSON-safe)."""
    email = email.strip().lower()
    coll = _get_collection()
    if coll is None:
        return None

    doc = coll.find_one({"email": email, "station": station})
    return _serialize_doc(doc)


def get_subscriptions_for_email(email):
    """Get all station subscriptions for a given email."""
    email = email.strip().lower()
    coll = _get_collection()
    if coll is None:
        return []

    return [_serialize_doc(d) for d in coll.find({"email": email})]


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
        return True
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

    coll = _get_collection()
    if coll is None:
        return

    station_subs = list(coll.find({"station": station}))
    if not station_subs:
        return

    print(f" Checking alerts for {station}: {len(station_subs)} subscriber(s)")

    changed_ids = set()

    for sub in station_subs:
        if _is_in_cooldown(sub):
            print(f"   {sub['email']}: in cooldown, skipping")
            continue

        old_cat = sub.get("last_alerted_category")
        if _category_changed(old_cat, current_category):
            improved = False
            if old_cat is not None:
                cat_order = [
                    "Good",
                    "Moderate",
                    "Unhealthy for Sensitive Groups",
                    "Unhealthy",
                    "Very Unhealthy",
                    "Hazardous",
                ]
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
                sub["last_alerted_aqi"] = current_aqi
                sub["last_alerted_category"] = current_category
                sub["last_alert_sent_at"] = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
                changed_ids.add(sub["_id"])

        if forecast_data:
            forecast_24h = [f for f in forecast_data if f.get("hour_ahead", 99) <= 24]

            for fc_point in forecast_24h:
                fc_cat = fc_point.get("category")
                if fc_cat and fc_cat != current_category:
                    fc_aqi = fc_point.get("aqi", 0)
                    fc_color = fc_point.get("color", "#666")
                    fc_hours = fc_point.get("hour_ahead", 0)

                    print(f" {sub['email']}: forecast {current_category} → {fc_cat} in {fc_hours}h")
                    success = send_forecast_alert(
                        sub["email"], station, fc_aqi, fc_cat, fc_color, fc_hours
                    )

                    if success:
                        sub["last_alert_sent_at"] = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
                        changed_ids.add(sub["_id"])
                    break

    if changed_ids:
        for sub in station_subs:
            if sub["_id"] in changed_ids:
                coll.update_one(
                    {"_id": sub["_id"]},
                    {
                        "$set": {
                            "last_alerted_aqi": sub.get("last_alerted_aqi"),
                            "last_alerted_category": sub.get("last_alerted_category"),
                            "last_alert_sent_at": sub.get("last_alert_sent_at"),
                        }
                    },
                )
