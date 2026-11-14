# API Contract

The source of truth is the FastAPI OpenAPI schema. While the API is running:

- Swagger UI — http://localhost:8000/docs
- ReDoc — http://localhost:8000/redoc
- Raw schema — http://localhost:8000/openapi.json

**Final status (Phase 11):** implemented endpoints are `/health`, `/auth/register`, `/auth/login`, `/auth/refresh`, `/me`, `/me/privacy`, `/metrics/definitions`, `/metrics/{code}/series`, `/measurements`, `/measurements/batch`, `/captures`, `/captures/simulate`, `/checkins`, `/checkins/{id}/report`, `/domains/{domain}`, `/mission`, `/mission/profile`, `/mission/context`, `/mission/tape`, `/mission/log`, `/readiness`, `/readiness/history`, `/readiness/compute`, `/readiness/domains/{domain}`, `/alerts`, `/alerts/{alert_id}/ack`, `/crew`, `/crew/leaderboard`, `/training/catalog`, `/training/plan`, `/training/roster`, `/training/reminders`, `/training/sessions`, `/gamification/summary`, `/credits`, `/achievements`, `/rewards`, `/rewards/{code}/redeem`, `/redemptions`, `/streaks`, `/quizzes`, `/quizzes/{slug}`, `/quizzes/{slug}/submit`, `/knowledge`, `/knowledge/{slug}`, `/assistant/suggestions`, and `/assistant/ask`.

The frontend client is generated from the schema:

```bash
make client
# or
cd frontend && npm run generate:api
```

Regenerate after every contract change. Hand-written request/response types are not allowed.

---

## Conventions

- All endpoints except `POST /auth/*`, `GET /health`, and the read-only `GET /knowledge*` library require `Authorization: Bearer <access_token>`.
- Timestamps are ISO 8601 UTC.
- Errors return `{ "detail": "message" }`.
- List endpoints are paginated with `limit` and `offset` once data volume requires it.
- Health values are private by default. `GET /crew` exposes only what each user opted into via `share_status`.
- CORS allows only the local web origins (`localhost`/`127.0.0.1` on 5173 and the 4173 preview port). Credentials are token headers, not cookies.
- `POST /auth/register` is limited to 5 attempts per client per hour. `POST /auth/login` allows 5 failed attempts per client and email per 5 minutes; a successful login resets the counter. `POST /auth/refresh` allows 60 attempts per client per minute. Blocked requests return `429` with a `Retry-After` header.

---

## Endpoints

### System

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Service health and version |

### Authentication

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | Create an account |
| POST | `/auth/login` | Issue access and refresh tokens |
| POST | `/auth/refresh` | Rotate the access token |
| GET | `/me` | Current user profile |
| PATCH | `/me` | Update profile |
| GET | `/me/privacy` | Read sharing preference |
| PATCH | `/me/privacy` | Set `private`, `status_only`, or `full` |

### Crew

| Method | Path | Purpose |
|---|---|---|
| GET | `/crew` | Crew roster filtered by privacy |
| GET | `/crew/leaderboard` | Consistency ranking; no health fields |

### Flight surgeon

All routes require a `flight_surgeon` account. Medical access is intentionally broader than peer crew sharing; `share_status` controls the crew roster, not the surgeon.

| Method | Path | Purpose |
|---|---|---|
| GET | `/surgeon/crew` | Crew summaries: readiness, alerts, last capture, open instructions |
| GET | `/surgeon/crew/{id}` | Full clinical record: readiness, history, alerts, latest capture, measurements, check-ins, assessments, instructions |
| GET | `/surgeon/crew/{id}/metrics/{code}/series?days=7\|30\|90` | Trend series for one crew member |
| POST | `/surgeon/crew/{id}/captures/simulate` | Force a simulated capture and recompute readiness |
| GET | `/surgeon/crew/{id}/prediction` | Transparent 48–72-hour early-warning analysis with drivers, confidence, and monitoring suggestions |
| POST | `/surgeon/crew/{id}/assistant` | Clinical decision-support copilot; summarizes and explains but refuses diagnosis/prescription |
| POST | `/surgeon/crew/{id}/assessments` | Create a clinical assessment/diagnosis |
| POST | `/surgeon/crew/{id}/instructions` | Send a note, check-in request, or measurement request |
| POST | `/surgeon/crew/{id}/alerts/{alert_id}/ack` | Acknowledge a crew alert |

