# AstraHealth — Build Plan

**Concept:** *You are the spacecraft.* A flight-deck style health monitor for astronauts on long-duration missions.
**Executor:** coding agent.
**Reviewer:** project owner (guidance, verification, acceptance).
**Status:** approved scope for a local-only build. NASA API key and LLM provider are deferred integrations, not blockers.
**Product update:** the redeemable rewards/allowance catalog described in this historical plan was removed. Mission points now advance rank only.

---

## 1. Product

### 1.1 One-liner

AstraHealth is mission-control software for the human body: it collects health indicators, explains what they mean in spaceflight, scores crew readiness, and tells the astronaut what to do next.

### 1.2 Core loop

1. **Check** — a two-minute guided Systems Check collects vitals, sleep, mood, symptoms, training, and nutrition.
2. **Understand** — the readiness engine turns measurements into an explainable status per body system.
3. **Act** — the astronaut gets a countermeasure, a training task, or an escalation to a flight surgeon.
4. **Return** — consistency earns Flight Credits, ranks, commendations, and mission allowances; the crew board reinforces routine and shared accountability.

### 1.3 Design direction

Calm clinical. A light, low-density interface — not a dark console.

- The Flight Deck concept remains: the astronaut is the most critical system on the mission.
- Readiness ring, a detailed anatomical body map with front/back views, six domain rows, an exception list, and a mission tape.
- One teal accent, four semantic status colors, and generous whitespace.
- No scanlines, glows, grids, pulsing indicators, or ambient motion.
- The anatomical body map uses the Apache-2.0 `body-muscles` data with front/back views, 70+ regions, and domain-level status tints.
- Mission Elapsed Time (MET) clock as the global time reference.
- Offline-first, because deep-space crews do not have a live connection.

### 1.4 Committed scope

- Authentication, seeded crew of four, one mission.
- Flight Deck with a detailed anatomical body map, readiness ring, domain rows, exception list, mission tape.
- Five-step Systems Check with instant Systems Report.
- Telemetry index, domain summaries, and metric detail pages with 7/30/90-day trends, baseline and reference bands, event overlays, and CSV export.
- Explainable readiness engine plus hard-rule overrides.
- Mission Rank, Flight Credits, achievements, one-time mission allowances, and streaks with one grace day.
- Crew page with a privacy-filtered readiness roster and a consistency board, never exposing health values.
- Two quizzes: Know Yourself and Know Your Crew, the latter consent-gated.
- Mission Log combining check-ins, alerts, training, achievements, and redemptions.
- Nine HRP-sourced knowledge articles surfaced inline.
- Training/countermeasure checklist with logging and streaks.
- In-app Duty Roster reminders.
- SI Flight Surgeon with citations and a deterministic answer fallback.
- Camera heart-rate measurement (rPPG) with manual fallback.
- PWA shell and offline check-in queue.
- Local Docker-based runtime, seeded demo state, README, and demo script.

### 1.5 Deferred backlog

- Orbital visualization mode.
- Voice journal and speech sentiment.
- Wearable and device import.
- Live WebSocket telemetry (polling is sufficient).
- Real-time multiplayer quiz duels.
- Adaptive training planner.
- Full evidence graph and search.
- Cloud deployment, Sentry, Playwright end-to-end suite.
- Live NASA API integration (fixtures until a key exists).
- Live LLM integration (rule-based answers until a provider exists).

---

## 2. Principles

1. **Explainability over cleverness.** Every score exposes its factors and the rules that fired. No black-box health judgment.
2. **Guidance, never diagnosis.** Copy always frames output as guidance and escalates red flags to a flight surgeon.
3. **Privacy by default.** Health values are private. Crew visibility is opt-in per astronaut. Leaderboards never rank health values.
4. **Offline first.** The shell loads without network, check-ins queue locally, and sync is explicit.
5. **Astronaut-ready UI.** Large targets, no hover-only affordances, color never used alone, reduced motion honored, keyboard reachable.
6. **Science grounding.** Every knowledge article and alert rationale carries a source citation.
7. **No dead UI.** Deferred features are absent or behind a flag, never visible placeholders.

---

## 3. Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v4, shadcn/ui primitives (Radix) |
| Animation | motion (Framer Motion successor) |
| Charts | Recharts for standard charts; custom SVG/Canvas for the ring, body, and tape |
| State | TanStack Query (server state), Zustand (UI state) |
| Forms | React Hook Form, Zod |
| Routing | React Router |
| API client | Generated from FastAPI OpenAPI via `openapi-typescript` + `openapi-fetch` |
| Backend | FastAPI, Pydantic v2, SQLAlchemy 2.0 (sync sessions), Alembic |
| Database | PostgreSQL 16 in Docker |
| Auth | JWT access + refresh, PyJWT, pwdlib with Argon2 |
| Camera | MediaPipe Tasks Vision (FaceLandmarker, WASM) |
| PWA | vite-plugin-pwa, IndexedDB via `idb` |
| Testing | Pytest (engine and rules), Vitest (pure utils) |
| Tooling | Ruff, oxlint, Prettier, Makefile, Docker Compose |

### 3.1 Runtime topology (local only)

```
docker compose: postgres
backend:        uvicorn app.main:app --reload   (host)
frontend:       vite dev server                 (host)
```

Optional compose profile runs all three services. Default local workflow uses host processes for fast reload.

### 3.2 Environment variables

