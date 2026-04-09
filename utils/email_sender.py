"""
AirKTM Pro — Email Sender Module

"""

import smtplib, os, traceback
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta

# AQI Category Helpers

HEALTH_MESSAGES = {
    "Good":                           "Air quality is satisfactory. Enjoy outdoor activities!",
    "Moderate":                       "Air quality is acceptable. Sensitive individuals should limit prolonged outdoor exertion.",
    "Unhealthy for Sensitive Groups": "Members of sensitive groups may experience health effects. Reduce prolonged outdoor exertion.",
    "Unhealthy":                      "Everyone may begin to experience health effects. Avoid prolonged outdoor exertion.",
    "Very Unhealthy":                 "Health alert: Everyone may experience serious health effects. Avoid all outdoor activity.",
    "Hazardous":                      "Health warning: Emergency conditions. Everyone should avoid all outdoor exertion. Stay indoors with air purification.",
}

IMPROVEMENT_ACTIVITIES = {
    "Good":                           "enjoy outdoor activities",
    "Moderate":                       "go for a walk with caution",
    "Unhealthy for Sensitive Groups": "take short outdoor breaks",
}

FLASK_PORT = int(os.environ.get("FLASK_PORT", 5050))

# Email Template Builder 

def _build_realtime_email(station, aqi, category, color, improved=False):
    health_msg = HEALTH_MESSAGES.get(category, "Stay cautious and monitor AQI updates.")
    now_str = datetime.now().strftime("%b %d, %Y at %I:%M %p")

    improvement_html = ""
    if improved:
        activity = IMPROVEMENT_ACTIVITIES.get(category, "plan outdoor activities")
        improvement_html = f'''
        <tr>
            <td style="padding: 0 24px 16px;">
                <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 14px 16px;">
                    <p style="margin: 0; font-size: 14px; color: #065f46; font-weight: 600;">
                        Good news — air quality has improved! It is now safe to {activity}.
                    </p>
                </div>
            </td>
        </tr>'''

    return f'''<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f1f5f9;">
<tr><td align="center" style="padding:30px 15px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">

    <!-- Header -->
    <tr>
        <td style="background:{color};padding:28px 24px;text-align:center;">
            <h1 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#fff;letter-spacing:-.3px;">AirKTM Pro Alert</h1>
            <p style="margin:0;font-size:14px;color:rgba(255,255,255,.85);font-weight:500;">📍 {station} • {now_str}</p>
        </td>
    </tr>

    <!-- AQI Score -->
    <tr>
        <td style="padding:24px;text-align:center;">
            <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Current AQI</p>
            <div style="display:inline-block;background:{color};color:#fff;font-size:42px;font-weight:800;padding:12px 32px;border-radius:12px;line-height:1;">{aqi}</div>
            <p style="margin:10px 0 0;font-size:16px;color:#334155;font-weight:700;">{category}</p>
        </td>
    </tr>

    <!-- Health Message -->
    <tr>
        <td style="padding:0 24px 16px;">
            <div style="background:#fffbeb;border:1px solid #fef3c7;border-radius:10px;padding:14px 16px;">
                <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#92400e;">🏥 Health Advisory</p>
                <p style="margin:0;font-size:14px;color:#78350f;line-height:1.6;">{health_msg}</p>
            </div>
        </td>
    </tr>

    {improvement_html}

    <!-- Footer -->
    <tr>
        <td style="padding:20px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;">Sent by <strong style="color:#1e40af;">AirKTM Pro</strong></p>
            <a href="http://localhost:{FLASK_PORT}/api/unsubscribe?email={{{{email}}}}&station={station}" style="font-size:12px;color:#94a3b8;text-decoration:underline;">Unsubscribe from {station} alerts</a>
        </td>
    </tr>

</table>
</td></tr>
</table>
</body>
</html>'''


