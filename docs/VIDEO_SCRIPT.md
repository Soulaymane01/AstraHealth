# AstraHealth — Demo Video Script

**Format:** 16:9, 1600×900 source, 1080p output
**Length:** 2:58 (branded cut) · 2:51 (app-only cut)
**Voice:** warm, calm, conversational; about 180 words per minute
**Two cuts:**

1. `AstraHealth-Power-Astronaut.mp4` — includes “Presented by Power Astronaut” in the intro and outro.
2. `AstraHealth-App-Demo.mp4` — the same app story without team branding.

The app footage is identical in both cuts. Only the intro and outro differ.

**30-second submission cut:** see [`VIDEO_SCRIPT_30S.md`](VIDEO_SCRIPT_30S.md).

**Extended files:** `docs/video/extended/AstraHealth-Power-Astronaut.mp4` and
`docs/video/extended/AstraHealth-App-Demo.mp4`

---

## Cut A — with team branding

| Time | Visual | Voiceover |
|---|---|---|
| 0:00 | Title card: orbit mark, **AstraHealth**, “Mission-control software for the human body”, **Presented by Power Astronaut**, NASA Space Apps 2026 | On a mission to Mars, the nearest flight surgeon is fourteen minutes away. AstraHealth turns the astronaut into the first line of care. Presented by Power Astronaut. |
| 0:12 | Slow push into the Flight Deck. Readiness ring, Watch status, six domains | Long-duration spaceflight exposes the body to radiation, isolation, altered gravity, and a closed environment. Astronauts need to notice the subtle changes early — and know exactly what to do next. |
| 0:30 | Flight Deck. Readiness 76, factors, body systems tile | This is the Flight Deck. A readiness score built from six physiological domains, not a single number. Amara is forty-two days into transit. Her score is seventy-six: Watch. The factors are visible: sleep efficiency, sleep duration, and heart-rate variability. |
| 0:52 | Scroll to Body systems, open the 3D body, switch Skin / Muscular / Skeletal | Open the body, and the same story appears in three dimensions. Skin, muscle, and skeleton, front and back, with the affected system highlighted. |
| 1:03 | Close-up of “Why this score?” factors | Every score is explainable. A twenty-one-day personal baseline, standard-deviation factors, and hard rules that never wait for a trend. When the data is insufficient, the app says so instead of inventing reassurance. |
| 1:18 | Systems Check. Auto-filled vitals and sleep, “Sensor-filled” banner | The daily Systems Check is a two-minute ritual. Vitals, load, and sleep arrive automatically from simulated habitat sensors, clearly labelled. The astronaut adds mood, symptoms, and context. |
| 1:34 | Continue through the wizard, submit, Systems Report | Submit, and the Systems Report shows what changed, why, and the next action: protect the sleep window, review hydration, repeat the measurement. The loop closes with a countermeasure, not just a number. |
| 1:50 | Mission Log. Rank, points, streak, achievements | Consistency is rewarded with mission points, rank, streaks, and achievements — never with health readings. The Mission Log records the whole loop and shows the next milestone. |
| 2:02 | Quizzes page, PHQ-9 and GAD-7 cards | Mental health is not an afterthought. PHQ-9 and GAD-7 screens live beside the physical record, with severity scoring and a self-harm escalation path. |
| 2:12 | Title card: “Earth-side · Flight Surgeon console” | On Earth, the flight surgeon opens a separate console. |
| 2:18 | Surgeon picker, choose Amara. Overview with space weather and early warning | She picks an astronaut, sees the same readiness and a seventy-two-hour early-warning view, and reads the evidence behind the risk. Space weather is mission context, not a diagnosis. |
| 2:30 | Open Copilot, show a cited answer and the refusal path | The Copilot summarises the record and cites NASA human-research guidance. It refuses diagnosis and prescriptions. When a signal crosses a threshold, it creates one focused follow-up request for the astronaut. |
| 2:42 | Return to the astronaut view, privacy settings / crew sharing | Crew sharing is consent-based. Health values never appear on a leaderboard. And every recommendation is guidance, not diagnosis. |
| 2:50 | Outro: orbit mark, **AstraHealth**, “A calmer way to check in”, **Power Astronaut**, NASA Space Apps 2026 | AstraHealth. A calmer way to check in. Built by Power Astronaut for NASA Space Apps 2026. |

---

## Cut B — app only

Same body from **0:12 to 2:42**. Replace the intro and outro:

| Time | Visual | Voiceover |
|---|---|---|
| 0:00 | Title card: orbit mark, **AstraHealth**, “Mission-control software for the human body”, NASA Space Apps 2026 | On a mission to Mars, the nearest flight surgeon is fourteen minutes away. AstraHealth turns the astronaut into the first line of care. |
| 2:42 | Outro: orbit mark, **AstraHealth**, “A calmer way to check in” | AstraHealth. A calmer way to check in. |

---

## Production notes

- The demo uses the seeded day-42 mission and the two demo accounts.
- The astronaut footage uses `commander@astra.space`; the surgeon footage uses `surgeon@astra.space`.
- The check-in creates one real check-in in the local demo database. Reset the demo after recording.
- The cursor is a small accent ring so viewers can follow the interaction without a distracting pointer.
- The voiceover is generated with a neural TTS voice. It is intentionally replaceable; the narration files and the assembled audio track are kept beside the video.
- No music bed in the first cut. A quiet room tone and the voice keep the clinical tone.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Astronaut | `commander@astra.space` | `astra-demo` |
| Flight Surgeon | `surgeon@astra.space` | `astra-demo` |
