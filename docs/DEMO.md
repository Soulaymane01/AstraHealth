# Demo Script

**Length:** about three minutes.
**Setup:** `make reset-demo` rebuilds the scripted state and `make demo-verify` checks it. The demo account is the mission commander, 42 days into a Mars transit. The sidebar carries a **Demo** badge; this build hides the developer styleguide.

---

## The story

Commander Amara is 42 days into a Mars transit. She feels fine. Her readiness score does not.

1. **Cold open — 0:00**
   The MET clock is running. The mission strip shows Mars transit, a crew of four, and a 14-minute comms delay. The readiness ring reads **80 — Watch**. Point at the **Demo** badge: the crew and telemetry are seeded, while the guidance and citations are real NASA HRP material.
   *Expected screen: `shell.png`.*

2. **Anomaly — 0:20**
   The exception list shows **HRV is below your baseline** and **Sleep is fragmented**, both at Caution. The factors explain the score: sleep efficiency around 76%, sleep duration around 5.3 h, HRV around 38.8 ms, and stress around 3–4/5. Click the chest on the anatomical body map for cardiovascular detail, or the **Sleep & circadian** row for sleep efficiency. Open **Why this score?** to show the full contribution list. Point at the **Automatic sensor capture** strip: ten readings from the Mars transit sensors, labeled **Simulated**, with **no astronaut entry**.
   *Expected screen: `domain.png`.*

3. **Act — 0:40**
   Start the Systems Check. The vitals are **already pre-filled and locked** from the capture feed; point at the **Vitals captured automatically** banner, the greyed fields, and the global **Override captures** button. Use it only if you want to demonstrate a manual fallback. Open **Why we ask** to show the HRP rationale. Continue through sleep, mood, and the symptom step, entering sleep and mood manually. Use **No symptoms today** or tap a body region. On the last step, the captured load is pre-filled; add a hydration value, then complete the check-in. The footer states that the draft is saved on the device and that the submission is one transaction.
   The Systems Report opens on **Recommended next action**, then shows the readiness delta, status transition, top factors with standard-deviation context, the 40 FC award, and active alerts. If you skip every step except one, the report shows the explicit **insufficient data** state instead of inventing a score.
   *Expected screens: `checkin.png`, `report.png`.*

4. **Trend context — 1:20**
   Open **Telemetry** from the sidebar and choose **Cardiovascular → HRV (RMSSD)**. The 30-day chart shows the recent downward anomaly against the personal baseline band. Switch to **90 days**; the URL keeps the range. Toggle **Spaceflight range** to compare the population band, then switch back. Open **Events in this range** to connect check-ins, alerts, training, and space weather. Click **Export CSV** to show the clean series export.
   *Expected screens: `telemetry.png`, `metric.png`, `metric-reference.png`.*

5. **Countermeasure — 1:45**
   Return to the Flight Deck and click the **Countermeasure** link on **Sleep is fragmented**. The Training page opens the Sleep wind-down form. Show the active-alert priority, adherence, streak, and today's roster. Log the session with RPE 2; the ledger adds 30 FC, the training streak updates, and the plan refreshes. Point out the next-due chip in the top bar and the Training nav badge.
   *Expected screen: `training-log.png`.*

6. **Mission Log — 2:05**
   Open **Mission Log**. The check-in added 40 FC, the rank progress moved, and the feed records the check-in and training session. Redeem **Family Call**; the balance drops by 120 FC, a negative ledger entry appears, and the feed records it. 
   *Expected screen: `log.png`.*

7. **Credibility — 2:30**
   Open **Library**, filter to **Cardiovascular**, and open **Why HRV falls before you feel tired**. Point at the real source card. Open the **Flight Surgeon** from the top bar and ask **"Why is my HRV low?"** The answer names the current value and baseline deviation, then cites the article. Ask **"Diagnose my chest pain and prescribe a dose."** It refuses, gives the red-flag criteria, and cites **When to contact the flight surgeon**. If a camera is available, show the 25-second pulse card; otherwise point out that the manual field is always the fallback.
   *Expected screens: `library.png`, `assistant.png`, `assistant-refusal.png`.*

8. **Offline close — 2:45**
   Start a new Systems Check, enter a heart rate and a note, and switch the browser offline. The watch-toned banner appears with the next comms window. Complete the check-in; the wizard becomes **Check-in saved on this device** with the reading count and idempotency key. Switch back online: the queue syncs, the banner clears, and the check-in appears exactly once. If time allows, reload while offline to show the cached Flight Deck with the last synced readiness, alerts, and mission context.
   *Expected screens: `offline-queue.png`, `offline-shell.png`.*

