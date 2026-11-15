# SI Use Disclosure

AstraHealth uses **SI (Super Intelligence)**, the term used in the 2026 NASA
Space Apps [Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/)
for machine learning, chatbots, image generation, and large language models.
This page records where SI was used, where it is visible in the product, and
what it was not used for.

## Summary

| Area | SI involvement | Where it is disclosed |
|---|---|---|
| Product idea and direction | None. The challenge choice, astronaut/surgeon concept, and product decisions came from the team. | `prompt.md`, README |
| Code, tests, documentation | SI coding assistance (OpenCode with a DeepSeek V4.1 Flash model). | This page; commit history |
| In-app assistant | The assistant layer is labelled **Flight Surgeon SI** in the astronaut app and **Clinical Copilot SI** in the surgeon console. The default answer engine is deterministic and cited; an optional OpenAI-compatible LLM can be configured. | UI labels, `README.md`, `docs/API.md` |
| Follow-up requests | The backend can create a deduplicated **SI follow-up** instruction from an anomaly. The astronaut sees the SI label; the flight surgeon supervises it. | `backend/app/services/followups.py`, `SurgeonUpdatesPanel.tsx` |
| Voiceover | The 30-second and extended narration was generated with the Microsoft Edge neural TTS voice `en-US-AndrewNeural`, rate `+2%`, pitch `-2Hz`. | `docs/video/README.md`, MP3/MP4 metadata |
| Video editing | Assembly, captions, and title cards were produced with SI-assisted scripts. The footage itself is a screen recording of the real app. | `docs/VIDEO_SCRIPT_30S.md`, `docs/video/README.md` |
| App imagery | No generative image or video model was used. Title cards and the README GIF are rendered from the app and code. | This page |
| Demo data | Seeded with Python Faker and deterministic rules; no SI-generated data is presented as real. | `docs/SOURCES.md`, UI “Simulated” labels |

## NASA SI requirements

The 2026 Project Submission Guide permits SI tools, provided that teams:

- do not use SI to invent the challenge idea;
- do not include NASA branding or design elements in generated content;
- include a visible watermark on SI-generated images and videos;
- acknowledge SI-generated audio in descriptive text and metadata;
- acknowledge SI-generated code and data in descriptive text and metadata;
- clearly describe where and how SI tools were used.

AstraHealth's response:

- **Idea:** the challenge and product direction were defined by the team.
- **NASA branding:** no NASA logos, flags, or mission identifiers are used. The
  event name “NASA Space Apps 2026” is used as descriptive text.
- **Images/video:** the app footage is a screen recording; the title cards and
  GIF are code-rendered. No generative image or video model was used, so no
  visible SI watermark is present on the footage. If NASA treats the
  code-rendered title cards as SI-generated images, add a visible “SI-assisted”
  marker before submission.
- **Audio:** the SI-generated voiceover is disclosed here, in
  `docs/video/README.md`, and in the MP3/MP4 metadata.
- **Code/data:** this page and the repository documentation acknowledge SI
  assistance. The dependency manifests and `THIRD_PARTY.md` list external
  resources and licenses.

## What SI did not do

- It did not choose the challenge or define the mission concept.
- It does not diagnose, prescribe, or replace the flight surgeon.
- It did not generate the NASA HRP reference content; that content is cited
  from NASA sources.
- It did not create real astronaut health data; the crew and telemetry are
  labelled simulated demo data.

## Metadata

The rendered videos carry a `comment`/`description` metadata field naming the
SI voiceover and SI-assisted production. The generated voice track carries the
same note in its metadata and is accompanied by English captions.

## Tools

- **OpenCode** coding agent, model `deepseek-v4.1-flash`, used for code, tests,
  documentation, and video assembly.
- **Microsoft Edge TTS** (`en-US-AndrewNeural`) for the narration.
- **FFmpeg**, **Playwright**, and **ImageMagick** for recording, editing, and
  encoding. These are conventional tools, not generative models.
- **Python Faker** for the seeded demo names and data.

See [`THIRD_PARTY.md`](THIRD_PARTY.md) for licenses and [`docs/SOURCES.md`](docs/SOURCES.md)
for scientific sources.
