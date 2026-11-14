# AstraHealth

**A calm flight deck for the human body.** A light, low-density health monitor for astronauts on long-duration missions: collect health indicators, explain what they mean in spaceflight, score crew readiness, and recommend the next action.

> Status: **Phase 11 complete — demo ready.** The app builds from a clean database, `make demo-verify` checks the scripted state, and the three-minute script runs end to end. See [`docs/PLAN.md`](docs/PLAN.md) for the full build plan.

> **Windows and never used a terminal?** Start with [`START_HERE_WINDOWS.md`](START_HERE_WINDOWS.md). It walks you through installing Docker Desktop, Node.js, and uv, then launches everything with a double-click.

![AstraHealth Flight Deck](docs/screenshots/shell.png)

| Systems Check | Systems Report |
|---|---|
| ![Systems Check](docs/screenshots/checkin.png) | ![Systems Report](docs/screenshots/report.png) |

| Telemetry | Metric detail |
|---|---|
| ![Telemetry](docs/screenshots/telemetry.png) | ![Metric detail](docs/screenshots/metric.png) |

| Domain summary | Reference range |
|---|---|
| ![Domain summary](docs/screenshots/domain.png) | ![Reference range](docs/screenshots/metric-reference.png) |

| Crew | Mission Log |
|---|---|
| ![Crew](docs/screenshots/crew.png) | ![Mission Log](docs/screenshots/log.png) |

| Quizzes | Quiz result |
|---|---|
| ![Quizzes](docs/screenshots/quizzes.png) | ![Quiz result](docs/screenshots/quiz-result.png) |

| Training plan | Countermeasure link |
|---|---|
| ![Training plan](docs/screenshots/training.png) | ![Countermeasure link](docs/screenshots/training-countermeasure.png) |

| Library | Flight Surgeon |
|---|---|
| ![Library](docs/screenshots/library.png) | ![Flight Surgeon](docs/screenshots/assistant.png) |

| Offline queue | Offline shell |
|---|---|
| ![Offline queue](docs/screenshots/offline-queue.png) | ![Offline shell](docs/screenshots/offline-shell.png) |

---

## What it does

- **Flight Deck** — a 70+ region anatomical body map with front/back views, readiness ring, six domain rows, an exception list, and a mission tape.
- **Systems Check** — a five-step wizard for vitals, sleep, mood, symptoms, training, and nutrition. Drafts survive a reload, skipped steps are explicit, and every submission ends in an instant Systems Report.
- **Telemetry** — 7, 30, or 90-day trends for every metric, with a personal baseline band, a spaceflight reference range, event overlays, domain summaries, and CSV export.
- **Explainable readiness** — deterministic z-score engine plus seven hard rules. Every score shows its contributing factors.
- **Training and Duty Roster** — a weekly plan generated from active alerts and the mission profile, countermeasure links from every alert, session logging with RPE, adherence and streaks, a daily roster, and a next-due indicator in the nav and top bar.
- **Motivation** — a credit ledger, Mission Rank, commendations, a one-time allowance catalog, streaks with a single grace day, and a Mission Log that records the whole loop. Never tied to health values.
- **Crew** — consent-based status sharing, a privacy-filtered readiness roster, and a consistency board with no health values. Direct crew communication stays outside the health tool.
- **Quizzes** — Know Yourself and the consent-gated Know Your Crew, with scoring, source explanations, and a first-completion credit award.
- **Knowledge and AI** — nine HRP-sourced articles with domain filters, inline guidance from metrics, alerts, check-in steps, and training items, and a Flight Surgeon drawer that cites its sources, refuses diagnosis, and escalates red flags. Works without an LLM.
- **Camera pulse** — optional 25-second rPPG measurement with MediaPipe FaceLandmarker, signal-quality gating, and a manual heart-rate field that is always available.
- **Offline-first PWA** — a Workbox service worker precaches the shell and route chunks. Check-ins submitted without a link are written to IndexedDB, shown in an explicit offline banner with the next comms window, and synced exactly once on reconnect using the check-in idempotency key. Failed items can be reviewed and discarded.
- **Hardened delivery** — route-level code splitting, cached auth profile for offline reloads, retryable error panels on every data view, and auth rate limits. Lighthouse on the Flight Deck: 100 performance / 100 accessibility on desktop and 99–100 performance / 100 accessibility on the mobile preset across verification runs.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS v4 |
| Animation | motion |
| Data | TanStack Query, typed client generated from OpenAPI |
| Backend | FastAPI, Pydantic v2, SQLAlchemy 2, Alembic |
| Database | PostgreSQL 16 (Docker or Podman) |
| Auth | JWT access + refresh, Argon2 |
| Client | `openapi-typescript` types + `openapi-fetch` |
| Camera | MediaPipe Tasks Vision |
| PWA | `vite-plugin-pwa` (Workbox), IndexedDB via `idb` |
| Tests | Pytest, Playwright, Lighthouse |