```
DATABASE_URL=postgresql+psycopg://astra:astra@localhost:5432/astrahealth
JWT_SECRET=change-me
JWT_ACCESS_MINUTES=30
JWT_REFRESH_DAYS=14
NASA_API_KEY=            # optional; fixtures used when empty
LLM_PROVIDER=none        # none | openai | anthropic | gemini | opencode
LLM_API_KEY=
LLM_MODEL=
VITE_API_URL=http://localhost:8000
```

Both deferred integrations must degrade gracefully: absence of a key is a supported configuration, not an error.

---

## 4. Architecture

### 4.1 Repository layout

```
AstraHealth/
├── backend/
│   ├── app/
│   │   ├── api/            # routers: auth, me, crew, metrics, measurements,
│   │   │                   # checkins, readiness, alerts, training, gamification,
│   │   │                   # quizzes, knowledge, mission, assistant
│   │   ├── core/           # config, security, clock
│   │   ├── db/             # session, base, seed
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic request/response models
│   │   ├── services/       # readiness, rules, credits, quizzes, assistant, nasa
│   │   └── main.py
│   ├── alembic/
│   ├── tests/
│   ├── data/               # rules.json, knowledge.json, fixtures/donki.json
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── app/            # router, providers, layouts
│   │   ├── components/     # design system primitives
│   │   ├── features/       # flight-deck, checkin, trends, training, crew,
│   │   │                   # quizzes, knowledge, rewards, assistant, camera
│   │   ├── lib/            # api client, query keys, format, scoring helpers
│   │   ├── styles/         # tokens.css, globals.css
│   │   └── assets/         # silhouette.svg, icons
│   ├── public/
│   └── package.json
├── docs/
│   ├── PLAN.md
│   ├── API.md
│   ├── DESIGN.md
│   ├── SOURCES.md
│   └── DEMO.md
├── docker-compose.yml
├── Makefile
├── .env.example
└── README.md
```

### 4.2 Request flow

```
React view
  → TanStack Query
    → generated typed client
      → FastAPI router
        → service (rules / readiness / credits)
          → SQLAlchemy
            → PostgreSQL
```

All business logic lives in `services/`. Routers validate and delegate. No scoring logic in the frontend except display formatting.

### 4.3 Makefile targets

```
make db        # start postgres
make api       # run uvicorn
make web       # run vite
make migrate   # alembic upgrade head
make seed      # idempotent seed
make reset-demo# reseed the scripted demo state
make test      # pytest + vitest
make lint      # ruff + eslint
make check     # lint + test + build
```

---

## 5. Domain model

### 5.1 Entities

| Entity | Key fields |
|---|---|
| `users` | id, email, password_hash, full_name, role, crew_id, share_status, created_at |
| `crews` | id, name, mission_id |
| `missions` | id, name, profile, environment, start_at, duration_days |
| `metric_definitions` | id, code, name, unit, domain, description, normal_min, normal_max, floor_sd, frequency, source_types |
| `measurements` | id, user_id, metric_code, value, measured_at, source, confidence, notes |
| `checkins` | id, user_id, started_at, completed_at, status, notes |
| `checkin_entries` | id, checkin_id, metric_code, value, meta |
| `symptoms` | id, checkin_id, region, symptom, severity, duration |
| `alerts` | id, user_id, severity, rule_id, title, rationale, recommended_action, status, created_at, acked_at |
| `readiness_snapshots` | id, user_id, computed_at, score, status, domain_scores, factors |
| `knowledge_articles` | id, slug, title, domain, summary, body_md, source_name, source_url, citation |
| `training_items` | id, code, name, description, domain, target_per_week, duration_min |
| `training_sessions` | id, user_id, item_code, completed_at, duration_min, rpe |
| `quizzes` | id, slug, title, mode, questions |
| `quiz_attempts` | id, quiz_id, user_id, subject_user_id, answers, score, completed_at |
| `achievements` | id, code, name, description, icon, criteria |
| `user_achievements` | user_id, achievement_id, unlocked_at |
| `credit_events` | id, user_id, amount, reason, ref_type, ref_id, created_at |
| `rewards` | id, code, name, description, cost, icon, category, active |
| `redemptions` | id, user_id, reward_id, status, redeemed_at |
| `streaks` | user_id, kind, current, longest, last_date |
| `space_weather_events` | id, event_id, kind, start_at, end_at, severity, summary, fetched_at |

`users.share_status` is one of `private`, `status_only`, `full`.

### 5.2 Metric catalog

| Domain | Metrics |
|---|---|
| Cardiovascular | heart_rate, hrv_rmssd, systolic_bp, diastolic_bp, orthostatic_hr_rise |
| Musculoskeletal | exercise_load_min, bone_load_min, strength_check, body_mass |
| Sleep & Circadian | sleep_duration_h, sleep_efficiency_pct, sleep_latency_min |
| Neurobehavioral | mood_score, stress_score, reaction_time_ms, social_interaction_score |
| Metabolic & Nutrition | blood_glucose, hydration_l, caloric_intake, vitamin_d |
| Immune & Sensory | body_temp_c, symptom_score, vision_change_score |

Every metric definition carries unit, normal range, personal-baseline floor, measurement frequency, and allowed sources (`manual`, `camera_rppg`, `device`, `derived`).

### 5.3 Readiness engine

Deterministic. Config-driven. No machine learning.

