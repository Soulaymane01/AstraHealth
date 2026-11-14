# AstraHealth — Product & Engineering Audit

**Date:** 2026-11-14  
**Scope:** full repository (`backend/`, `frontend/`, `docs/`, seed/demo, tests) and the running app.  
**Method:** code review, live API probing, Playwright checks, axe-core WCAG scan, Lighthouse on the production build, and the project's own `make check` + smoke suite. No source files were modified.

**Snapshot:** commit `46a4489` · 66 backend tests · full Playwright smoke suite · live demo at `localhost:5173` / `localhost:8000`.

---

## P0 remediation status — implemented

The P0 engineering/demo items below were fixed after this audit. Deployment, video, screenshots, and submission packaging were intentionally deferred.

| P0 item | Status | What changed |
|---|---|---|
| First-use red flags ignored | ✅ Fixed | Hard rules now run before the baseline gate; a rule-only result persists alerts without a snapshot. Verified with a new account: temp 38.5 °C, HR 120, chest pain → **R1 + R7 alerts**. |
| Sparse data can read 100/Nominal | ✅ Fixed | Added a 50% profile-weight coverage gate; sparse nominal/watch results are suppressed, low scores and fired rules still return. |
| Alerts fail open / wrong next action | ✅ Fixed | `fetchAlerts` throws on non-2xx; Flight Deck shows “Alerts are unavailable” + retry, never “No active alerts”; backend sorts by severity then recency. Verified with a simulated alerts outage. |
| 390 px overflow on `/check-in` and `/training` | ✅ Fixed | Added `min-w-0`/intrinsic-width constraints; all nine routes now report `scrollWidth === clientWidth` at 390 px. |
| Body map below the fold / faint | ✅ Fixed | Body map is the desktop hero, larger (480 px), stronger status tints (0.32/0.55), legend added; readiness is first on mobile. |
| Demo drift / verify false failure | ✅ Fixed | `demo-verify` accepts day ≥ 41 and prints a reset hint after day 43; demo reset still verifies day 42. |
| 30-minute session expiry | ✅ Fixed | Client now does single-flight 401 → refresh → retry. Verified with a forged expired access token: token rotated, page loaded, no logout. |
| Camera can reactivate after Cancel | ✅ Fixed | Added a run-generation token checked after every await; stale starts stop tracks and close the landmarker. |
| Offline check-ins timestamped at sync | ✅ Fixed | Measurements and streak dates use `started_at`; future timestamps clamp; late check-ins cannot rewind a streak. Tested. |
| Medication questions not refused | ✅ Fixed | Added drug/treatment/dose terms; refusal now explicitly covers medications. Verified live with ibuprofen. |
| Seed check-in reports insufficient | ✅ Fixed | Seed computes a snapshot at each check-in’s `completed_at`; seeded reports now return scores. Verified. |
| Readiness failure discards check-in | ✅ Fixed | Check-in, measurements, credits, streak, and achievements commit first; readiness is best-effort with a logged failure. Tested. |
| Default JWT secret | ✅ Fixed | Added a non-local startup guard; generated a 64-character secret in `.env`; `.env.example` documents rotation. |
| Citation ordering | ✅ Fixed | Question-specific articles now lead; “bone loss” returns `bone-loading` first. Tested. |
| Mobile axe issues | ✅ Fixed | Removed `richColors`, made mission tape and suggestion rails focusable, added focus restore and a skip link. Axe: **0 violations on desktop and mobile**. |
| `robots.txt` / SEO | ✅ Fixed | Added `frontend/public/robots.txt`. |

**Post-fix verification:** `make check` exit 0 · **72 backend tests** · full Playwright smoke suite · **0 axe WCAG A/AA violations** on 9 desktop routes and mobile · `make demo-verify` all PASS on day 42.

**Deferred by request:** hosted demo, video, submission screenshots, LICENSE/CI/Dockerfiles.

---

## P1 remediation status — first batch

| P1 item | Status | What changed |
|---|---|---|
| No live NASA DONKI | ✅ Implemented | `services/nasa.py` fetches notifications with a 30-minute cache, maps type/severity/time, upserts locally, falls back to the seeded event on key/network/rate-limit failure, and exposes `source` + `fetched_at`. UI labels **Live NASA DONKI** vs **Demo fixture**. |
| R7 cleared by a newer symptom-free check-in | ✅ Fixed | Symptoms are unioned over the recent 3-day window instead of only the latest check-in. |
| No offline clinical data | ✅ Implemented | Last readiness, alerts, mission, context, tape, history, and selected domain detail are cached per user in `localStorage`, hydrated as query initial data, labelled “last synced,” and cleared on logout. Verified with an offline production reload: the full Flight Deck renders. |
| Telemetry range switch blanks the page | ✅ Fixed | `keepPreviousData` on metric/domain queries + “Updating…” indicator. |
| Training form opens above the viewport | ✅ Fixed | The form scrolls into view and focuses its first field; reduced motion respected. |
| Wizard steps lose context | ✅ Fixed | Step changes scroll to the step panel and focus its heading; reduced motion respected. |
| No flight-surgeon export | ✅ Fixed | Systems Report has an **Export JSON** action with source/guidance metadata. |
| No route error recovery / titles | ✅ Fixed | Route error element, per-route document titles, and scroll restoration. |
| DONKI/offline claims in docs | ✅ Updated | README, API, SOURCES, DEMO, and `.env.example` now match the implementation. |