9. **Close — 2:58**
   "It doesn't just collect data. It tells an astronaut what to do next."

---

## What to point out to judges

- The score is explainable: factors and rules are visible, not a black box.
- Vitals and load are automatic: the capture strip shows simulated habitat/suit readings with provenance, and the Systems Check pre-fills them. Sleep, mood, and symptoms remain the astronaut’s own input.
- The Earth-side loop is complete: the flight surgeon sees every crew member’s captures, trends, check-ins, and alerts; can diagnose, acknowledge, and send a request; the astronaut sees the shared assessment and can mark the request done.
- The check-in is honest about missing data: skipped steps are recorded, and the report says when a baseline is insufficient instead of inventing a score.
- The telemetry charts never invent a reading. The personal baseline and spaceflight reference are visually distinct, the event rail explains context, and an empty range says what to do next.
- The social layer is safe: the crew quiz only accepts consenting subjects, and the app does not duplicate direct crew communication with an in-app chat.
- The training loop is actionable: every active alert links to a matching countermeasure, the plan is generated from the mission profile, and logging a session moves adherence, credits, and the streak.
- The credit loop is honest: rank uses lifetime credited credits, redemptions write negative ledger entries, and the check-in transaction is atomic.
- The submission is atomic: check-in, measurements, symptoms, snapshot, alerts, credits, streak, and achievements commit together or not at all. Drafts survive a reload.
- The knowledge loop is closed: every alert, metric, training item, and check-in step links to the same nine articles, and the assistant answers from the user's own readings, not generic text.
- The assistant is safe by construction: it cites real articles, refuses diagnosis and prescriptions, answers red flags with a rule-based escalation even when an LLM is configured, and works with `LLM_PROVIDER=none`.
- The camera is optional and private: the 25-second pulse estimate runs on-device, is gated by signal quality, and always yields to the manual heart-rate field.
- The offline path is honest, not a spinner: the queue is visible, per user, retryable, and exactly-once through the idempotency key.
- The delivery is hardened: auth rate limits, token-only CORS, a precached PWA shell with no API response caching, route-level splitting, and retry actions on every data view. Lighthouse reports 100 accessibility on both presets and performance 100 desktop / 99–100 mobile for the Flight Deck.
- The design is astronaut-specific: gloved-hand targets, no hover-only information, color plus icon plus word.
- The gamification is safe: mission points for consistency, never for a good reading.
- The architecture is offline-first, because the mission is.

---

## Optional extra beats

- **Pilot triage** — sign in as `pilot@astra.space` to show the critical R1 alert, the red **critical alert active** banner, and `/triage`: immediate actions, the active alert, the next comms window, and the copyable handoff summary.
- **Environment switch** — as the commander, change **Environment** from Mars transit to Lunar surface. The readiness weights, score, comms delay, and training plan update. Switch back to Mars transit before the main demo.
- **Calendar and print** — on Training, use **Calendar** to download today’s roster as `.ics`; on a Systems Report, use **Print / Save PDF** or **Export JSON** for the flight-surgeon handoff.
- **Flight Surgeon console** — sign in as `surgeon@astra.space`. The crew list shows four readiness states and early-warning badges; select the pilot, review the capture and trend, acknowledge the critical alert, and open **Copilot**. Ask **“What is the early-warning risk?”**; the answer names the drivers and cites sources without diagnosing. Ask **“Diagnose the fever and prescribe a dose”** to show the refusal. Save a clinical assessment and send a check-in request. Sign out and sign in as the pilot to see the shared assessment plus the **AI follow-up** request; use **Start focused check**, complete the step, and the request closes automatically. The surgeon console is at `/surgeon`.

## Reset and accounts

```bash
make install
make start-demo
```

`make start-demo` starts PostgreSQL if needed, applies migrations, rebuilds and verifies the demo state, then runs the API and web app together. Press **Ctrl+C** to stop both servers.

| Account | Role | Use |
|---|---|---|
| `commander@astra.space` | Commander | Primary demo; HRV and sleep anomaly |
| `pilot@astra.space` | Pilot | Febrile episode; crew comparison |
| `specialist@astra.space` | Specialist | Neurobehavioral arc |
| `engineer@astra.space` | Engineer | Stable control |
| `surgeon@astra.space` | Flight Surgeon | Earth-side console at `/surgeon` |

Password for all demo accounts: `astra-demo`.

> These accounts and the seeded telemetry are local development fixtures only.