```
z        = (value − baseline_mean) / max(baseline_sd, metric_floor)
subscore = clamp(100 − 18 * abs(z), 0, 100)
domain   = weighted mean of available metric subscores
index    = sum(domain_score * profile_weight)
```

Baseline is the user's 21-day median and standard deviation per metric, ending three days before the current reading. The three-day offset keeps the current episode from contaminating its own reference. A metric needs at least three baseline points and a fresh latest value; missing metrics are excluded and weights renormalized.

Each factor's contribution is `(subscore − 100) × domain_weight × (1 / metrics_in_domain) / total_weight × 10`, so the top factors explain the gap from 100. Snapshots store the top eight factors for display; the engine keeps the full ranked list internally.

Status thresholds:

| Index | Status |
|---|---|
| 85–100 | Nominal |
| 70–84 | Watch |
| 50–69 | Caution |
| 0–49 | Critical |

Profile weights:

| Domain | Mars transit | Lunar surface | Station |
|---|---|---|---|
| Cardiovascular | 0.22 | 0.18 | 0.20 |
| Musculoskeletal | 0.16 | 0.20 | 0.20 |
| Sleep & Circadian | 0.20 | 0.16 | 0.18 |
| Neurobehavioral | 0.20 | 0.18 | 0.18 |
| Metabolic & Nutrition | 0.12 | 0.12 | 0.12 |
| Immune & Sensory | 0.10 | 0.16 | 0.12 |

Every computation returns `domain_scores`, ranked `factors` (metric, value, z, delta contribution, direction), and `fired_rules`. The UI renders these directly in the "Why this score?" panel.

### 5.4 Hard rules

Stored in `backend/data/rules.json`, evaluated after the composite score. A fired rule can override the status and always creates an alert.

| ID | Condition | Severity | Action |
|---|---|---|---|
| R1 | body_temp ≥ 38.0 and heart_rate > 100 | Critical | Escalate to flight surgeon |
| R2 | systolic_bp ≥ 140 or ≤ 90 with symptoms | Critical | Escalate, rest, re-measure |
| R3 | blood_glucose < 70 or > 250 | Critical | Escalate immediately |
| R4 | sleep_duration < 4h for 3 consecutive nights | Caution | Sleep countermeasure |
| R5 | mood_score ≤ 2 for 5 days with low social interaction | Caution | Private crew check-in and counseling |
| R6 | orthostatic_hr_rise > 30 | Caution | Fluid and salt protocol, repeat test |
| R7 | chest pain, dyspnea, or vision loss reported | Critical | Stop activity, escalate now |

Each rule carries a plain-language rationale, a recommended action, and a citation slug.

### 5.5 Gamification rules

- **Flight Credits** are awarded for consistency only: completed check-ins, training adherence, knowledge quizzes, and streak milestones.
- Credits are never awarded for a health value, and there is no penalty for reporting a symptom.
- **Mission Rank:** Candidate → Cadet → Specialist → Flight Engineer → Commander, by lifetime credits.
- **Commendations:** First Check, 7-Day Streak, Sleep Steward, Crew Ally, Quiz Ace, Systems Restored.
- **Mission Allowances:** Family Call (120 credits), Choose the Menu (80), Rest Day (200).
- **Crew Readiness Board:** ranks by consistency, where consistency is check-in and training adherence over 14 days. Health values never appear, and the product deliberately has no in-app messaging layer.
- **Quizzes:** 5 multiple-choice questions each. Know Yourself covers health literacy. Know Your Crew is consent-gated, asks perception questions about a crewmate, and returns aggregated, non-judgmental feedback.

---

## 6. API contract

```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
GET    /me
PATCH  /me
GET    /me/privacy

GET    /crew
GET    /crew/leaderboard

GET    /mission
GET    /mission/context
GET    /mission/tape?days=7|30

GET    /metrics/definitions
POST   /measurements
GET    /measurements?metric&from&to

POST   /checkins
GET    /checkins
GET    /checkins/{id}
GET    /checkins/{id}/report

GET    /readiness
GET    /readiness/history
POST   /readiness/compute
GET    /readiness/domains/{domain}

GET    /alerts
POST   /alerts/{id}/ack

GET    /training/catalog
GET    /training/plan
GET    /training/roster
GET    /training/reminders
POST   /training/sessions

GET    /achievements
GET    /credits
GET    /rewards
POST   /rewards/{id}/redeem
GET    /redemptions

GET    /quizzes
GET    /quizzes/{slug}
POST   /quizzes/{slug}/attempts
GET    /quizzes/attempts

GET    /knowledge
GET    /knowledge/{slug}

GET    /assistant/suggestions
POST   /assistant/ask

GET    /health
```

Conventions:

- All endpoints except auth and `/health` require a bearer token.
- Errors use `{ "detail": "message" }`.
- Timestamps are ISO 8601 UTC.
- The OpenAPI schema is the source of truth; regenerate the frontend client after every contract change.

---

## 7. Design system

### 7.1 Tokens

```css
--canvas:       #F4F6F8;
--surface:      #FFFFFF;
--surface-muted:#F0F3F6;
--line:         #E2E8EF;
--line-strong:  #CBD5E1;
--ink:          #0F1B2D;
--ink-2:        #526175;
--muted:        #5F6F82;
--accent:       #0F766E;
--accent-soft:  #E6F4F2;
--nominal:      #15803D;
--watch:        #B45309;
--caution:      #C2410C;
--critical:     #B91C1C;
--unknown:      #55657A;
```

