# DFW Uber Earnings Maximizer

A local web app that helps an Uber driver in the Dallas–Fort Worth metro (home
base: Allen/Fairview, TX — ZIP 75070) maximize earnings. It connects to the Uber
Driver API, analyzes earnings patterns, infers live metro surge, compares ride
categories, and generates a personalized weekly shift plan.

> **Runs without Uber API access.** The Driver API requires an approved
> limited-access application, which can take time. Until then the app runs in
> **DEMO mode** on realistic seeded DFW data so every panel works. You can also
> enter your own weekly earnings manually as a fallback.

---

## Features (by phase)

1. **Uber Driver API integration** — OAuth 2.0 Authorization Code flow; pulls
   driver profile, payments (net fare / tips / surge / bonuses), and trip history.
2. **Earnings analysis engine** — EpH by time of day, day of week, and category;
   best/worst windows over 30/60/90 days; fare per mile & per minute; surge
   frequency and average multiplier; an income-consistency score; ranked,
   plain-language recommendations.
3. **Metro surge detector** — polls 6 DFW hotspots every 10 minutes using the
   rider-side Rides API price estimates, compares to a baseline to infer surge,
   and shows a live "which zones are surging now" dashboard.
4. **Car-category optimizer** — reads eligible categories from the account,
   filters analysis to them, ranks earnings per category, and flags higher
   tiers as "opportunities."
5. **Shift planner** — ranked weekly shift blocks by expected EpH, airport-run
   windows, a local-event calendar, and a **Drive Now?** green/yellow/red signal.

---

## Tech stack

| Layer       | Choice                                            |
|-------------|---------------------------------------------------|
| Backend     | Node.js + Express                                 |
| Frontend    | React + Vite + Tailwind CSS + Recharts            |
| Auth        | Passport.js (`passport-oauth2`) for Uber OAuth 2.0 |
| Storage     | SQLite via `better-sqlite3` (cached trips/payments/surge) |
| Scheduling  | `node-cron` (10-minute surge polling)             |
| Config      | `dotenv`                                          |

`CLIENT_SECRET` and tokens are stored server-side only (SQLite + `.env`) and are
never sent to the frontend.

---

## Quick start

```bash
# 1. Install backend deps
npm install

# 2. Configure credentials (optional — skip to run in DEMO mode)
cp .env.example .env
#   edit .env and fill in UBER_CLIENT_ID / UBER_CLIENT_SECRET / UBER_SERVER_TOKEN

# 3. Seed realistic demo data (also primes surge readings)
npm run seed

# 4a. DEV mode — two processes:
npm run dev            # backend on http://localhost:4000 (nodemon)
npm run client:dev     # React dev server on http://localhost:5173 (proxies /api)
#   → open http://localhost:5173

# 4b. OR single-process / production mode:
npm run build          # installs client deps + builds React into client/dist
npm start              # Express serves API + the built app on http://localhost:4000
#   → open http://localhost:4000
```

Run the tests for the analysis engine with `npm test`.

---

## Uber developer setup

### 1. Create an Uber developer account & app
1. Sign in at <https://developer.uber.com/dashboard>.
2. **Create a new app.** Note the **Client ID**, **Client Secret**, and
   **Server Token** from the app's **Auth** page.
3. Under **Redirect URIs**, add exactly:
   `http://localhost:4000/auth/uber/callback`
   (must match `UBER_REDIRECT_URI` in your `.env`).

### 2. Apply for Driver API access (required for live data)
The Driver API (`/partners/*`) is **limited access** and must be approved.
1. Read the introduction: <https://developer.uber.com/docs/drivers/tutorials/api/introduction>
2. From your app, request the **Driver** product and the scopes
   `partner.accounts`, `partner.payments`, `partner.trips`.
3. Submit the limited-access application and wait for approval. Until approved,
   the Driver endpoints return **HTTP 403** — the app detects this and falls
   back to cached/demo data automatically (no crash).

