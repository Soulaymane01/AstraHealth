# NASA Space Apps 2026 — Compliance Report

**Project:** AstraHealth  
**Challenge:** Create Health Monitoring Software for Astronauts on Space Missions  
**Report date:** 2026-11-15  
**Scope:** repository, live demo, 30-second videos, documentation, and submission readiness.  
**Status:** Strong challenge fit; submission packaging still has external actions.

## Sources checked

- [2026 Challenge — Create Health Monitoring Software for Astronauts on Space Missions](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/)
- [Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/)
- [Judging & Awards Guide](https://www.spaceappschallenge.org/resources/judging-awards-guide/)
- [2026 Participant Terms and Conditions](https://www.spaceappschallenge.org/legal/)
- Local challenge statement: `announcement.txt`

The submission deadline is **Sunday, 15 November 2026, 11:59 p.m. local time** for the team’s Local Event (or the Universal Event Team Owner’s local time). The event runs **14–15 November 2026**.

## Executive summary

**Terminology:** AstraHealth uses **SI (Super Intelligence)** consistently in its documentation and UI. The 2026 Space Apps guide defines SI as machine learning, chatbots, image generation, and large language models; the project uses SI in user-facing copy.

AstraHealth directly addresses the official challenge and has a coherent, working demo. The largest remaining risks are not product gaps; they are **submission page completeness, public link access, NASA-data depth, and citation specificity**.

Already fixed during this audit:

- The 30-second videos were **30.033 s** and are now **29.904 s**, inside the strict 30-second limit.
- The project had no root open-source license; **Apache-2.0** is now included.
- SI terminology and disclosure were added across the UI, docs, audio, and video metadata.
- The astronaut assistant panel is now **Flight Surgeon SI**; the surgeon panel is **Clinical Copilot SI**.
- The login page now has **one-click demo access** for the astronaut and surgeon demos, so judges do not need to type a password.
- Third-party licenses and asset notices are documented in `THIRD_PARTY.md`.

## Requirements matrix

| Requirement | Status | Evidence / action |
|---|---|---|
| Respond to an official NASA Space Apps challenge | **PASS** | The app addresses the exact 2026 health-monitoring challenge in `announcement.txt`. |
| Gather health indicators and help astronauts evaluate/act | **PASS** | Systems Check, Telemetry, readiness, alerts, countermeasures, triage. |
| Visual tool with clear presentation | **PASS** | 3D body systems, readiness ring, color + word status, dynamic charts. |
| Use NASA HRP resources and explain measurements | **PASS with depth risk** | Nine HRP-sourced articles, hard rules, cited assistant. Citations are still mostly HRP landing pages; see action A4. |
| Use at least one NASA data/resource for Global Award eligibility | **PARTIAL** | NASA HRP material is used; live DONKI is optional and currently falls back to a labeled fixture. Set `NASA_API_KEY` and verify `Live NASA DONKI`. |
| Demo: 30-second video or ≤7 slides | **PASS (fixed)** | `AstraHealth-Power-Astronaut-30s.mp4` and `AstraHealth-App-Demo-30s.mp4` are 29.904 s. |
| Demo link publicly accessible, no password/permission/registration | **PARTIAL** | Video is in the public GitHub repo, but a raw GitHub blob is not a polished viewing link. Upload to YouTube/Drive and link that. The app now has one-click demo access, but still opens a login page; describe that clearly or add a direct `/demo` link. |
| English on submission page and linked materials | **PASS** | English app, README, video, and SRT captions. |
| English subtitles if video is non-English | **N/A / PASS** | Video is English; English SRT files are included. |
| All team members registered at the same Local Event, 1–6 members | **EXTERNAL ACTION** | Cannot be verified from the repository. Confirm team membership and event selection before submitting. |
| Complete all required project-page fields | **EXTERNAL ACTION** | Project name, summary, demo link, final project link, detailed description, SI use, NASA data, references. Copy is ready below. |
| Submit before the deadline | **EXTERNAL ACTION** | Must click **Submit for Judging** by 11:59 p.m. local time on 15 November 2026. |
| Open-source license for original work | **PASS (fixed)** | `LICENSE` is Apache-2.0. |
| Third-party materials are open source/licensed and cited | **PASS with action** | `THIRD_PARTY.md`, `docs/licenses/`, `package-lock.json`, `uv.lock`. Add the same references to the submission page. |
| Cite every source used | **PARTIAL** | `docs/SOURCES.md` lists sources, but the nine article rows mostly cite the HRP homepage. Add specific HRP evidence pages/DOIs and library versions. |
| Original work / no unlicensed copyrighted material | **PASS** | Original code; third-party assets are licensed and listed; no music; no stock images. |
| No PII or under-18 likeness | **PASS** | Fictional crew, simulated data, no real people in the video. |
| No NASA branding/design elements in SI-generated content | **REVIEW** | No NASA logo, flag, or mission identifier is used. The title cards and README use the event name “NASA Space Apps 2026” as text. Confirm this is acceptable under the event brand guidelines. |
| No commercial promotion | **PASS** | No ads, paid services, or commercial calls to action. |
| SI tools permitted but disclosed | **PASS (fixed)** | `SI_USAGE.md`; UI labels; audio and video metadata; code/data acknowledgment. |
| SI not used to invent the idea | **PASS** | The challenge and product direction are documented in `prompt.md` and were team-defined. |
| SI-generated images/videos visibly watermarked | **N/A / REVIEW** | No generative image or video model was used; footage is a screen recording, and title cards/GIF are code-rendered. If NASA treats the code-rendered cards as SI-generated imagery, add a visible “SI-assisted” marker. |
| SI-generated audio acknowledged in description and metadata | **PASS (fixed)** | MP3/MP4 `comment` and `description` fields; `docs/video/README.md`; `SI_USAGE.md`. |
| SI-generated code/data acknowledged in description and metadata | **PASS (fixed)** | `SI_USAGE.md` and README disclosure. |

## Judging-criteria readiness

Official scale: 1–5 for Impact, Creativity, Validity, Relevance, Presentation.

| Criterion | Current read | Main risk |
|---|---|---|
| **Impact** | **4–5** | Strong self-care and surgeon loop; no real astronaut/clinician validation yet. |
| **Creativity** | **4–5** | 3D body, dual persona, game loop, and cited copilot are distinctive; avoid presenting it as a generic dashboard. |
| **Validity** | **4** | Deterministic and tested, but heuristic; specific citations and a limitations page would strengthen it. |
| **Relevance** | **4** | Deep spaceflight framing; NASA data needs a live surface (DONKI + specific HRP evidence). |
| **Presentation** | **4–5** | 30-second video, live demo, and clear README; public video link and one-click demo access are the remaining friction points. |

## What still needs fixing

### P0 — before clicking Submit for Judging

1. **Create the project submission page and fill every required field.** Use the copy pack below.
2. **Upload the 30-second video to YouTube or Google Drive** and use that public link. Add the English `.srt` captions in the platform.
3. **Use a public final-project link** to the live app and GitHub. Explain that the app has one-click demo access; no password is required.
4. **Confirm team eligibility:** all members registered, same Local Event, 1–6 people, not waitlisted.
5. **Add specific references** for the nine HRP articles and the 3D anatomy models; list Apache-2.0, CC BY-SA 4.0, CC BY-SA 2.1 Japan, OFL-1.1, ISC, MIT, and the SI tools.
6. **Set `NASA_API_KEY`** in Vercel and verify the space-weather card switches to **Live NASA DONKI**. If the key is unavailable, keep the fixture label and say so.
7. **Add a “not a NASA product / not endorsed by NASA” disclaimer** to the submission description and README.
8. **Decide on the SI visual marker.** No generative imagery is used; if the organizers interpret code-rendered title cards as SI-generated images, add a visible “SI-assisted” label to the title cards.

### P1 — strengthens the submission

- Replace HRP homepage citations with specific evidence pages or DOIs.
- Add a short **Methods & Limitations** section to the submission page.
- Add a **YouTube** demo link rather than a repository blob.
- Add OSDR or NASA POWER context if time allows; this strengthens the Relevance criterion.
- Add a clinician/astronaut-adjacent review or quote if available.
- Add `CITATION.cff` and a `NOTICE` file if the team wants a formal open-source package.
- Verify the event-name/branding usage against the Space Apps brand guidelines.

## Submission copy pack

**Project name:** AstraHealth

**High-level summary:**  
AstraHealth is mission-control software for the human body. It turns astronaut-entered and simulated sensor readings into an explainable readiness score, shows the contributing body systems, recommends the next countermeasure, and escalates red flags to a flight surgeon. The astronaut gets a calm daily check-in; the surgeon gets an Earth-side console with early warning, cited guidance, and a focused follow-up request.

**Demo link:** the 30-second video (public YouTube/Drive link after upload).

**Final project link:** <https://astrahealth-gamma.vercel.app> and <https://github.com/Soulaymane01/AstraHealth>.

**Detailed description:** see [`README.md`](../README.md), [`docs/DESIGN.md`](DESIGN.md), and [`docs/API.md`](API.md).

**SI use:** see [`SI_USAGE.md`](../SI_USAGE.md). State that SI assisted code, documentation, video assembly, and the voiceover; the default assistant is deterministic and cited; the challenge idea and product direction were team-defined.

**NASA data/resources:** NASA Human Research Program and Human Research Roadmap; NASA DONKI when configured; NASA OSDR as a reference source. Link `docs/SOURCES.md`.

**References:** `THIRD_PARTY.md`, `docs/SOURCES.md`, `LICENSE`, `docs/licenses/`.

## Bottom line

AstraHealth is **substantively compliant** with the challenge and the 2026 judging criteria. The product is not the bottleneck. The submission is: public demo hosting, the project page, references, live NASA data, and the final eligibility checks need to be completed before the deadline. The 30-second limit is now satisfied; do not upload the old 3-minute cut as the submission demo.