Typography: Geist for display and interface, Geist Mono for telemetry and numbers. Status tints are used only as pill or badge backgrounds.

### 7.2 Primitives

`Panel`, `StatusPill`, `StatusBadge`, `StatusDot`, `StatusLegend`, `Button`, `DomainRail`, `ReadinessRing`, `MetricCard`, `Sparkline`, `TelemetryNumber`, `AnomalyCard`, `MissionTape`, `StepIndicator`, `ScaleInput`, `AnatomyMap`, `ArticleCard`, `RankBadge`, `CreditChip`, `RewardCard`, `QuizCard`, `CopilotDrawer`, `MetClock`.

Status is always encoded three ways: color, icon/label, and a word. Color alone is never the only signal.

### 7.3 Motion

- Duration 150–800 ms, easing out, no bounce except a future reward moment.
- No ambient loops, scan sweeps, breathing pulses, or parallax.
- `prefers-reduced-motion` disables the readiness arc and number count-up.
- Numbers animate with a short count-up only when the value changes.

### 7.4 Astronaut UX constraints

- Minimum 48×48 px interactive targets.
- No hover-only information; every tooltip is also reachable by focus and tap.
- High contrast in all statuses.
- Full keyboard navigation with visible focus rings.
- Offline and stale states are explicit, never silent.

### 7.5 Anatomical body map

- Uses the Apache-2.0 `body-muscles` SVG data: 70+ muscle regions across anterior and posterior views.
- Domain mapping: head and neck → neurobehavioral, chest → cardiovascular, abdominals → metabolic, shoulders/arms/back/legs/hands/feet → musculoskeletal, whole body → immune. Sleep is a schedule domain.
- Base fill `#D8E3ED` with white separations; every domain carries a soft status tint; the selected domain is stronger (34%); hover raises the muscle to its status color and shows its name.
- The whole-body button selects the immune domain and draws a dashed halo.
- The SVG is a mouse enhancement; the Systems rows are the keyboard and screen-reader control surface.
- No scan sweep, grid, or ambient motion. Front/back and selection are the only state changes.
- Attribution and license: `docs/SOURCES.md` and `docs/licenses/body-muscles-*`.

---

## 8. Phases

Each phase ends with a review gate. A phase is complete only when every acceptance item passes. The agent must not advance with a failing gate.

---

### Phase 0 — Scaffolding and foundations

**Goal:** a runnable skeleton with tooling, tokens, and contracts in place.
**Status:** complete — design revised to the light clinical system (v0.2) after Gate A feedback. Awaiting sign-off.

- [x] Initialize git repository and `.gitignore`.
- [x] Create `backend/` FastAPI app with `/health`, config, CORS, OpenAPI metadata.
- [x] Create `frontend/` Vite React TS app with router, providers, Tailwind v4.
- [x] Add `docker-compose.yml` for PostgreSQL 16 with a named volume.
- [x] Add `.env.example`, `Makefile`, Ruff, oxlint, Prettier.
- [x] Add design tokens and a `/styleguide` route rendering every primitive in all states.
- [x] Add `docs/API.md`, `docs/DESIGN.md`, `docs/SOURCES.md`, `docs/DEMO.md` stubs.
- [x] Add `README.md` with setup and run instructions.

**Deliverable:** `make db`, `make api`, and `make web` bring up a styled placeholder app backed by a live API.

**Acceptance:** `/health` returns ok; `/styleguide` renders tokens and primitives; lint passes; `npm run build` succeeds.

**Review gate A:** owner confirms the visual direction on the styleguide before feature work.

---

### Phase 1 — Backend core

**Goal:** all persistence, authentication, and seed data.
**Status:** complete.

- [x] Implement every entity in §5.1 with relationships and indexes.
- [x] Generate the initial Alembic migration and verify upgrade/downgrade.
- [x] Implement register, login, refresh, and current-user dependency.
- [x] Implement metric definitions, measurements, check-ins, and check-in entries.
- [x] Implement privacy settings on `users.share_status`.
- [x] Build the idempotent seed command:
  - [x] 1 crew, 4 users, 1 Mars transit mission.
  - [x] 60 days of measurements per user with realistic distributions.
  - [x] Three planted anomaly arcs and one stable control.
  - [x] Knowledge articles, quizzes, achievements, rewards, training items.
- [x] Generate the typed frontend client and commit the generated schema.
- [x] Add Pytest coverage for auth and CRUD happy paths.

**Deliverable:** the full dataset is queryable through the API with a demo login.

**Acceptance:** `make reset-demo` produces identical data on repeat runs (3,335 measurements, 22 check-ins, 4 crew); `GET /measurements` returns 60 days for the demo user; 16 backend tests pass.

**Implemented endpoints:** `/auth/register`, `/auth/login`, `/auth/refresh`, `/me`, `/me/privacy`, `/metrics/definitions`, `/measurements`, `/measurements/batch`, `/checkins`, `/mission`.
**Deferred:** the check-in report, readiness computation, and alert endpoints land in Phase 3. The seed already contains `readiness_snapshots` and `alerts` for that phase.

---

### Phase 2 — Application shell

**Goal:** the navigable frame of the product.
**Status:** complete.

- [x] App layout: nav rail, top bar with MET clock, mission name, crew count, comms status.
- [x] Login and registration screens in the design language.
- [x] Route guard and token refresh flow.
- [x] TanStack Query setup, error boundary, toast system.
- [x] Section routes: Flight Deck, Systems Check, Telemetry, Training, Crew, Log, Library.
- [x] Loading skeletons and empty states for every route.
- [x] Responsive behavior: desktop-first, usable at 768 px and 390 px.