**Verification:** `make check` exit 0 · **77 backend tests** · full smoke suite · offline cached reload verified · `make demo-verify` all PASS.

**Remaining P1 backlog:** 48 px targets + microcopy sizes, silent empty states on auxiliary queries, privacy scope for activity counts, stale-readiness TTL, measurement bounds, Vitest/CI, Redis rate limiting/refresh rotation, PWA precache trim, dead-code/docs cleanup, emergency triage card, mission-profile switcher, PDF export.

---

## P2 remediation status — demo-relevant batch

| P2 item | Status | What changed |
|---|---|---|
| Emergency triage card | ✅ Implemented | New `/triage` protocol with ordered immediate actions, active alerts, next comms window, current state, and a copyable flight-surgeon handoff. Critical alerts show a red banner on the Flight Deck and a triage button in Next action. |
| Mission-profile switcher | ✅ Implemented | `PATCH /mission/profile` updates Mars transit / lunar surface / station, recomputes readiness with profile weights, and updates comms delay + training plan. Commander sees an Environment selector. |
| PDF export | ✅ Implemented as print | Systems Report **Print / Save PDF** with print CSS; the app chrome is hidden and panels remain readable. JSON export remains. |
| Duty Roster reminders | ✅ Implemented as calendar export | **Calendar** downloads today’s roster as an `.ics` file with the check-in, hydration, training, and sleep blocks. No notification permission or server scheduler required. |
| Install prompt | ✅ Implemented | In-app **Install app** action appears when the browser fires `beforeinstallprompt`. |
| Docs | ✅ Updated | README, API, DEMO, and this audit include triage, environments, print, calendar, and install. |

**Deliberately skipped (stretch, not demo-critical):** push notifications (calendar export is more reliable), live OSDR/POWER ingestion, voice journal, wearable import, i18n, dark mode, and self-hosted camera assets. These would add scope without improving the three-minute story.

**Verification:** typecheck/build pass; 77 backend tests; profile switch, triage, `.ics` download, offline cache, and print controls manually verified.

### Post-audit feature: automatic sensor captures

Added after the audit to match the “astronaut does not type vitals” requirement:

- `GET /captures` lazily creates a simulated capture every five minutes; `POST /captures/simulate` forces one.
- Captures use `iss_capture`, `lunar_capture`, or `mars_capture` according to the mission profile and cover heart rate, HRV, blood pressure, orthostatic rise, SpO₂, temperature, body mass, and exercise/bone load.
- Sleep, mood, stress, social contact, symptoms, strength, hydration, nutrition, vitamin D, and glucose remain manual.
- The Flight Deck shows an **Automatic sensor capture** strip with source, age, values, a **Simulated** label, and **Capture now**. The Systems Check pre-fills vitals and load from the latest capture, greys them out with a lock + **Captured** chip, and provides one global **Override captures** toggle. Manual edits clear the capture metadata; the metadata keeps the capture source otherwise.
- Mission-profile changes force a capture from the new environment and recompute readiness.

**Verification:** 83 backend tests; smoke, typecheck, build, mobile layout, and axe pass.

### Post-audit feature: Flight Surgeon console

- Added a `flight_surgeon` role and demo account `surgeon@astra.space` (no crew assignment).
- Added a dedicated Earth-side console at `/surgeon`: crew roster with readiness, alert, capture, and instruction status; full clinical record; metric trends; capture and measurement tables; alert acknowledgement; capture simulation.
- Added clinical assessments (diagnosis, findings, plan, follow-up, share-with-crew) and crew instructions (note, check-in request, measurement request) with a crew-facing panel on the Flight Deck and a “Mark done” acknowledgement.
- Added `SurgeonAssessment` and `SurgeonInstruction` tables with an Alembic migration, seeded surgeon/assessment/instruction data, and role-guarded `/surgeon` endpoints.
- Crew visibility settings remain peer controls; medical console access is separate and documented.

**Verification:** 87 backend tests; smoke, typecheck, build, and axe pass; the surgeon console and crew panel were exercised in the browser.

### Post-audit feature: early warning and Clinical Copilot

- Added a transparent prediction service (`services/prediction.py`): baseline z-scores, 7-day slopes, active-alert weights, red-flag overrides, confidence/data coverage, and ranked drivers for a 48–72-hour horizon.
- Added `/surgeon/crew/{id}/prediction` and risk fields on the crew summary, so the roster shows early-warning level and horizon.
- Added `/surgeon/crew/{id}/assistant`: a surgeon-facing, cited decision-support copilot. It summarizes readiness, alerts, captures, check-ins, and early-warning drivers; refuses diagnosis, prescriptions, and doses; deterministically cites HRP articles; optional LLM path has a post-check and falls back safely.
- The console adds early-warning badges to the roster, a banner, a detailed Copilot tab with the risk card, suggested questions, chat, citations, and the refusal path. The crew-facing assistant is unchanged.
- The prediction is explicitly not a validated deterioration model or a diagnosis; clinical judgment remains with the surgeon.