def _build_forecast_email(station, forecast_aqi, forecast_category, forecast_color, hours_ahead):
    health_msg = HEALTH_MESSAGES.get(forecast_category, "Stay cautious and monitor AQI updates.")
    now_str = datetime.now().strftime("%b %d, %Y at %I:%M %p")
    expected_time = (datetime.now() + timedelta(hours=hours_ahead)).strftime("%I:%M %p")

    return f'''<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f1f5f9;">
<tr><td align="center" style="padding:30px 15px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">

    <!-- Header -->
    <tr>
        <td style="background:linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);padding:28px 24px;text-align:center;">
            <h1 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#fff;">Forecast Alert</h1>
            <p style="margin:0;font-size:14px;color:rgba(255,255,255,.85);font-weight:500;">{station} • Generated {now_str}</p>
        </td>
    </tr>

    <!-- AI Forecast Notice -->
    <tr>
        <td style="padding:20px 24px 8px;text-align:center;">
            <p style="margin:0;font-size:13px;color:#64748b;font-style:italic;">Based on our XGBoost AI forecast model...</p>
        </td>
    </tr>

    <!-- Forecasted AQI -->
    <tr>
        <td style="padding:16px 24px;text-align:center;">
            <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Expected AQI in ~{hours_ahead}h ({expected_time})</p>
            <div style="display:inline-block;background:{forecast_color};color:#fff;font-size:42px;font-weight:800;padding:12px 32px;border-radius:12px;line-height:1;">{forecast_aqi}</div>
            <p style="margin:10px 0 0;font-size:16px;color:#334155;font-weight:700;">{forecast_category}</p>
        </td>
    </tr>

    <!-- Health Advisory -->
    <tr>
        <td style="padding:0 24px 16px;">
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 16px;">
                <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#1e40af;">🔮 Plan Ahead</p>
                <p style="margin:0;font-size:14px;color:#1e3a5f;line-height:1.6;">{health_msg}</p>
            </div>
        </td>
    </tr>

    <!-- Footer -->
    <tr>
        <td style="padding:20px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;">Sent by <strong style="color:#1e40af;">AirKTM Pro</strong></p>
            <a href="http://localhost:{FLASK_PORT}/api/unsubscribe?email={{{{email}}}}&station={station}" style="font-size:12px;color:#94a3b8;text-decoration:underline;">Unsubscribe from {station} alerts</a>
        </td>
    </tr>

</table>
</td></tr>
</table>
</body>
</html>'''


# SMTP Sende

def _get_smtp_config():
    user = os.environ.get("SMTP_USER", "")
    pwd  = os.environ.get("SMTP_PASS", "")
    host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    port = int(os.environ.get("SMTP_PORT", 587))
    return user, pwd, host, port


def send_realtime_alert(email, station, aqi, category, color, improved=False):
    """Send a real-time AQI threshold crossing alert email."""
    user, pwd, host, port = _get_smtp_config()
    if not user or not pwd:
        print(f"  SMTP not configured — skipping email to {email}")
        return False

    emoji = "⚠️" if not improved else "✅"
    subject = f"{emoji} AQI Alert: {station} air quality is now {category}"
    html = _build_realtime_email(station, aqi, category, color, improved)
    # Replace the email placeholder in unsubscribe link
    html = html.replace("{{email}}", email)

    return _send_email(user, pwd, host, port, email, subject, html)


def send_forecast_alert(email, station, forecast_aqi, forecast_category, forecast_color, hours_ahead):
    """Send a forecast-based AQI alert email."""
    user, pwd, host, port = _get_smtp_config()
    if not user or not pwd:
        print(f" SMTP not configured — skipping email to {email}")
        return False

    subject = f" Forecast Alert: {station} AQI expected to reach {forecast_category} in {hours_ahead}h"
    html = _build_forecast_email(station, forecast_aqi, forecast_category, forecast_color, hours_ahead)
    html = html.replace("{{email}}", email)

    return _send_email(user, pwd, host, port, email, subject, html)


def _send_email(user, pwd, host, port, to_email, subject, html_body):
    """Send an email via SMTP. Returns True on success, False on failure."""
    try:
        msg = MIMEMultipart("alternative")
        msg["From"]    = f"AirKTM Pro <{user}>"
        msg["To"]      = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        with smtplib.SMTP(host, port) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(user, pwd)
            server.sendmail(user, to_email, msg.as_string())

        print(f" Email sent to {to_email}: {subject[:60]}...")
        return True

    except Exception as e:
        print(f" Email to {to_email} failed: {e}")
        traceback.print_exc()
        return False