**Deliverable:** every route is reachable, authenticated, and visually consistent.

**Acceptance:** navigation works with keyboard only; expired token redirects to login once and recovers; no unstyled route.

**Implemented in this phase:**
- App shell with fixed sidebar, mobile drawer with focus trap, top bar with readiness, MET, crew count, and comms delay.
- Login and registration with React Hook Form + Zod, inline errors, loading states, and a demo-account shortcut.
- Session bootstrap: `/me` first, then refresh-token recovery; invalid sessions clear and redirect to `/login` once.
- Read-only `/readiness` and `/alerts` endpoints to feed the shell; the scoring engine remains Phase 3.
- Flight Deck overview with the readiness ring, top factors, domain snapshot, active alerts, and next action.
- Placeholder routes for the sections built in later phases, each with a clear state.
- Verified with a Playwright smoke pass: login, shell, placeholder route, mobile drawer, refresh recovery, expired-session redirect, and logout.

---

### Phase 3 — Readiness engine and rules

**Goal:** the intelligence layer, fully tested.
**Status:** complete.

- [x] Implement baseline calculation (21-day median and standard deviation, ending 3 days before the current reading).
- [x] Implement z-scores, subscores, domain aggregation, and profile weighting.
- [x] Implement `rules.json` loading, evaluation order, and overrides.
- [x] Persist `readiness_snapshots` on check-in and on demand.
- [x] Implement alert creation, deduplication, and acknowledgement.
- [x] Expose `/readiness`, `/readiness/history`, `/readiness/compute`, `/alerts`, and `/alerts/{id}/ack`.
- [x] Pytest suite:
  - [x] Nominal, Watch, Caution, Critical boundary cases.
  - [x] Missing metric weight renormalization.
  - [x] Every hard rule fires exactly when intended.
  - [x] Rule override beats a high composite score.
  - [x] Determinism: same input, same output.
  - [x] Alert deduplication, acknowledgement, and resolution.

**Deliverable:** a seeded demo user shows a machine-generated readiness state and explanation.

**Computed demo states (approximately, relative to the seed time):** Commander ~78–80 Watch (sleep fragmentation and HRV trend alerts); Pilot ~78.7 Critical (R1 febrile episode with tachycardia); Specialist ~79.9 Caution (R5 mood and social withdrawal, plus elevated stress); Engineer ~90.3 Nominal (no alerts).

**Acceptance:** 32 backend tests pass; `GET /readiness` returns factors sorted by contribution; the specialist and pilot return fired rule IDs; the commander returns the two engine-generated trend alerts.

**Implementation notes:**
- The engine reads `backend/data/rules.json` with recursive `all` / `any` / `consecutive` / `symptom_any` conditions.
- A fired rule overrides the composite status; Critical wins over Caution, which wins over Watch.
- Trend alerts are generated from the top two adverse factors that are not already covered by a hard rule, with a z-score threshold of 2.0.
- Alerts are upserted by `(user, rule_id)`; acknowledged alerts stay acknowledged while the condition persists, and resolve when it clears.
- The seed now computes snapshots and alerts through the engine instead of inserting manual demo scores.

---

### Phase 4 — Flight Deck

**Goal:** the hero screen.
**Status:** complete.

- [x] Readiness ring with animated arc, status label, and factor count.
- [x] Six domain rows with status, score, progress bar, and delta.
- [x] Detailed anatomical body map with 70+ regions, front/back views, hover, click, domain status tint, and whole-body selection.
- [x] Domain detail panel: metrics, values, statuses, trend link, and baseline z-scores.
- [x] Exception list: severity, title, rationale, recommended action, and acknowledge.
- [x] Mission tape: 7-day and 30-day windows with event markers.
- [x] "Why this score?" panel driven by engine factors.
- [x] Mission context banner from cached space-weather fixtures.

**Deliverable:** the dashboard fully explains the demo crew's current state.

**Acceptance:** clicking a body region opens the correct domain; the score in the ring matches the API; acknowledging an alert updates the feed without reload; reduced-motion mode is static but complete.

**Implementation notes:**
- The seed now computes seven daily snapshots per user, so the domain rows have real day-over-day deltas.
- `GET /readiness/domains/{domain}` returns the per-metric detail for the selected body region or domain row.
- `GET /mission/tape?days=7|30` aggregates check-ins, alerts, training sessions, commendations, allowances, and space-weather events.
- `GET /mission/context` returns the latest DONKI-style fixture and whether it is currently active.
- The anatomical map uses 70+ SVG muscle regions with front and back views. Head and neck map to neurobehavioral, chest to cardiovascular, abdominals to metabolic, shoulders/arms/back/legs to musculoskeletal, and the whole-body halo to immune. Sleep is a schedule domain, not a region.
- Alert acknowledgement uses `POST /alerts/{id}/ack` and invalidates the active alert list.
- The mission tape alternates event lanes to reduce overlap and switches tick spacing for 7 vs. 30 days.
- 37 backend tests and 17 Playwright shell checks pass.

---

### Phase 5 — Systems Check and report

**Goal:** the primary data-entry ritual.