---

## Quick start

Requirements: Docker (or Podman with the Compose plugin), [`uv`](https://docs.astral.sh/uv/), Node 22+.

```bash
cp .env.example .env
make install
make start
```

`make start` starts PostgreSQL if needed, applies migrations, seeds the demo state, and runs both servers. Press **Ctrl+C** to stop the API and web app; PostgreSQL stays running.

Prefer separate terminals? Use `make db`, then `make api` and `make web` in two shells.

Open **http://localhost:5173** — sign in with a demo account. The shell shows a **Demo** badge for the seeded mission. The styleguide is hidden in demo mode; set `VITE_DEMO_MODE=false` and restart Vite to expose `/styleguide`.

### Demo mode

`VITE_DEMO_MODE` defaults to on. It shows the **Demo** badge, labels the mission as simulated, hides the design-system link, and redirects `/styleguide` to the Flight Deck. Set `VITE_DEMO_MODE=false` while working on the design system.

After seeding, verify the scripted state:

```bash
make reset-demo
make demo-verify
```

`make demo-verify` checks the four crew accounts, privacy settings, commander readiness around 80 / Watch, the two expected alerts, mission day 42, space-weather context, and the content catalog (9 articles, 8 training items, 5 achievements, 4 rewards, 2 quizzes).

### Optional integrations

Everything works with safe local defaults:

- **NASA space weather** — set `NASA_API_KEY` for live DONKI context; fixtures are used when it is empty.
- **AI Flight Surgeon** — defaults to `LLM_PROVIDER=none`, which uses the deterministic cited answer engine. Set `LLM_PROVIDER=openai`, `LLM_API_KEY`, and `LLM_MODEL` to use an OpenAI-compatible chat endpoint; `LLM_BASE_URL` defaults to `https://api.openai.com/v1`. Refusal and red-flag answers always stay rule-based.
- **Camera pulse** — MediaPipe WASM and the face model load from CDN at runtime; no camera assets are committed. Override `VITE_MEDIAPIPE_WASM_URL` and `VITE_MEDIAPIPE_MODEL_URL` to self-host them. Camera permission is optional and the manual heart-rate field remains the fallback.

### View on a phone / install as a PWA

Browsers only allow service-worker installation over **HTTPS** (or `localhost`). A plain `http://192.168.x.x` address will display the app but will not be installable. For a temporary phone demo, use a same-origin HTTPS tunnel:

```bash
# 1. Keep the API running (make start, or make api + make db)
# 2. Build a same-origin frontend where /api is proxied to FastAPI
cd frontend
npm run build:phone

# 3. Serve the production build on 4173
npm run preview:phone

# 4. In another terminal, expose 4173 with a temporary HTTPS URL
cloudflared tunnel --url http://127.0.0.1:4173 --protocol http2
```

Open the printed `https://...trycloudflare.com` address on the phone, sign in with `commander@astra.space` / `astra-demo`, then use **Install app** (Android Chrome) or **Share -> Add to Home Screen** (iOS Safari). The tunnel is public while it runs, so stop it with Ctrl+C when finished. `cloudflared` is a separate free tool from Cloudflare; the app itself does not need it.

### Demo accounts

After `make seed` (or `make reset-demo`), use any of these at `POST /auth/login`:

| Account | Role | Use |
|---|---|---|
| `commander@astra.space` | Commander | Primary demo; HRV and sleep anomaly |
| `pilot@astra.space` | Pilot | Febrile episode; critical alert |
| `specialist@astra.space` | Specialist | Mood and social withdrawal |
| `engineer@astra.space` | Engineer | Stable control |

Password for all demo accounts: `astra-demo`.

### Ports

| Service | Port |
|---|---|
| Web | 5173 |
| API | 8000 |
| PostgreSQL | 5432 |

---

## Commands

| Command | Purpose |
|---|---|
| `make install` | Install backend (`uv sync`) and frontend (`npm install`) dependencies |
| `make db` | Start PostgreSQL |
| `make start` | Start PostgreSQL, API, and web app together |
| `make start-demo` | Rebuild the demo state, then start everything |
| `make api` | Run FastAPI with reload |
| `make web` | Run Vite |
| `make migrate` | Apply Alembic migrations |
| `make seed` | Seed the demo crew (idempotent) |
| `make reset-demo` | Rebuild the scripted demo state |
| `make demo-verify` | Check the scripted crew, readiness, alerts, and content |
| `make client` | Regenerate the typed API client from OpenAPI |
| `make test` | Backend tests |
| `cd frontend && npm run smoke` | Playwright smoke: the full shell, Library, assistant, camera fallback, offline queue, training, and session recovery |
| `npm run build && npx vite preview --port 4173` | Serve the production PWA build locally |
| `ASTRA_WEB_URL=http://localhost:4173 ASTRA_TEST_PWA=1 npm run smoke` | Run the same smoke suite against the PWA, including an offline shell reload |
| `make lint` | Ruff + oxlint |
| `make check` | Lint, test, typecheck, and build |

---

## Architecture

```
React 19 PWA (browser)
  ├─ TanStack Query ── typed openapi-fetch ──► FastAPI
  ├─ IndexedDB ── check-in drafts + per-user offline queue
  ├─ Workbox service worker ── app shell and static assets only
  └─ MediaPipe FaceLandmarker ── on-device pulse estimate

FastAPI
  ├─ JWT auth, privacy, rate limits
  ├─ readiness engine + hard rules + alert lifecycle
  ├─ atomic check-in transaction
  └─ 9 HRP articles, quizzes, training, rewards

PostgreSQL 16
  └─ 23 tables, seeded mission, crew, telemetry, content

Optional: NASA DONKI (space weather) and an OpenAI-compatible LLM.
```

The check-in is one database transaction: measurements, symptoms, snapshot, alerts, credits, streak, and achievements either all commit or none do. The offline queue keeps the same idempotency key across retries, so reconnect cannot create a duplicate.

---

## Structure

```
backend/      FastAPI service, models, rules, seed data, tests
frontend/     Vite app, design system, feature modules
scripts/      One-command local start script
docs/         Plan, API, design, sources, demo script
```

---

## Data honesty

AstraHealth does **not** access live astronaut health data. NASA does not publish a real-time per-astronaut health API. The product uses user-entered and camera-derived measurements, clearly labeled simulated crew telemetry, and public NASA HRP/OSDR material for reference ranges, countermeasures, and citations. Space-weather context comes from NASA DONKI when a key is configured, and from fixtures otherwise.

AstraHealth provides guidance, not diagnosis. Red-flag findings always route to a flight surgeon.

### Local security model

The runtime is a single-user local deployment. JWTs are stored in `localStorage`, and the cached profile is used only to render the shell when the API is unreachable. The production build does not cache API responses in the service worker, so health data is never persisted into the public cache. Auth endpoints are rate-limited per client and email; CORS allows only the documented local origins. A public deployment should move tokens to secure cookies, terminate TLS, and put the API behind a real rate limiter.

---

## Documentation

- [`START_HERE_WINDOWS.md`](START_HERE_WINDOWS.md) — complete Windows beginner guide
- [`docs/PLAN.md`](docs/PLAN.md) — product, architecture, data model, phases, verification
- [`docs/DESIGN.md`](docs/DESIGN.md) — tokens, components, motion, accessibility
- [`docs/API.md`](docs/API.md) — endpoint contract
- [`docs/SOURCES.md`](docs/SOURCES.md) — scientific sources and data honesty
- [`docs/DEMO.md`](docs/DEMO.md) — three-minute demo script