**Verification:** prediction and assistant tests plus the full suite; browser flow for risk badge, Copilot risk answer, citations, and refusal.

---

## 1. Verdict

AstraHealth is a **top-tier hackathon build**. It directly answers the NASA challenge, it is visually distinctive, it has a complete measure → understand → act → motivate loop, and its engineering quality is far above the typical Space Apps submission.

It is currently a **strong 8.5/10 project**. The gaps that keep it from being a 9.3–9.5 are concentrated and fixable:

1. A handful of **safety/correctness edge cases** in the health logic.
2. A few **demo-breaking UX bugs** on mobile and during long sessions.
3. **Submission readiness** — no hosted demo, no video, no license, no CI.
4. **NASA-data depth** — the documented live DONKI integration does not exist.
5. The **signature feature (body map) is below the fold** and visually faint.

None of these require a rewrite. Most are one-day fixes.

---

## 2. Scorecard (official Space Apps criteria)

| Criterion | Score | Assessment |
|---|---:|---|
| **Impact** | **9 / 10** | Directly addresses self-assessment, triage, countermeasures, and escalation on long-duration missions. Genuine astronaut need. |
| **Creativity** | **8.5 / 10** | Body map + readiness ring + mission tape + Flight Surgeon + credit loop is a distinctive combination. The body map is buried, which hides the most original element. |
| **Validity** | **7 / 10** | Deterministic, explainable engine and good tests. But sparse data can score 100, first-use red flags are missed, citations are generic, and there is no live NASA feed. |
| **Relevance** | **9.5 / 10** | Maps all five HRP hazards, uses 24 spaceflight-relevant indicators, covers Mars/lunar/station profiles, and closes the loop from reading to action. |
| **Presentation** | **8.5 / 10** | Calm clinical visual language, coherent copy, docs and a 3-minute script. Hero below the fold, dense first screen, and no demo video yet. |

**Overall: 8.5 / 10 today → 9.3+ with the P0 checklist.**

Award-category strategy:

- **Best Use of Science** — strongest if citations are deepened and a methods/limitations page is added.
- **Best Use of Technology** — strongest if the offline PWA, on-device rPPG, and explainable engine story is front and center.
- **Galactic Problem Solver** — strongest if the mission-impact narrative leads.
- **Best Use of Data** — currently the weakest story; needs live DONKI and ideally OSDR/POWER.

---

## 3. What is strong

1. **Challenge fit is excellent.** The app covers all five HRP hazards: radiation (article + space-weather context), isolation/confinement (mood, stress, social interaction, crew quiz), distance from Earth (comms delay, offline queue), gravity fields (bone load, resistance, fluid shifts), hostile closed environment (immune, temperature, symptoms).
2. **Explainable readiness is the best idea in the product.** The 21-day personal baseline, z-scores, domain weights, top contributing factors, and hard-rule overrides make the score auditable instead of a black box. The UI shows “Why this score?” and the factors in standard deviations.
3. **The loop is complete.** Check-in → Systems Report → recommended action → linked countermeasure → training session → credits/streak/rank → Mission Log. Most hackathon health apps stop at a dashboard; this one tells the astronaut what to do next.
4. **The body map is a genuine differentiator.** 70+ regions, front/back views, domain mapping, status tints, and a keyboard-accessible Systems list. The execution (placement/contrast) needs work, but the concept is right.
5. **Offline-first is real engineering, not a slide.** IndexedDB drafts, a per-user queue, idempotency keys, exactly-once sync on reconnect, and an explicit offline banner. The smoke suite verifies “synced exactly once.”
6. **Camera pulse is a memorable demo moment.** MediaPipe FaceLandmarker runs on-device, with signal-quality gating and a manual heart-rate fallback. It is optional and private.
7. **Safety and privacy are designed in.** Guidance-not-diagnosis copy, refusal path, red-flag escalation, consent-gated crew quiz, no health values in the leaderboard, no in-app chat, and a persistent Demo badge.
8. **Engineering quality is high.** Typed FastAPI → OpenAPI → TypeScript client, SQLAlchemy/Alembic, atomic check-in transaction, 66 backend tests, strict TS, route-level code splitting, and a full smoke suite.
9. **Reliability for judges.** No NASA key or LLM key is required. The demo runs entirely locally with fixtures and a deterministic assistant.
10. **Design and accessibility foundations.** Calm clinical palette, no dark-console clichés, status always has color + word (+ icon), reduced-motion support, labeled inputs, focus-visible rings. Axe reports **0 WCAG A/AA violations on nine desktop routes**; Lighthouse reports **100 accessibility**.

### Verified quality signals

| Check | Result |
|---|---|
| `make check` | ✅ exit 0 — Ruff, oxlint, 66 pytest, TypeScript, Vite build |
| Playwright smoke | ✅ full suite passed (shell, check-in, report, offline exactly-once, assistant, crew, training, mobile drawer, session recovery) |
| axe-core, 9 desktop routes | ✅ 0 WCAG A/AA violations |
| Lighthouse, production login | ✅ 97 performance · 100 accessibility · 96 best-practices · 91 SEO |
| Alembic model drift | ✅ “No new upgrade operations detected” |
| Demo verify after reset | ✅ all checks pass (mission day 42, 4 crew, 2 alerts, catalog) |