- [x] Five-step wizard: Vitals, Sleep, Mood & Stress, Symptoms, Training & Nutrition.
- [x] Step progress indicator built from the ring motif.
- [x] Large-touch number inputs, scales, and body-region symptom tapping.
- [x] "Why we ask" explanation on every step, sourced from knowledge articles.
- [x] Client validation with Zod, server validation mirrored in Pydantic.
- [x] Draft persistence to IndexedDB; resume prompt on return.
- [x] Submit creates measurements, check-in entries, symptoms, readiness snapshot, alerts, and credit events in one transaction.
- [x] Systems Report: status change, top three factors, one recommended action, credits earned.
- [x] Skip option per step with an explicit "insufficient data" state.

**Deliverable:** a complete check-in from an empty state to a report.

**Acceptance:** check-in completes in under two minutes; the report matches the engine output; failures leave no partial check-in; drafts survive a reload.

**Implementation notes:**
- `POST /checkins` now flushes the check-in, writes measurements, the derived symptom score, a 40-credit event, and the readiness snapshot before a single commit. Any engine failure rolls the whole transaction back and returns 500.
- `GET /checkins/{id}/report` finds the snapshot within two seconds of `completed_at`, returns the score, previous score, delta, status change, top three factors, recommended action, credits, active alerts, and notes.
- The wizard stores a versioned draft in IndexedDB under `checkin:{userId}`. It saves 400 ms after a change and prompts on return. Submitting deletes the draft.
- A non-skipped step must contain at least one reading. Skipping clears that step and records it in the check-in notes. "No symptoms today" writes `symptom_score = 0`.
- Pydantic enforces finite numeric values, known metric codes, 1–10 symptom severity, and list/string limits; the client mirrors these and adds per-metric input ranges for usability.
- The symptoms step reuses the `body-muscles` paths with six symptom regions plus a whole-body option. The region chips are the keyboard and screen-reader control surface.
- The report page shows an explicit insufficient-data state when the engine cannot form a baseline; the readings and credits are still persisted.
- 40 backend tests and 25 Playwright checks pass.

---

### Phase 6 — Trends and metric detail

**Goal:** longitudinal understanding.

- [x] Metric detail route with 7/30/90-day ranges.
- [x] Recharts line with personal baseline band and normal-range band.
- [x] Event overlays: check-ins, alerts, training sessions, space-weather events.
- [x] Domain summary page aggregating its metrics.
- [x] Comparison toggle: personal baseline vs. spaceflight reference range.
- [x] Export a metric series as CSV.

**Deliverable:** every metric is inspectable over time with context.

**Acceptance:** charts render seeded anomalies visibly; range switching preserves state; empty ranges show a useful state, not a blank chart.

**Implementation notes:**
- `GET /metrics/{code}/series?days=7|30|90` returns the range points, the 21-day personal baseline band (median ±1 SD), the spaceflight reference range, latest and previous readings, delta, z/subscore, status, stale flag, and range stats.
- The baseline is computed from the same window and constants as the readiness engine. A metric's status uses `100 − 18 × |z|` and only appears when the latest reading is within its usual cadence.
- `GET /domains/{domain}?days=7|30|90` returns the current domain score/status plus a summary card for every metric in the domain. The score is the mean of the metrics with a personal baseline; the cards show in-range sparklines and point counts.
- `/telemetry` is the domain and metric index. `/telemetry/domain/:domain` aggregates a domain. `/telemetry/metric/:code` is the metric detail.
- The metric chart uses Recharts with a time-scaled x-axis. It draws the selected band, baseline median, and vertical event markers for check-ins, training, alerts, and space weather. A separate event rail and an expandable event list provide the accessible overlay.
- The range and comparison band live in the URL (`?days=30&band=baseline`), so range switches, browser back/forward, and navigation from a domain card preserve state.
- The comparison toggle switches between the personal baseline band and the spaceflight reference range. The selected band is emphasized in the sidebar.
- CSV export writes `measured_at,value,unit,source,confidence` for the in-range points. The button is disabled when the range is empty.
- Empty ranges show an explicit state with the latest reading, a longer-range action, and a check-in action. A metric with no baseline still shows its readings and explains what is missing.
- 46 backend tests and 34 Playwright checks pass.

---

### Phase 7 — Gamification, crew, and quizzes

**Goal:** motivation and social layer.

- [x] Credit ledger and award rules for check-ins, training, quizzes, and streaks.
- [x] Rank computation and progress display.
- [x] Achievement definitions, unlock evaluation, and celebration moment.
- [x] Rewards catalog, redemption flow, and inventory.
- [x] Streak tracking with a single grace day.
- [x] Crew page with a privacy-filtered readiness roster and a consistency board.
- [x] Per-user privacy toggle affecting what the crew can see.
- [x] Nudges were deliberately removed after review; direct crew communication stays outside the health tool.
- [x] Quiz list, quiz runner, scoring, result with explanations.
- [x] Know Yourself and Know Your Crew quizzes, consent-gated.
- [x] Mission Log feed combining check-ins, alerts, training, achievements, redemptions.

**Deliverable:** a full motivation loop from action to reward to social reinforcement.

**Acceptance:** completing a check-in awards credits exactly once; redemption deducts and appears in the log; the leaderboard never exposes health values; a private user's status is hidden from crewmates.