The prediction endpoint is deliberately transparent: it reports `risk_score`, `risk_level`, `horizon_hours`, `drivers` (metric, direction, severity, z-score, weekly trend, evidence), `recommendations`, `confidence`, `data_coverage`, `red_flags`, and a disclaimer. An active critical alert or red flag forces the high-risk band. It is an early-warning heuristic, not a diagnosis or a validated deterioration model.

The assistant endpoint returns the same cited-answer shape as the crew assistant. It is prompted to summarize the clinician’s record, explain early-warning signals, and suggest questions or monitoring; it refuses diagnosis, prescriptions, and doses. With `LLM_PROVIDER=none` it uses the deterministic cited engine; when configured, the LLM path is post-checked and falls back if the response is unsafe or empty.

When the prediction crosses a threshold, the backend creates one deduplicated AI follow-up instruction supervised by the flight surgeon. Instructions expose `source` (`surgeon` or `ai`), `protocol`, `target_metrics`, `due_at`, and `reason`. The crew can start the focused Systems Check from the request; a successful check-in closes it automatically. The same protocol is not reissued for 12 hours after completion.

### Crew-facing surgeon updates

| Method | Path | Purpose |
|---|---|---|
| GET | `/me/surgeon-updates` | Shared assessments and instructions for the signed-in astronaut |
| POST | `/me/surgeon-updates/{instruction_id}/ack` | Mark an instruction done |

### Mission

| Method | Path | Purpose |
|---|---|---|
| GET | `/mission` | Mission profile, environment, and MET origin |
| PATCH | `/mission/profile` | Set `mars_transit`, `lunar_surface`, or `station`; recomputes readiness with the profile weights |
| GET | `/mission/context` | Latest space-weather event and active flag, with `source` (`live` or `fixture`) and `fetched_at`; live DONKI is cached for 30 minutes |
| GET | `/mission/tape?days=7\|30` | Check-ins, alerts, training, commendations, allowances, and weather |
| GET | `/mission/log` | Personal feed of check-ins, alerts, training, achievements, and redemptions |

### Metrics and measurements

| Method | Path | Purpose |
|---|---|---|
| GET | `/metrics/definitions` | Metric catalog with units and ranges |
| GET | `/metrics/{code}/series?days=7\|30\|90` | Range points, baseline band, reference range, z/status, and stats |
| POST | `/measurements` | Record one or more measurements |
| GET | `/measurements?metric=&from=&to=` | Series for charts |
| GET | `/domains/{domain}?days=7\|30\|90` | Domain score and per-metric summaries |

### Sensor captures

| Method | Path | Purpose |
|---|---|---|
| GET | `/captures` | Latest simulated capture; creates one if the 5-minute cadence has elapsed, then recomputes readiness |
| POST | `/captures/simulate` | Force a new capture for the current user and recompute readiness |

Captures use `source=iss_capture`, `lunar_capture`, or `mars_capture` depending on the mission profile. They cover heart rate, HRV, blood pressure, orthostatic rise, SpO₂, core temperature, body mass, and exercise/bone load. Sleep, mood, stress, social contact, symptoms, strength, hydration, nutrition, vitamin D, glucose, and notes remain manual. The response includes `simulated: true`, `source_label`, `captured_at`, `next_capture_at`, and the metric batch.

### Systems Check

| Method | Path | Purpose |
|---|---|---|
| POST | `/checkins` | Create the check-in, measurements, credit event, streak, and achievements atomically; compute the readiness snapshot and alerts immediately after (best-effort) |
| GET | `/checkins` | History |
| GET | `/checkins/{id}` | One check-in |
| GET | `/checkins/{id}/report` | Systems Report with score delta, top factors, action, credits, and active alerts |

### Readiness and alerts

| Method | Path | Purpose |
|---|---|---|
| GET | `/readiness` | Current composite, domains, factors, fired rules |
| GET | `/readiness/history` | Snapshots over time |
| POST | `/readiness/compute` | Recompute and persist a snapshot |
| GET | `/readiness/domains/{domain}` | Per-metric detail for one domain |
| GET | `/alerts` | Active and historical alerts, each with an optional countermeasure and `knowledge_slug` |
| POST | `/alerts/{id}/ack` | Acknowledge an alert |

### Training