---

## 4. What is weak

Priorities are based on **demo impact × user safety × submission readiness**.

### P0 — Fix before the demo / submission

#### 4.1 First-use red flags are silently ignored (critical safety bug)

`compute_readiness()` returns `None` when no domain has a baseline, **before** the hard rules are evaluated (`backend/app/services/readiness.py:425-426` vs `:485-491`). The check-in endpoint then stores no snapshot and no alerts.

**Verified live:** a brand-new account submitted `body_temp_c = 38.5`, `heart_rate = 120`, and “chest pain” severity 7. Result:

- `GET /alerts` → `[]`
- `GET /readiness` → `404 “Not enough measurements”`
- report → `insufficient_data: true`, `alerts: 0`

This contradicts the product’s central promise: red flags never wait for a trend. A first check-in is exactly when a real astronaut has no baseline.

**Fix:** evaluate hard rules from `latest_values` before the baseline gate; persist alerts (and an alert-only snapshot) even when no composite score exists; add a no-baseline red-flag test.

#### 4.2 One normal reading can produce “100 / Nominal”

Weights are renormalized over whichever domains have data (`readiness.py:433-439`), and `tests/test_readiness_engine.py:42-51` explicitly asserts that two cardiovascular metrics alone produce `100.0 / nominal`. A single heart-rate reading can therefore “clear” an astronaut.

**Fix:** add a data-coverage gate (e.g. require ≥50% of profile weight or ≥3 domains); expose `coverage` in the API/UI; label sparse results “insufficient data” instead of nominal. This also makes scores comparable across users.

#### 4.3 Alerts fail open, and “Next action” uses the newest alert, not the sickest

`frontend/src/features/alerts/queries.ts:7-12` returns `[]` for any HTTP/API failure. The Flight Deck then shows “No active alerts. Keep the current routine.” (`FlightDeckPage.tsx:539`) and uses `alerts[0]` for “Next action” (`:497`). The backend sorts newest-first (`backend/app/api/alerts.py:25`).

**Impact:** during an API hiccup the crew sees false reassurance; a new Watch alert can mask an older Critical one.

**Fix:** throw on non-2xx and render an explicit “alerts unavailable” state; sort by severity, then time; use the highest-severity alert for Next action.

#### 4.4 Core mobile pages overflow horizontally

At a 390 px viewport:

| Route | `scrollWidth / clientWidth` | Visible result |
|---|---:|---|
| `/check-in` | **461 / 390** | Vital input cards cut off on the right; units/hints off-screen |
| `/training` | **529 / 390** | Training-plan cards cut off; “Log” buttons land off-screen and are hard to tap |

This is the primary data-entry ritual and the training loop on the device astronauts would actually use. `docs/PLAN.md` claims usability at 390 px; the smoke suite only checks the mobile drawer, not page layout.

**Fix:** add `min-w-0` to grid/flex children, constrain input/card min-content, and add 390 px layout assertions to the smoke suite.

#### 4.5 The signature body map is below the fold and too faint

At 1440×900 the first screen is readiness + alerts; the body map starts around 1,000 px down and the figure is pale gray/green (`flightdeck_full.png`). The left column also has a large empty gap because the alert column is taller.

**Impact:** judges may never see the most distinctive feature; the map reads as decoration rather than a health instrument.

**Fix:** make the body map the hero (top-left or centered beside the ring), increase the figure size 25–40%, raise status tint opacity (e.g. 0.25–0.45), add a visible legend, and balance the two columns.

#### 4.6 No hosted demo, video, license, CI, or Dockerfiles

- `README.md` is local-only: `make install` / `make start`.
- No `Dockerfile` for API or web; `docker-compose.yml` only runs Postgres.
- No `.github/workflows`; no CI badge.
- No `LICENSE` (Space Apps submissions should be open source).
- No demo video or public URL.
- The production build defaults to `http://localhost:8000` (`frontend/src/lib/api/client.ts:5`); only `build:phone` uses `/api`.

**Impact:** judges may not run the project; a local-only submission is a presentation risk even when the code is excellent.

**Fix:** deploy API + web + Postgres (HTTPS), seed the demo, and add the URL to the README/submission. Record a 2–3 minute video. Add MIT/Apache-2.0 license, Dockerfiles, and a CI workflow.

#### 4.7 Demo drift and test mutation

The seed sets mission start to `now - 42 days`, but `make seed` is idempotent. Six days later the app showed **day 48** and `make demo-verify` failed. The smoke suite also creates check-ins/redeems rewards, so running it mutates the scripted demo.

**Fix:** run `make reset-demo` immediately before judging; make `verify_demo` tolerant of elapsed days or seed against a fixed reference; never run smoke after reset; add a `make demo` runbook.

#### 4.8 Sessions die after 30 minutes despite a valid refresh token

The 401 handler logs out immediately (`frontend/src/app/App.tsx:22`, `client.ts:50`). Refresh only happens during bootstrap (`auth-store.ts:143-165`). With `JWT_ACCESS_MINUTES=30`, a long demo or judging session is forcibly signed out.

**Fix:** single-flight 401 → refresh → retry the original request; log out only if refresh is rejected.

#### 4.9 Camera can reactivate after Cancel/unmount