**Implementation notes:**
- Award rules: check-in 40 FC, training session 30 FC, first quiz completion 50 FC, and a 50 FC bonus at every 7-day streak milestone. Redemptions write a negative credit event, so the ledger balance is the sum of all events.
- Rank uses lifetime credited credits (not the spendable balance), so redeeming an allowance never demotes the astronaut. Tiers: Trainee, Crew Specialist, Senior Specialist, Flight Officer, Flight Commander, Voyager.
- The check-in transaction updates the check-in streak, evaluates achievements, and writes all credit events before the single commit. The report returns the current balance, lifetime credits, rank, streak, and new achievements.
- Streaks allow one missed day per streak. A second gap resets the streak. The `grace_used` flag is stored on the streak row.
- Achievements are evaluated after check-ins, training, and quizzes. The Mission Log and report show locked/unlocked state; the quiz result and report show a celebration panel for new unlocks.
- The rewards catalog is one-time inventory per astronaut. Redemption checks the balance, writes a negative event, and records the redemption atomically.
- Crew consistency is 70% check-in coverage (7 target) plus 30% training coverage (5 target) over 14 days. The leaderboard schema has no readiness fields.
- Privacy is enforced in the roster: `private` hides status and score, `status_only` shares the label only, and `full` shares both. The current user always sees their own data.
- The product has no in-app chat or nudge inbox. The crew can communicate directly; the app only governs readiness sharing.
- Quizzes strip answer keys from the detail response. The crew quiz only lists and accepts subjects with `status_only` or `full` sharing; `private` subjects are rejected with 403.
- `GET /mission/log` combines check-ins, alerts, training sessions, achievements, and redemptions in descending time order.
- 55 backend tests and 45 Playwright checks pass.

---

### Phase 8 — Training and Duty Roster

**Goal:** prescribed countermeasures and routine.

- [x] Training catalog mapped to domains and mission profiles.
- [x] Weekly plan generation from the active alerts and profile.
- [x] Session logging with duration and perceived exertion.
- [x] Adherence percentage and streak integration.
- [x] Countermeasure cards on alerts linking to the relevant training item.
- [x] Duty Roster: daily schedule of check-ins, training, hydration, sleep window.
- [x] In-app reminder badges and a "next due" indicator.

**Deliverable:** the astronaut always knows the next health action.

**Acceptance:** a critical alert produces a linked countermeasure; logging a session updates adherence and credits; the roster reflects the mission profile.

**Implementation notes:**
- The catalog contains four prescribed training items (resistance, aerobic, bone load, mobility) and four daily countermeasures (sleep, hydration, recovery, nutrition). Each item declares its mission-profile availability and kind.
- Profile targets: Mars transit resistance 3 / aerobic 2 / bone 1 / mobility 3; lunar surface resistance 3 / aerobic 1 / bone 3 / mobility 3; station resistance 3 / aerobic 3 / bone 1 / mobility 3. Daily countermeasures target 7.
- The weekly plan runs Monday–Sunday. It counts logged sessions, prioritizes items linked to active alerts, and computes adherence over the four prescribed sessions only. Daily countermeasures track separately.
- Countermeasures map rule IDs and trend metrics to training items: R1/R7 recovery, R2/R3/R6 hydration, R4 sleep hygiene, R5 mobility, with trend metric mappings for HRV, sleep, stress, load, strength, mass, intake, vitamin D, and SpO₂. The alerts payload includes an optional nested countermeasure.
- The Flight Deck and Systems Report alert cards link to `/training?item=<code>`, which opens the session-log form for the linked countermeasure.
- Session logging records item, duration, and RPE 1–10, awards 30 FC, updates the training streak, evaluates achievements, and refreshes the plan, roster, reminders, credits, and Mission Log.
- The Duty Roster runs 07:00 Systems Check, 08:00 Hydration check, 10:00 Training, and 21:30 Sleep wind-down. Status is done, due, or upcoming. The check-in detail names the mission's comms profile; lunar surface emphasizes bone loading.
- `/training/reminders` backs the Training nav badge (due count) and the TopBar next-due chip. The Training page shows the next due, adherence, streak, plan, roster, and recent sessions.
- 59 backend tests and 51 Playwright checks pass.

---

### Phase 9 — Knowledge, SI Flight Surgeon, and camera HR

**Goal:** the three credibility and wonder features.

**Knowledge**
- [x] Nine articles with body markdown, source name, URL, and citation line.
- [x] Inline links from metrics, rules, check-in steps, and training items.
- [x] Library index with domain filters.

**SI Flight Surgeon**
- [x] Provider interface with `none` as the default.
- [x] Context builder: recent metrics, active alerts, readiness factors, top three knowledge articles.
- [x] Guardrailed system prompt: no diagnosis, cite article slugs, escalate red flags, answer within 120 words.
- [x] Deterministic fallback that answers from rules and knowledge without an LLM.
- [x] Cached scripted answers for the demo questions.
- [x] Copilot drawer with suggested questions and citation chips.
- [x] Refusal path for out-of-scope medical requests.

**Camera HR**
- [x] MediaPipe FaceLandmarker initialization with progress state.
- [x] Forehead and cheek ROI sampling for 25 seconds.
- [x] Detrending, bandpass 0.7–3.0 Hz, FFT peak detection, BPM output.
- [x] Signal-quality gate with a clear retry message.
- [x] Save measurement with `source=camera_rppg` and confidence.
- [x] Manual entry fallback always visible.

**Deliverable:** the demo can cite science, answer a question, and measure a pulse.

**Acceptance:** assistant answers cite at least one real article and never diagnoses; with `LLM_PROVIDER=none` the fallback produces useful answers; camera produces a plausible BPM under stable light or fails gracefully.

