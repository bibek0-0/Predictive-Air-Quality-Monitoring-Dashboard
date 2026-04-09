# AirKTM — Predictive Air Quality Monitoring Dashboard
Note: Run my project in brave broswer 
## 1. Introduction

**AirKTM** is a web dashboard focused on air quality in the Kathmandu Valley. It combines **live and historical air-quality data** with **machine-learning forecasts** (XGBoost) for several fixed stations, and adds **user accounts**, **alerts** and **Pro** features. The goal is to make short-term prediction and optional notifications accessible in one place.

The project name reflects **air quality** and **Kathmandu (KTM)** monitoring.

## 2. Features

- **Home** — Overview and entry point with navigation to all sections.
- **Realtime** — Near–real-time air quality context (including integration with external feeds where configured).
- **Forecast** — **48-hour PM2.5-style forecasts** per station, driven by trained **XGBoost** models and station-specific data pipelines.
- **Alerts** — Email-oriented **subscribe / unsubscribe** flows tied to stations; **Pro** gating and related UX (e.g. Khalti payment hooks where enabled).
- **More info** — Educational / contextual content about air quality.
- **Authentication** — Register, login, **JWT**-based API access, optional **Google OAuth**, sessions for Passport.
- **Admin** — Admin-only views for stats, users, and subscribers (when configured with admin credentials).
- **Theming / UI** — Responsive layout, shared navigation, Leaflet for maps (where used), charts on forecast views.

Stations covered in the forecast pipeline include **Ratnapark**, **Pulchowk**, **Bhaisipati**, **Bhaktapur**, and **Shankapark**.


## 3. Frontend and backend

### Frontend

- **Stack:** Static **HTML** pages under `pages/` and `index.html`, **CSS** in `css/`, **vanilla JavaScript** in `js/` (e.g. `api.js`, `auth.js`, `forecast.js`, `alerts.js`, `realtime.js`, `homepage.js`).
- **Libraries (CDN):** e.g. **Leaflet**, **Google Fonts**; charting where referenced on forecast/admin pages.
- **How it is served:** The **Express** app serves the project root as static files and handles **client-side routing** to `index.html` for `/`.

The UI talks to:

- **`http://<host>:5000`** — same origin as the site for **`/api/auth/...`** (Node).
- **`http://<host>:5050`** — Flask for **forecast JSON** and **subscribe / unsubscribe** APIs used by the alerts flow.

### Backend

| Layer | Technology | Role |
|--------|------------|------|
| **Web + auth API** | **Node.js**, **Express**, **Mongoose**, **MongoDB** | Serves the frontend, **REST auth** (`/api/auth/...`), JWT, sessions, **Passport** + **Google OAuth** (optional). |
| **Forecast + alerts API** | **Python**, **Flask**, **Flask-CORS** | Loads **joblib** XGBoost models from `models/`, uses **Google Air Quality API** when `GOOGLE_API_KEY` is set, exposes `/api/forecast/...`, `/api/subscribe`, `/api/unsubscribe`, refresh hooks. |
| **Data / ML** | **pandas**, **numpy**, **scikit-learn**, **xgboost**, **joblib** | Feature engineering, inference, forecast files under `forecasts/` (or volumes in Docker). |
| **Alert pipeline** | Python modules under `utils/` | Subscriber storage (`data/subscribers.json`), alert checks, optional email sending (`utils/email_sender.py`) when SMTP/env is configured. |


## 4. How to run

### Prerequisites

- **Docker path:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose).
- **Local path:** **Node.js 18+**, **Python 3.11+**, **MongoDB** running locally (or a cloud URI).

Create a **`.env`** file in the project root (do **not** commit it). Typical variables:

| Variable | Purpose |
|----------|---------|
| `MONGO_URI` | MongoDB connection string (required for local Node; Compose sets this for Docker). |
| `JWT_SECRET` | Signs auth tokens. |
| `SESSION_SECRET` | Express session secret. |
| `GOOGLE_API_KEY` | Google Air Quality API (forecasts / seeding). |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth (optional). |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Optional admin bootstrap (see `server/routes/auth.js`). |


### Option A — Docker Compose (recommended)

From the repository root:

```bash
docker compose up --build
```

Then open **http://localhost:5000** in your browser.

- **Port 5000** — Express (UI + `/api/auth/...`).
- **Port 5050** — Flask (forecasts + subscribe/unsubscribe APIs).

Stop with `Ctrl+C`, then:

```bash
docker compose down
```

Compose reads `.env` for optional secrets (e.g. `GOOGLE_API_KEY`, `JWT_SECRET`). If `.env` is missing, demo defaults in `docker-compose.yml` apply for JWT/session (fine for local demos only).


### Option B — Local development (no Docker)

You need **two terminals** plus **MongoDB**.

**Terminal 1 — MongoDB**  
Ensure MongoDB is running (default `mongodb://127.0.0.1:27017`).

**Terminal 2 — Node (port 5000)**

```bash
npm install
npm start
```

Set in `.env` at least:

```env
MONGO_URI=mongodb://127.0.0.1:27017/airktm
JWT_SECRET=your-long-random-secret
SESSION_SECRET=your-session-secret
```

## License / academic use

Use and attribution policies depend on your course or organization; add a `LICENSE` file if you want GitHub to show explicit terms.