`PulseCamera.start()` awaits `getUserMedia`, `video.play()`, and model loading without a cancellation guard (`PulseCamera.tsx:237-300`). `reset()`/unmount only stops a stream already in `streamRef`. Cancelling during permission/model load can turn the camera back on and leak the stream.

**Fix:** generation token or `AbortController` checked after every await; stop all tracks in `finally`; ignore late state updates.

#### 4.10 Offline check-ins are timestamped when they sync, not when taken

The frontend sends `started_at` (`checkin-form.ts:160`), but the backend uses server `now` for every measurement and the derived symptom score (`backend/app/api/checkins.py:105,153,168`). Baselines, trends, and streaks shift to the reconnect day; R7 also searches backward from `started_at`, so old offline symptoms can be ignored.

**Fix:** use validated `started_at` for measurements and streak dates; keep server time only for `completed_at`; reject future timestamps; add an offline-delay test.

#### 4.11 Medication questions are not refused

`REFUSAL_TERMS` covers “diagnose”, “prescribe”, “dosage”, “what medication”, etc. **Verified live:** “Can I take ibuprofen for my headache?” returned a readiness summary instead of a refusal. That is a medical-safety and credibility risk in front of judges.

**Fix:** add drug names and treatment verbs (“take”, “medicine”, “drug”, “pill”, “tablet”, “dose”, “mg”, “antibiotic”, “painkiller”) to a medication intent; return a clear “flight surgeon owns medication decisions” refusal; add tests.

#### 4.12 Seeded check-ins cannot produce reports

Seed check-ins have entries and symptoms but no `Measurement` rows, and snapshots are written at `now - N days`, not at each check-in’s `completed_at` (`db/seed.py:342-363`, `:719-730`). The report lookup requires a snapshot within ±2 seconds (`api/checkins.py:259-269`). **Verified:** seeded check-ins 1–3 all return `insufficient_data: true`.

**Fix:** seed measurements from entries and compute a snapshot at `completed_at`; add a seed → report test.

#### 4.13 A readiness-engine failure discards the health submission

The check-in, measurements, symptoms, credits, streak, achievements, and snapshot are one transaction (`checkins.py:188-205`); any engine exception rolls everything back. An analytics bug can destroy a health record.

**Fix:** commit the check-in first; compute readiness in a separate transaction/outbox with retry; return the report with an explicit “readiness pending” state if the engine fails.

#### 4.14 The LLM path sends health data externally without output validation

When `LLM_PROVIDER=openai`, the prompt includes metrics and alerts and is sent to an external endpoint (`services/assistant.py:500-557`). Any non-empty response is accepted as `mode=llm`; there is no post-filter for diagnosis/red flags and citations are attached from local context regardless of what the model said.

**Fix:** minimize/redact context, require consent/notice, validate output against refusal/red-flag rules, and verify citations. Keep red-flag answers rule-based.

#### 4.15 Default JWT secret is in use

`config.py:21` and `.env.example:6` ship `astra-local-dev-secret-change-me`; the local `.env` copied it. Tokens live in `localStorage`. On a LAN/tunneled demo, anyone with the repo can forge tokens.

**Fix:** fail startup if the default secret is unchanged in non-local environments; generate and store a per-deployment secret; prefer HttpOnly cookies for a hosted demo.

### P1 — High leverage before or right after submission