---

### Phase 10 — PWA, offline, and hardening

**Goal:** production-grade behavior.

- [x] Service worker caching the app shell and static assets.
- [x] IndexedDB queue for check-ins submitted offline.
- [x] Sync on reconnect with conflict handling and explicit status.
- [x] "Next comms window" indicator and offline banner.
- [x] Accessibility pass: focus order, labels, contrast, target sizes, reduced motion.
- [x] Performance pass: route-level code splitting, image and font optimization, canvas cleanup.
- [x] Security pass: token storage, CORS, rate limits on auth, input validation.
- [x] Error states and retry affordances across all data views.

**Deliverable:** the app remains usable through a network drop.

**Acceptance:** a check-in submitted offline appears after reconnect exactly once; Lighthouse accessibility and performance are both at least 90 on the Flight Deck; no console errors on any route.

---

### Phase 11 — Demo readiness and documentation

**Goal:** a reproducible demonstration.

- [x] `make reset-demo` creates the exact scripted state.
- [x] Demo Mode flag that hides developer-only affordances.
- [x] Finalize `docs/DEMO.md` with the three-minute script and expected screens.
- [x] Finalize `docs/SOURCES.md` with NASA HRP, OSDR, and DONKI citations.
- [x] Finalize `docs/API.md` and `docs/DESIGN.md`.
- [x] README: setup, architecture, data honesty statement, screenshots.
- [x] Seed screenshots for the README.
- [x] Full manual pass of the demo script from a clean database.

**Deliverable:** a clean clone reaches a working demo through documented commands.

**Acceptance:** the script runs end to end without touching code or the database; no dead links; all tests and lint pass.

---

## 9. Verification strategy

| Layer | What is tested | Tool |
|---|---|---|
| Engine | z-scores, weighting, thresholds, determinism | Pytest |
| Rules | each rule, overrides, alert dedupe | Pytest |
| API | auth, CRUD, permissions, privacy | Pytest |
| Credits | exactly-once awards, redemption | Pytest |
| UI utils | formatting, status mapping, baseline math | Vitest |
| Offline | service worker shell, queued check-in, exactly-once sync | Playwright |
| Quality | Lighthouse performance and accessibility on the Flight Deck | Lighthouse |
| Manual | every route, keyboard, reduced motion, offline | Review checklist |

The agent runs `make check` before presenting any phase for review. The owner reviews the running app at each gate, not the code.

### Review gates

| Gate | After | Owner checks |
|---|---|---|
| A | Phase 0 | Visual direction and styleguide |
| B | Phase 2 | Navigation, login, shell feel |
| C | Phase 4 | Flight Deck: the core "wow" |
| D | Phase 5 | A real check-in end to end |
| E | Phase 7 | Motivation loop and privacy behavior |
| F | Phase 9 | Assistant citations and camera measurement |
| G | Phase 10 | Offline queue, PWA shell, accessibility and performance |
| H | Phase 11 | Clean-database demo run |

---

## 10. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Anatomical map integration consumes effort | The `body-muscles` data is isolated in `AnatomyMap`; a simplified fallback can be swapped in without touching the Flight Deck |
| Light theme feels flat | Use whitespace, surface wells, and one accent. Do not add decorative effects to compensate |
| Status colors dominate | Keep pills soft, bars thin, and reserve solid red for Critical only |
| rPPG unreliable in demo lighting | Quality gate, manual fallback, and synthetic-signal verification across 54–108 bpm |
| Deferred LLM blocks assistant work | Rule-based fallback is the primary implementation; provider is an adapter |
| Deferred NASA key blocks context | Ship fixtures; the service abstracts the source |
| Scope creep | Committed vs. deferred lists in §1.4 and §1.5 are authoritative |
| Medical-advice liability | Guidance framing, citations, escalation copy, refusal path |
| Privacy harm from leaderboards | Rank consistency only; opt-in sharing; no health values exposed |
| Sync duplicates | Idempotency key per check-in; server-side uniqueness |

---

## 11. Data honesty statement

AstraHealth does not access live astronaut health data. NASA does not publish a real-time per-astronaut health API. The product uses:

- User-entered and camera-derived measurements.
- Simulated crew telemetry, clearly labeled as simulated in the UI and README.
- NASA OSDR and HRP publications as sources for reference ranges, countermeasures, and citations.
- NASA DONKI space-weather data as mission context, with fixtures when no API key is configured.

This statement appears in the README and in the Library footer.

---

## 12. Demo script

1. **Cold open** — MET clock, Mars transit, Commander at 78, status Caution.
2. **Anomaly** — HRV down for three nights, six hours of sleep debt. Click the chest; read the "why"; open the citation.
3. **Act** — complete the Systems Check in under two minutes; the report shows the status delta and one recommended countermeasure.
4. **Motivate** — +40 Flight Credits, streak preserved, rank progress, redeem Family Call, log updates.
5. **Crew** — review the privacy setting and the consistency board; run the Know Your Crew quiz.
6. **Credibility** — solar-event banner from mission context; offline queue syncs at the comms window; assistant answers with citations.
7. **Close** — "It doesn't just collect data. It tells an astronaut what to do next."

---

## 13. Open items (non-blocking)

- NASA API key — integrate behind the `nasa` service when provided.
- LLM provider and key — integrate behind the assistant provider interface when provided.
- Silhouette asset style — default to an abstract dot figure with a clean outline; swap the SVG without changing the sampling pipeline.
