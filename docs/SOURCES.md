# Sources and Data Honesty

## Data honesty statement

AstraHealth does **not** access live astronaut health data. NASA does not publish a real-time, per-astronaut health API. The product uses:

- User-entered measurements and camera-derived heart rate.
- Simulated habitat/suit sensor captures labeled **Simulated** in the Flight Deck capture strip; sleep, mood, stress, symptoms, strength, hydration, and nutrition remain user-entered.
- Simulated crew telemetry, labeled as simulated in the UI and in this document.
- Public NASA human-research material for reference ranges, countermeasures, and citations.
- NASA DONKI space-weather notifications when `NASA_API_KEY` is configured, with a labeled seeded fixture as the fallback.

This statement is repeated in the README, in the Library footer, and in the persistent **Demo** badge in the app shell. The seeded mission, crew, and telemetry are demonstration fixtures; the citations are real NASA material.

---

## Primary sources

| Source | Use | URL |
|---|---|---|
| NASA Human Research Program (HRP) | Five hazards, health risks, countermeasures | https://www.nasa.gov/hrp/ |
| HRP Human Research Roadmap | Risk evidence and mitigation status | https://humanresearchroadmap.nasa.gov/ |
| NASA Life Sciences Portal | LSDA and LSAH entry points | https://www.nasa.gov/hrp/nlsp |
| NASA Open Science Data Repository (OSDR) | De-identified spaceflight and analog datasets | https://osdr.nasa.gov/ |
| OSDR API | Metadata and dataset retrieval | https://www.nasa.gov/osdr-api |
| NASA Open APIs | DONKI space weather, POWER, EONET | https://api.nasa.gov/ |
| NASA DONKI | Solar and geospace event notifications | https://ccmc.gsfc.nasa.gov/tools/DONKI/ |

All sources were accessed on **2026-11-14**. The citation line stored with each knowledge article is the source of truth shown in the Library and in assistant answers.

### The five hazards of human spaceflight

1. Space radiation
2. Isolation and confinement
3. Distance from Earth
4. Gravity fields
5. Hostile closed environments

Every domain in AstraHealth maps to at least one hazard, and every knowledge article states which hazard it addresses.

### Knowledge article sources

| Article slug | Topic | Primary source |
|---|---|---|
| `hrv-basics` | Autonomic strain and HRV | [NASA HRP](https://www.nasa.gov/hrp/) |
| `sleep-circadian` | Sleep loss and circadian rhythm | [NASA HRP](https://www.nasa.gov/hrp/) |
| `bone-loading` | Bone loss and mechanical loading | [NASA HRP](https://www.nasa.gov/hrp/) |
| `fluid-shifts` | Headward fluid shift | [NASA HRP](https://www.nasa.gov/hrp/) |
| `space-radiation` | Radiation exposure | [NASA HRP](https://www.nasa.gov/hrp/) |
| `isolation-confinement` | Isolation and confinement | [NASA HRP](https://www.nasa.gov/hrp/) |
| `hydration-nutrition` | Hydration and nutrition | [NASA HRP](https://www.nasa.gov/hrp/) |
| `immune-changes` | Immune and sensory changes | [NASA HRP](https://www.nasa.gov/hrp/) |
| `red-flags` | Escalation criteria | [NASA HRP](https://www.nasa.gov/hrp/) |

The full citation name, URL, and access date are stored on each article row and returned by `GET /knowledge/{slug}`.

### NASA DONKI

DONKI supplies space-weather context when `NASA_API_KEY` is configured. The app fetches notifications with a 30-minute cache, maps them to a severity and active window, upserts them locally, and labels the source as **Live NASA DONKI**. With no key, on a rate limit, or on a network failure, it serves the seeded fixture and labels it **Demo fixture**. The event is mission context, not a live astronaut health feed.

- **API:** https://api.nasa.gov/
- **DONKI:** https://ccmc.gsfc.nasa.gov/tools/DONKI/
- **Use:** solar and geospace event notifications, not crew health data.
- **Source line used in this documentation:** “NASA DONKI — space weather notifications. Accessed 2026-11-14.”

---

## Reference ranges

Reference ranges are compiled from HRP evidence summaries, public clinical guidance, and OSDR analog studies. In code they live in the metric catalog and are versioned with the seed data.

Ranges are **operational guidance**, not diagnostic thresholds. Personal baselines take precedence for trend detection; hard rules exist only for findings that should never wait for a trend.

---

## Citation format

Knowledge articles and assistant answers use this shape:

```
Source: NASA Human Research Program — [title]
URL: [link]
Accessed: [date]
```

The assistant must cite at least one article slug per answer, and must escalate when a hard rule fires.

---

## What we deliberately do not do

- We do not present simulated data as real astronaut data.
- We do not diagnose or prescribe treatment.
- We do not claim that camera-derived heart rate is a medical-grade measurement.
- We do not rank astronauts by health values.
- We do not imply that NASA endorses this prototype.

---

## Third-party assets

### body-muscles

- **Author:** Ivan Vulović
- **Source:** https://github.com/vulovix/body-muscles
- **License:** Apache-2.0
- **Use:** anatomical SVG path data for the interactive Flight Deck body map.
- **License and notice:** `docs/licenses/body-muscles-LICENSE` and `docs/licenses/body-muscles-NOTICE`.

### MediaPipe Tasks Vision

- **Author:** Google
- **Source:** https://github.com/google-ai-edge/mediapipe
- **Package:** `@mediapipe/tasks-vision` 1.2.2
- **License:** Apache-2.0
- **Use:** on-device face landmarks for the forehead and cheek regions used by the camera pulse estimate. The WASM runtime and the `face_landmarker.task` model load from CDN at runtime; no model or video data is uploaded by AstraHealth.
- **Notice:** the package and model are used under their upstream licenses; AstraHealth does not redistribute the model.

### 3D human anatomy models

- **Source project:** `alex-chan/3d-human-body-anatomy` — https://github.com/alex-chan/3d-human-body-anatomy
- **Upstream data:** Z-Anatomy (https://www.z-anatomy.com/), built on BodyParts3D from the Database Center for Life Science.
- **License:** CC BY-SA 4.0 (Z-Anatomy) and CC BY-SA 2.1 Japan (BodyParts3D).
- **Use:** the skin, muscle, and skeleton GLB layers in the Flight Deck body-systems viewer.
- **Files:** `frontend/public/models/{skin,muscles,skeleton}.glb`; Draco decoder files in `frontend/public/draco/` are from three.js (MIT).
- **Notice:** `docs/licenses/anatomy-3d-NOTICE`.