| Area | Issue | Fix |
|---|---|---|
| Offline data | Offline reload shows the shell but **no last readiness/alerts/readings** (verified). The copy says “last readings will refresh” but nothing is cached. | Persist a user-scoped read-only query cache in IndexedDB with “last synced” timestamps; or explicitly say “no cached clinical data.” |
| NASA data | `NASA_API_KEY` is documented as enabling live DONKI, but **no DONKI client exists**; `grep` finds only the unused config key and seeded events. | Implement a cached DONKI fetch with timeout/fallback; label “Live” vs “Fixture.” Or correct the docs. |
| Citations | All 9 articles cite the HRP homepage or roadmap index, not specific evidence reports. Assistant citations are alert-first, so “bone loss” cites isolation/sleep before bone loading (`_article_slugs`). | Add specific HRP evidence pages/DOIs and per-metric sources; rank intent-specific articles first, then alerts; add a Methods & Limitations page. |
| Assistant UX | Answers arrive off-screen; no `aria-live`; sends are silently ignored while pending. | Auto-scroll, live status, disable with `aria-busy`, render errors distinctly. |
| Telemetry | Changing 7/30/90 blanks the whole page (`MetricDetailPage.tsx:85`, `DomainSummaryPage.tsx:64`). | `placeholderData: keepPreviousData`; skeleton only the chart. |
| Training form | The log form opens above the plan, far from the clicked card; on mobile the click can be blocked by overflow. | Use a drawer/dialog or scroll+focus the form; announce opening. |
| Wizard | Step changes don’t scroll/focus; mobile next-step header can be mid-scroll. | Scroll/focus the step heading; `role="alert"` for errors; focus first invalid field. |
| Redemption | One-click “Redeem” with no confirmation; backend check-then-act has no unique `(user, reward)` constraint. | Confirm dialog, pending guard, unique constraint + lock. |
| Targets | Buttons are 36/32 px, nav links 36 px, chips ~24 px; docs claim 48 px “gloved hand” targets. | Raise primary controls to 44–48 px; reserve 10–11 px text for nonessential metadata. |
| Fonts | Lighthouse: **56.5% of text below the legible-size threshold**; 259 uses of 9–11 px. | 12–14 px minimum for captions; 16 px body. |
| Privacy | `private` hides readiness but still exposes check-in/training counts and consistency (`services/crew.py:92-114`). | Add an activity-sharing scope or explain it in the privacy UI. |
| Rate limiting | In-memory, per-process; resets on reload; behind a tunnel all users share one register budget. | Redis/shared store; per-IP + per-account buckets; trusted-proxy handling. |
| Refresh tokens | 14-day tokens are reusable; no rotation/revocation. | Rotate with `jti` reuse detection; token versioning. |
| Measurement API | `MeasurementCreate.value: float` has no finite/range checks; impossible values can poison baselines. | `allow_inf_nan=False`, per-metric hard bounds, implausible-value warnings. |
| R7 | Only the latest check-in’s symptoms are considered; a newer symptom-free check-in can clear an earlier chest-pain alert. | Aggregate over a bounded window; require explicit resolution for red flags. |
| Stale readiness | `GET /readiness` returns the latest snapshot forever; domain detail recomputes. | TTL/on-read compute; expose `computed_at`; invalidate on measurement writes. |
| Tests | No tests for no-baseline red flags, medication refusal, offline timestamps, seed reports, refresh misuse, concurrent redemption, Postgres migrations, or 390 px layout. | Add these; run CI against Postgres and a 390 px viewport. |
| Frontend tests | `package.json` has no test script or Vitest despite docs claiming Vitest. | Add Vitest for `ppg.ts`, `checkin-form.ts`, queue/sync, formatting. |
| PWA | Precaches 1.74 MB including Styleguide, vision bundle, and 11 font subsets; camera WASM/model still need the internet. | Exclude unused assets; runtime-cache on demand; self-host model if camera is demo-critical. |
| SEO/polish | No `robots.txt` (SPA fallback returns HTML, 59 Lighthouse errors); SEO 91. | Add `public/robots.txt`, per-route titles/meta. |
| Route errors | No `errorElement` on the router; a stale/offline chunk can drop users on React Router’s default screen. | Add a route error UI with reload/retry. |
| Accessibility | No skip link/main focus; static page title; mobile drawer doesn’t restore focus; `aria-expanded` missing on the nav trigger; mobile login has a toast contrast failure and an unfocusable scroll region. | Add skip link, route title/focus management, focus restore, `aria-expanded`, fix toast contrast, `tabIndex=0` on scroll regions. |
| Empty states | `crew`, `telemetry`, `gamification`, and `mission` queries return `[]` on failure, showing “No crew / No metrics / No ledger” instead of an error. | Throw on non-2xx; use the existing `QueryError` component. |
| Self-registration | New users get a graceful “No mission assigned” page but four console 404s and a Training badge. | Assign a sandbox crew or disable open registration in demo. |
| Source maps | `build.sourcemap: true` ships ~9 MB of dist and exposes source in production. | Disable or hide maps for the hosted build. |
| Time | Greeting and comms windows use device-local time; no UTC/MET label. | Use mission/UTC time and label it. |
| Dead code/docs | `CrewNudge`/`crew_nudges` remains despite “nudges removed”; docs claim Vitest, live DONKI, and Lighthouse 100 (measured 97 on login); `LibraryPage` hardcodes “Nine articles.” | Remove dead models, reconcile docs with reality, derive counts from data. |

### P2 — Nice to have

- Push/local notifications for the Duty Roster (currently in-app only).
- PDF/JSON Systems Report export for flight-surgeon handoff.
- One-tap **emergency triage card** (red flag → stop, monitor, comms, next steps) — a strong differentiator.
- Mission-profile switcher (Mars transit / lunar surface / station) to show adaptability; weights already exist, only Mars is seeded.
- OSDR dataset/analog context or NASA POWER environment data for “Best Use of Data.”
- Install prompt and offline-camera assets.
- Voice journal / speech sentiment (deferred idea).
- Wearable/device import.
- i18n and dark mode only if they serve the demo.

---

## 5. Hackathon strategy

### The one-liner

> **AstraHealth is mission-control software for the human body: it turns 24 spaceflight health indicators into an explainable readiness score, tells the astronaut the next action, and escalates red flags — offline, on-device, and without ever diagnosing.**

### The narrative that wins

1. **The problem:** on a Mars transit, the astronaut is the most critical system and the flight surgeon is 14 minutes away.
2. **The insight:** existing health apps show numbers; astronauts need an **explainable decision** — what changed, why, what to do, and when to escalate.
3. **The proof:** the body map/readiness ring, the “Why this score?” factors, the red-flag rules, and the countermeasure link.
4. **The engineering:** offline-first, exactly-once sync, on-device rPPG, typed API, tests, accessibility.
5. **The honesty:** simulated crew, real NASA HRP citations, guidance not diagnosis.

### What to emphasize to judges

- The score is **auditable**, not a black box.
- The app says **“insufficient data”** instead of inventing a score.
- The social layer **never ranks health values**; privacy is enforced.
- The offline queue syncs **exactly once**.
- The camera runs **on-device** and always yields to manual entry.