### 3. Get a Server Token for the rider-side surge detector
The surge detector uses the **Rides API** (`/v1.2/products`,
`/v1.2/estimates/price`), which authenticates with a **Server Token** (not the
driver OAuth token). Copy the **Server Token** from your app's Auth page into
`UBER_SERVER_TOKEN`. If you leave it blank, the surge panel runs on a
time-of-day demand model instead of live estimates.

### 4. Connect
Start the app, then click **Connect Uber** in the header (or visit
`/auth/uber`). After authorizing, you'll be redirected back and the app stores
your tokens server-side and auto-refreshes them.

---

## Environment variables

See [`.env.example`](./.env.example). Summary:

| Variable             | Required | Purpose                                              |
|----------------------|----------|------------------------------------------------------|
| `PORT`               | no       | Backend port (default 4000)                          |
| `SESSION_SECRET`     | prod     | Express session signing secret                       |
| `UBER_CLIENT_ID`     | live     | OAuth client ID (Driver API)                         |
| `UBER_CLIENT_SECRET` | live     | OAuth client secret — server-side only               |
| `UBER_REDIRECT_URI`  | live     | OAuth callback; must match the dashboard exactly     |
| `UBER_SERVER_TOKEN`  | surge    | Rider-side Rides API token for the surge detector    |
| `SURGE_CRON`         | no       | Surge poll schedule (default `*/10 * * * *`)         |
| `DEMO_MODE`          | no       | Force demo mode even with credentials present        |

Leaving the `UBER_*` values blank automatically enables **DEMO mode**.

---

## API surface (backend)

```
GET  /api/health
GET  /auth/uber                 # start OAuth (browser redirect)
GET  /auth/uber/callback        # OAuth callback
POST /auth/logout

GET  /api/driver/status         # connection + mode
POST /api/driver/sync           # pull/refresh from Uber (degrades to demo)
GET  /api/driver/profile
GET  /api/driver/trips
GET  /api/driver/payments

GET  /api/analysis?window=30|60|90&eligibleOnly=true
GET  /api/categories?window=30
GET  /api/surge                 # live snapshot per zone
GET  /api/surge/history/:zoneId
POST /api/surge/poll            # force an immediate poll
GET  /api/shifts/plan?window=60
GET  /api/shifts/drive-now      # green/yellow/red signal

GET/POST/DELETE /api/manual/entries   # manual weekly earnings (fallback)
GET/POST/DELETE /api/manual/events    # local event calendar
```

---

## Graceful degradation

- **No Uber credentials** → DEMO mode with seeded 90-day DFW dataset.
- **Credentials set but access pending (403)** → falls back to cached/demo data
  with a clear message; surge detector and shift planner keep working.
- **No rider-side server token** → surge detector infers from a demand model.
- **Manual entry mode** → weekly earnings you type in are folded into the
  analysis and shift planner just like real trips.

---

## Project structure

```
server/
  index.js            # Express app + static client hosting
  config.js           # dotenv-backed config
  db.js               # better-sqlite3 schema
  constants.js        # DFW zones, categories, time buckets
  tokenStore.js       # OAuth token persistence
  auth/uber.js        # Passport OAuth2 strategy + routes
  services/
    uberClient.js     # Driver API client + token refresh
    ridesClient.js    # rider-side Rides API client
    surgeDetector.js  # zone polling + baseline/surge inference
    dataStore.js      # real→cache→demo data layer
    shiftPlanner.js   # weekly plan + Drive Now signal
    mockData.js       # realistic DFW demo data generator
  analysis/
    earnings.js       # the analysis engine (pure functions)
    earnings.test.js  # unit tests (node --test)
  routes/             # driver, analysis, surge, categories, shifts, manual
  cron.js             # node-cron surge scheduler
  seed.js             # one-shot demo seeder
client/               # React + Vite + Tailwind + Recharts dashboard
.env.example
```

---

## Notes & disclaimers

- Uber does not expose a public real-time surge API; the surge detector is an
  inference workaround built on rider-side price estimates vs. a baseline.
- Respect Uber's API terms and rate limits when polling.
- This app stores data locally in `data/earnings.db` (git-ignored).

## License

MIT.
