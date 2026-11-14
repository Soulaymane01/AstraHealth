# API Contract

The source of truth is the FastAPI OpenAPI schema. While the API is running:

- Swagger UI — http://localhost:8000/docs
- ReDoc — http://localhost:8000/redoc
- Raw schema — http://localhost:8000/openapi.json

**Final status (Phase 11):** implemented endpoints are `/health`, `/auth/register`, `/auth/login`, `/auth/refresh`, `/me`, `/me/privacy`, `/metrics/definitions`, `/metrics/{code}/series`, `/measurements`, `/measurements/batch`, `/checkins`, `/checkins/{id}/report`, `/domains/{domain}`, `/mission`, `/mission/context`, `/mission/tape`, `/mission/log`, `/readiness`, `/readiness/history`, `/readiness/compute`, `/readiness/domains/{domain}`, `/alerts`, `/alerts/{alert_id}/ack`, `/crew`, `/crew/leaderboard`, `/training/catalog`, `/training/plan`, `/training/roster`, `/training/reminders`, `/training/sessions`, `/gamification/summary`, `/credits`, `/achievements`, `/rewards`, `/rewards/{code}/redeem`, `/redemptions`, `/streaks`, `/quizzes`, `/quizzes/{slug}`, `/quizzes/{slug}/submit`, `/knowledge`, `/knowledge/{slug}`, `/assistant/suggestions`, and `/assistant/ask`.

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

### Mission

| Method | Path | Purpose |
|---|---|---|
| GET | `/mission` | Mission profile, environment, and MET origin |
| GET | `/mission/context` | Latest cached space-weather event and active flag |
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

### Systems Check

| Method | Path | Purpose |
|---|---|---|
| POST | `/checkins` | Create a check-in, measurements, credit event, snapshot, and alerts in one transaction |
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

### Check-in measurement metadata

`POST /checkins` accepts an optional `meta` object per entry. The camera path sends `{ "source": "camera_rppg", "confidence": 0.0–1.0 }`; manual edits clear that metadata and store `source=manual`. Unknown sources fall back to `manual`, and confidence outside 0–1 is dropped.

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

`mode` is `rule_based` or `llm`. `refused` is `true` when the question asks for a diagnosis or prescription; the refusal still cites the red-flag article. Red-flag questions always return a rule-based escalation, even when an LLM is configured. Answers are capped at 120 words.