### What to avoid saying

- “AI diagnoses” — it does not, and should not.
- “Live NASA astronaut data” — it does not exist.
- “Clinically validated” — it is not.
- “Fully offline” — the shell and drafts are; clinical data is not cached yet.

---

## 6. Prioritized checklist

### P0 — before the next demo / submission (target: 1–2 days)

- [ ] **Evaluate hard rules without a baseline.** Move rule evaluation before the `domain_values` gate; persist alerts (and an alert-only snapshot); add a first-check-in red-flag test. **(4–6 h)**
- [ ] **Add a readiness coverage gate.** Require ≥50% of profile weight or ≥3 domains; expose `coverage`; label sparse results “insufficient data.” **(4 h)**
- [ ] **Fix alerts fail-open and severity ordering.** Throw on non-2xx; sort by severity then time; use the highest-severity alert for Next action; add an “alerts unavailable” state. **(2–3 h)**
- [ ] **Fix 390 px overflow** on `/check-in` and `/training`; add `min-w-0`/`w-full` constraints; add a mobile layout smoke check. **(3–4 h)**
- [ ] **Make the body map the hero.** Move it above the fold, enlarge it, raise tint opacity, add a legend, balance the columns. **(4–6 h)**
- [ ] **Deploy a public demo** (API + web + Postgres, HTTPS) and seed it; add the URL to the README. **(1 day)**
- [ ] **Record a 2–3 minute video** following `docs/DEMO.md`; upload and link it. **(2–3 h)**
- [ ] **Add `LICENSE` (MIT/Apache-2.0), Dockerfiles, and CI** (Ruff, pytest, typecheck, build, smoke). **(4–6 h)**
- [ ] **Make the demo reproducible:** `make reset-demo` + `make demo-verify` before judging; make verify tolerant of elapsed mission days or pin a reference. **(2 h)**
- [ ] **Fix assistant medication refusal** and add tests; put intent-specific citations first. **(2–3 h)**
- [ ] **Fix session refresh**: single-flight 401 → refresh → retry; log out only on refresh rejection. **(2 h)**
- [ ] **Fix camera cancellation/leak**: generation token, stop tracks in `finally`. **(2 h)**
- [ ] **Use `started_at` for offline check-in timestamps**; add a delayed-sync test. **(2–3 h)**
- [ ] **Require a non-default JWT secret**; disable open registration or assign a sandbox crew. **(1–2 h)**
- [ ] **Add `robots.txt` and per-route titles/meta.** **(1 h)**
- [ ] **Fix the mobile axe issues** (toast contrast, scrollable region focus). **(1 h)**

### P1 — high leverage (target: 2–4 days)

- [ ] Implement cached **NASA DONKI** with timeout/fallback and a “Live/Fixture” label (or correct the docs). **(4–6 h)**
- [ ] Add **specific HRP evidence citations** and a **Methods & Limitations** page; map each metric to a source and evidence strength. **(1 day)**
- [ ] Cache the last **readiness, alerts, and readings** for offline reload with “last synced” timestamps. **(1 day)**
- [ ] Add the **emergency triage card** and link it from every red-flag alert. **(4–6 h)**
- [ ] Add a **mission-profile switcher** (Mars/lunar/station) or a profile preview. **(4–6 h)**
- [ ] Add **PDF/JSON report export** for flight-surgeon handoff. **(4 h)**
- [ ] Fix **telemetry range switching** (`keepPreviousData`) and **training form placement** (drawer/anchor). **(3–4 h)**
- [ ] Add **wizard step focus/scroll** and live error summaries. **(2–3 h)**
- [ ] Add **redemption confirmation**, pending guard, and a DB unique constraint. **(2 h)**
- [ ] Add **privacy scope for activity counts** or explain it in the UI. **(2–3 h)**
- [ ] Raise **48 px targets** and minimum font sizes; add a skip link and focus management. **(4–6 h)**
- [ ] Add **Vitest** for PPG/draft/queue and **Postgres** migration CI; add 390 px + axe checks. **(1 day)**
- [ ] Move rate limiting to **Redis** and add refresh rotation/security headers for the hosted demo. **(4–6 h)**
- [ ] Fix **silent empty states** across crew/telemetry/gamification/mission; use `QueryError`. **(2–3 h)**
- [ ] Add **route error boundaries**, per-route titles, and focus management. **(2–3 h)**
- [ ] Trim the **PWA precache**; disable production source maps. **(1–2 h)**

### P2 — polish / stretch

- [ ] Push/local reminders for the Duty Roster.
- [ ] Live NASA POWER/OSDR context for “Best Use of Data.”
- [ ] Install prompt; self-host camera assets for offline use.
- [ ] Wearable/device import (CSV or HealthKit/Google Fit).
- [ ] Voice journal / speech sentiment.
- [ ] Dark mode (only if it strengthens the demo).
- [ ] Localization (only if the target audience needs it).
- [ ] Remove dead `CrewNudge`/`crew_nudges` and unused exports; reconcile docs (Vitest, Lighthouse, live DONKI).

---

## 7. Demo-day runbook

