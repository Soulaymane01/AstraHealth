# NASA Space Apps 2026 — Compliance Report

**Project:** AstraHealth
**Challenge:** Create Health Monitoring Software for Astronauts on Space Missions
**Report date:** 2026-11-15
**Scope:** repository, live demo, documentation, and submission readiness.
**Status:** Strong challenge fit; the demo asset and submission page are still missing.

## Sources checked

- [2026 Challenge — Create Health Monitoring Software for Astronauts on Space Missions](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/)
- [Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/)
- [Judging & Awards Guide](https://www.spaceappschallenge.org/resources/judging-awards-guide/)
- [2026 Participant Terms and Conditions](https://www.spaceappschallenge.org/legal/)
- Local challenge statement: `announcement.txt`

The submission deadline is **Sunday, 15 November 2026, 11:59 p.m. local time** for the team’s Local Event (or the Universal Event Team Owner’s local time). The event runs **14–15 November 2026**.

## Executive summary

AstraHealth directly addresses the official challenge and has a coherent, working live demo. The largest remaining risks are **submission page completeness, the demo asset, public link access, NASA-data depth, and citation specificity**.

There is currently **no demo asset in the repository**: neither a video nor a 7-slide deck. The team must create one of those two formats before submitting; the limit is strict.

## Requirements matrix

| Requirement | Status | Evidence / action |
|---|---|---|
| Respond to an official NASA Space Apps challenge | **PASS** | The app addresses the exact 2026 health-monitoring challenge in `announcement.txt`. |
| Gather health indicators and help astronauts evaluate/act | **PASS** | Systems Check, Telemetry, readiness, alerts, countermeasures, triage. |
| Visual tool with clear presentation | **PASS** | 3D body systems, readiness ring, color + word status, dynamic charts. |
| Use NASA HRP resources and explain measurements | **PASS with depth risk** | Nine HRP-sourced articles, hard rules, cited assistant. Citations are still mostly HRP landing pages; add specific evidence pages. |
| Use at least one NASA data/resource for Global Award eligibility | **PARTIAL** | NASA HRP material is used; live DONKI is optional and currently falls back to a labeled fixture. Set `NASA_API_KEY` and verify **Live NASA DONKI**. |
| Demo: 30-second video or ≤7 slides | **ACTION REQUIRED** | No video or slide deck is currently in the repository. Create a 7-slide deck (title, challenge, solution, demo, NASA data, impact, team) or a new ≤30 s video. |
| Demo link publicly accessible, no password/permission/registration | **ACTION REQUIRED** | Will be satisfied by a public YouTube/Drive slide deck link. The app itself has one-click **Astronaut demo** / **Surgeon demo** access, but still opens a login page. |
| English on submission page and linked materials | **PASS** | English app and README. The future slide deck must be in English. |
| All team members registered at the same Local Event, 1–6 members | **EXTERNAL ACTION** | Cannot be verified from the repository. Confirm team membership and event selection before submitting. |
| Complete all required project-page fields | **EXTERNAL ACTION** | Project name, summary, demo link, final project link, detailed description, NASA data, references. |
| Submit before the deadline | **EXTERNAL ACTION** | Click **Submit for Judging** by 11:59 p.m. local time on 15 November 2026. |
| Open-source license for original work | **PASS** | `LICENSE` is Apache-2.0. |
| Third-party materials are open source/licensed and cited | **PASS with action** | `THIRD_PARTY.md`, `docs/licenses/`, `package-lock.json`, `uv.lock`. Add the same references to the submission page. |
| Cite every source used | **PARTIAL** | `docs/SOURCES.md` lists sources, but the nine article rows mostly cite the HRP homepage. Add specific HRP evidence pages/DOIs and library versions. |
| Original work / no unlicensed copyrighted material | **PASS** | Original code; third-party assets are licensed and listed; no music, stock images, or video. |
| No PII or under-18 likeness | **PASS** | Fictional crew, simulated data, no real people. |
| No NASA branding/design elements | **REVIEW** | No NASA logo, flag, or mission identifier is used. The app and README use the event name “NASA Space Apps 2026” as text. Confirm this is acceptable under the event brand guidelines. |
| No commercial promotion | **PASS** | No ads, paid services, or commercial calls to action. |
| SI question on the submission form | **ACTION REQUIRED** | Complete the form’s SI question truthfully for the tools used. Do not leave it blank. |
| Verify the app URL works for judges | **PASS with note** | <https://astrahealth-gamma.vercel.app> is live; one-click demo access is available. The login page still appears first. |
| Verify the final project link is public | **PASS** | Live app and public GitHub repository. |

## Judging-criteria readiness

Official scale: 1–5 for Impact, Creativity, Validity, Relevance, Presentation.

| Criterion | Current read | Main risk |
|---|---|---|
| **Impact** | **4–5** | Strong self-care and surgeon loop; no real astronaut/clinician validation yet. |
| **Creativity** | **4–5** | 3D body, dual persona, game loop, and cited copilot are distinctive. |
| **Validity** | **4** | Deterministic and tested, but heuristic; specific citations and a limitations page would strengthen it. |
| **Relevance** | **4** | Deep spaceflight framing; NASA data needs a live surface (DONKI + specific HRP evidence). |
| **Presentation** | **3–5** | The live app and README are strong, but the demo asset is missing. A polished 7-slide deck is now the fastest path. |

## What still needs fixing

### P0 — before clicking Submit for Judging

1. **Create the 7-slide demo deck or a new ≤30-second video.** Recommended: 7-slide deck with title, challenge, product, live demo screenshots, NASA data, impact, and team. The submission guide permits up to seven slides.
2. **Create the project submission page and fill every required field.**
3. **Upload the demo deck to a public link** (Google Slides, Canva, PDF on Drive, or GitHub) with no login or permission prompt.
4. **Confirm team eligibility:** all members registered, same Local Event, 1–6 people, not waitlisted.
5. **Add specific references** for the nine HRP articles and the 3D anatomy models; list Apache-2.0, CC BY-SA 4.0, CC BY-SA 2.1 Japan, OFL-1.1, ISC, and MIT.
6. **Set `NASA_API_KEY`** in Vercel and verify the space-weather card switches to **Live NASA DONKI**. If the key is unavailable, keep the fixture label and say so.
7. **Add a “not a NASA product / not endorsed by NASA” disclaimer** to the submission description and README.
8. **Complete the SI question** on the project page for the tools used.
9. **Decide how the login page is described.** The app is live and has one-click demo buttons; make that clear in the final-project description.

### P1 — strengthens the submission

- Replace HRP homepage citations with specific evidence pages or DOIs.
- Add a short **Methods & Limitations** section to the submission page.
- Add OSDR or NASA POWER context if time allows; this strengthens the Relevance criterion.
- Add a clinician/astronaut-adjacent review or quote if available.
- Add `CITATION.cff` and a `NOTICE` file if the team wants a formal open-source package.
- Verify the event-name/branding usage against the Space Apps brand guidelines.

## Submission copy pack

**Project name:** AstraHealth

**High-level summary:**
AstraHealth is mission-control software for the human body. It turns astronaut-entered and simulated sensor readings into an explainable readiness score, shows the contributing body systems, recommends the next countermeasure, and escalates red flags to a flight surgeon. The astronaut gets a calm daily check-in; the surgeon gets an Earth-side console with early warning, cited guidance, and a focused follow-up request.

**Demo link:** the public 7-slide deck (or new 30-second video).

**Final project link:** <https://astrahealth-gamma.vercel.app> and <https://github.com/Soulaymane01/AstraHealth>.

**Detailed description:** see [`README.md`](../README.md), [`docs/DESIGN.md`](DESIGN.md), and [`docs/API.md`](API.md).

**NASA data/resources:** NASA Human Research Program and Human Research Roadmap; NASA DONKI when configured; NASA OSDR as a reference source. Link `docs/SOURCES.md`.

**References:** `THIRD_PARTY.md`, `docs/SOURCES.md`, `LICENSE`, `docs/licenses/`.

**Access note:** the live app opens on a login page; use the one-click **Astronaut demo** or **Surgeon demo** buttons. No password is required.

## Bottom line

AstraHealth is **substantively compliant** with the challenge and the 2026 judging criteria. The product is not the bottleneck. The submission still needs a demo asset (7-slide deck is the fastest path), the project page, references, live NASA data, and the final eligibility checks before the deadline.