| Method | Path | Purpose |
|---|---|---|
| GET | `/training/catalog` | Items, domains, profiles, targets, and training/countermeasure kind |
| GET | `/training/plan` | Weekly plan, alert-linked countermeasures, adherence, streak, and recent sessions |
| GET | `/training/roster?date=` | Daily check-in, hydration, training, and sleep schedule |
| GET | `/training/reminders` | Due count and next due for the nav badge and top bar |
| POST | `/training/sessions` | Log a session with duration and RPE, award 30 FC, and update the streak |

### Gamification

| Method | Path | Purpose |
|---|---|---|
| GET | `/gamification/summary` | Balance, lifetime credits, rank, streaks, and counts |
| GET | `/credits` | Ledger entries, lifetime credited, spent, and balance |
| GET | `/achievements` | Commendations and unlock state |
| GET | `/rewards` | Mission allowances with `available`, `locked`, or `redeemed` state |
| POST | `/rewards/{code}/redeem` | Redeem an allowance and write the negative ledger entry |
| GET | `/redemptions` | Redemption history |
| GET | `/streaks` | Check-in and training streaks with grace state |

### Quizzes

| Method | Path | Purpose |
|---|---|---|
| GET | `/quizzes` | Available quizzes with best score and attempt count |
| GET | `/quizzes/{slug}` | Quiz questions without answer keys; eligible crew subjects |
| POST | `/quizzes/{slug}/submit` | Score answers, award first-completion credits, and return explanations |

### Knowledge

| Method | Path | Purpose |
|---|---|---|
| GET | `/knowledge?domain=` | Article index with domain, summary, source, citation, and `read_minutes` |
| GET | `/knowledge/{slug}` | Full article markdown with source URL, citation, and `read_minutes` |

### Assistant

| Method | Path | Purpose |
|---|---|---|
| GET | `/assistant/suggestions` | Context-aware suggested questions based on active alerts |
| POST | `/assistant/ask` | Cited answer from `{ "question": "..." }`; rule-based fallback when no provider |

### Check-in idempotency

`POST /checkins` accepts an optional `idempotency_key` (max 80 characters). A repeat request from the same user with the same key returns the existing check-in instead of creating another; a unique constraint enforces the same rule under concurrency. The offline queue reuses the original key on every retry, so reconnecting cannot duplicate a check-in.

### Check-in transaction and timestamps

The check-in, measurements, symptoms, credit event, streak, and achievements commit first. Readiness computation runs immediately after and is best-effort: if the engine fails, the health submission and credits are kept, and the report shows `insufficient_data` instead of losing the readings.

`started_at` is the time the check-in was actually taken. Measurement rows and the streak date use it, so an offline check-in synced later does not move readings or streaks to the reconnect day. Future timestamps more than five minutes ahead are clamped to server time.

### Readiness rules without a baseline

Hard rules are evaluated from the latest readings even when no personal baseline exists. A first-ever check-in that reports a red flag creates the alert (for example R1 and R7) but no composite score; the report returns `insufficient_data: true` with the active alerts. Sparse data below 50% of the mission profile weight never produces a reassuring `nominal`/`watch` score.

`GET /alerts` returns active alerts sorted by severity first (critical, caution, watch), then newest first within a severity.

### Check-in measurement metadata

`POST /checkins` accepts an optional `meta` object per entry. The camera path sends `{ "source": "camera_rppg", "confidence": 0.0–1.0 }`; auto-filled vitals send `iss_capture`, `lunar_capture`, or `mars_capture`; manual edits clear that metadata and store `source=manual`. Unknown sources fall back to `manual`, and confidence outside 0–1 is dropped.

---

## Assistant response shape

```json
{
  "answer": "Your latest HRV is 38.8 ms. The readiness engine places it 1.2 SD below your 21-day baseline...",
  "citations": [
    {
      "slug": "hrv-basics",
      "title": "Why HRV falls before you feel tired",
      "source_name": "NASA Human Research Program",
      "source_url": "https://www.nasa.gov/hrp/",
      "citation": "NASA Human Research Program — ..."
    }
  ],
  "suggestions": ["What should I do about sleep debt?"],
  "mode": "rule_based",
  "refused": false
}
```

`mode` is `rule_based` or `llm`. `refused` is `true` when the question asks for a diagnosis, prescription, medication, treatment, or dose; the refusal still cites the red-flag article. Red-flag questions always return a rule-based escalation, even when an LLM is configured. Answers are capped at 120 words. Question-specific citations lead; active-alert citations are a fallback.