1. **Reset:** `make reset-demo && make demo-verify` — confirm day 42, commander 78.5 Watch, two alerts.
2. **Start:** `make start` (or open the hosted URL). Confirm `/health` and the web app.
3. **Login:** `commander@astra.space` / `astra-demo`.
4. **Do not run the smoke suite after reset** — it creates check-ins and redeems rewards.
5. **Browser:** Chrome, 100% zoom, 1440×900. If demoing mobile, use 390 px only after the overflow fix.
6. **Fallback:** keep the screenshots and a recorded video ready; the app works without NASA/LLM keys.
7. **Reset between rehearsals** so readiness/alerts/credits match the script.
8. **Check the clock:** the MET and “last 30 days” should look right; a reset fixes drift.

### Suggested 3-minute flow

| Time | Beat | What to show |
|---|---|---|
| 0:00 | Cold open | MET, Mars transit, Demo badge, readiness 78.5 Watch, body map |
| 0:20 | Anomaly | HRV/sleep factors, “Why this score?”, citation |
| 0:40 | Act | Systems Check → report → recommended countermeasure |
| 1:20 | Trend | 30/90-day HRV chart, baseline vs spaceflight range, CSV |
| 1:45 | Countermeasure | Sleep wind-down log → adherence/streak/credits |
| 2:05 | Motivation | Mission Log, rank, Family Call redemption |
| 2:20 | Crew | Privacy roster, consistency board, no health values |
| 2:35 | Credibility | Flight Surgeon cited answer + refusal; camera fallback |
| 2:50 | Offline | Queue a check-in, go offline, reconnect exactly once |
| 3:00 | Close | “It doesn’t just collect data. It tells an astronaut what to do next.” |

---

## 8. Judge Q&A prep

**“Is this medically validated?”**  
No. It is guidance, not diagnosis. The readiness model is deterministic and explainable, and the hard rules come from NASA HRP-informed thresholds; the next step is clinician review and prospective validation.

**“Where is the NASA data?”**  
The knowledge library and rules cite NASA HRP/Human Research Roadmap material; space-weather context is modeled on DONKI. Be explicit that the current build uses a seeded fixture unless the live DONKI client is added.

**“Why simulated crew data?”**  
NASA does not publish real-time per-astronaut health data. The demo uses clearly labeled simulated telemetry; the product accepts real user-entered and camera-derived measurements.

**“How is this different from a fitness app?”**  
Explainable readiness against a personal 21-day baseline, hard-rule escalation, prescribed countermeasures, privacy-preserving crew sharing, and offline exactly-once sync.

**“Is the AI real?”**  
The default is a deterministic, cited answer engine; an OpenAI-compatible provider is optional. Red flags and refusals always stay rule-based.

**“What would you do with more time?”**  
Clinical validation, live DONKI/OSDR integration, clinician review, wearable import, and a flight-surgeon handoff report.

---

## 9. Evidence log

| Finding | Evidence |
|---|---|
| First-use red flags ignored | `backend/app/services/readiness.py:425-426`; live test with new account → 0 alerts |
| One metric = 100 nominal | `backend/tests/test_readiness_engine.py:42-51` |
| Alerts fail open | `frontend/src/features/alerts/queries.ts:7-12`; `FlightDeckPage.tsx:497,539` |
| Alert order newest-first | `backend/app/api/alerts.py:25` |
| Mobile overflow | `/check-in` 461/390; `/training` 529/390 at 390 px |
| Body map below fold/faint | `flightdeck_full.png`; maps starts ~1,000 px down |
| No live DONKI | `grep` finds only `config.py:33` and seeded events |
| Default JWT secret | `backend/app/core/config.py:21`; `.env:6` |
| Stale readiness | `backend/app/api/readiness.py:50-58` vs `:87-93` |
| Offline timestamps | `backend/app/api/checkins.py:105,153,168`; frontend sends `started_at` |
| R7 latest-only | `backend/app/services/readiness.py:326-338` |
| Seeded reports insufficient | live API for check-ins 1–3 → `insufficient_data: true` |
| Engine failure rollback | `backend/app/api/checkins.py:188-205` |
| LLM external/no validation | `backend/app/services/assistant.py:500-557`, `:594-602` |
| Session expires | `frontend/src/app/App.tsx:22`; `auth-store.ts:143-165` |
| Camera leak | `frontend/src/features/camera/PulseCamera.tsx:237-300` |
| Offline no clinical data | production offline reload screenshot; `query-client.ts` has no persistence |
| 48 px claim vs reality | `Button.tsx:17-20`; `NavContent.tsx:52`; docs/PLAN.md:420 |
| Tiny type | Lighthouse font-size audit: 56.52% legible |
| Axe desktop | 0 WCAG A/AA violations across 9 routes |
| Lighthouse | 97 performance / 100 accessibility / 96 best-practices / 91 SEO |
| Demo drift | observed day 48 before reset; day 42 after |
| No license/CI/Dockerfiles | repository root; `docker-compose.yml` only Postgres |

---

### Bottom line

The product vision, UX direction, and core engineering are already strong enough to compete. The highest-leverage work is not “more features” — it is **making the safety logic truthful, making the hero visible, making the demo run anywhere, and telling the NASA-data story honestly.** Fix the P0 list and this becomes a 9.3+ submission with a credible shot at a global award.
