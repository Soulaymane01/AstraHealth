# Third-Party Resources and Licenses

AstraHealth is released under the Apache License 2.0 (see `LICENSE`). This page
lists the direct third-party code, fonts, models, data, and references used in
the project. Full transitive dependency manifests are in
`frontend/package-lock.json` and `backend/uv.lock`.

## Frontend

| Package | Version | License |
|---|---|---|
| React / React DOM | 19.3.1 | MIT |
| React Router DOM | 7.18.5 | MIT |
| TanStack React Query | 5.106.1 | MIT |
| Tailwind CSS | 4.3.5 | MIT |
| Vite | 8.3.6 | MIT |
| TypeScript | 7.0.2 | Apache-2.0 |
| Lucide React | 1.70.0 | ISC |
| Motion | 14.10.1 | MIT |
| Recharts | 3.10.1 | MIT |
| Sonner | 2.0.8 | MIT |
| Zustand | 5.1.0 | MIT |
| Zod | 4.6.7 | MIT |
| React Hook Form | 7.91.0 | MIT |
| `@hookform/resolvers` | 7.0.3 | MIT |
| `openapi-fetch` | 0.17.0 | MIT |
| `idb` | 8.0.4 | ISC |
| `date-fns` | 4.4.0 | MIT |
| `clsx` | 2.1.1 | MIT |
| `tailwind-merge` | 3.7.0 | MIT |
| `class-variance-authority` | 0.7.1 | Apache-2.0 |
| Three.js | 0.160.0 | MIT |
| `@mediapipe/tasks-vision` | 1.2.2 | Apache-2.0 |
| `body-muscles` | 1.0.0 | Apache-2.0 |
| Geist / Geist Mono variable fonts | 5.3.0 | SIL OFL 1.1 |
| `vite-plugin-pwa` | 2.0.0 | MIT |
| Playwright | 1.65.0 | Apache-2.0 |

## Backend

| Package | License |
|---|---|
| FastAPI | MIT |
| Uvicorn | BSD-3-Clause |
| Pydantic Settings | MIT |
| SQLAlchemy | MIT |
| psycopg | LGPL-3.0 |
| Alembic | MIT |
| HTTPX | BSD-3-Clause |
| Faker | MIT |

## Assets and data

| Resource | Source | License / terms |
|---|---|---|
| 3D anatomy models (`skin`, `muscles`, `skeleton`) | `alex-chan/3d-human-body-anatomy`, derived from Z-Anatomy and BodyParts3D | CC BY-SA 4.0; BodyParts3D CC BY-SA 2.1 Japan |
| Draco decoder | Three.js | MIT |
| `body-muscles` SVG paths | Ivan Vulović | Apache-2.0 |
| Geist / Geist Mono | Vercel | SIL OFL 1.1 |
| MediaPipe face landmarker model | Google | Apache-2.0; loaded from CDN at runtime |
| NASA Human Research Program material | NASA HRP / Human Research Roadmap | Public NASA material; cited in `docs/SOURCES.md` |
| NASA DONKI space-weather notifications | NASA | Public API; used when a key is configured |
| Demo crew names and telemetry | Generated with Python Faker and deterministic seed logic | Simulated, not real people |

## Scientific and clinical references

See [`docs/SOURCES.md`](docs/SOURCES.md) for the full source list, including:

- NASA Human Research Program and Human Research Roadmap.
- NASA Open Science Data Repository (OSDR).
- NASA DONKI.
- PHQ-9 and GAD-7 screening instruments.
- Spaceflight physiology and countermeasure references used by the knowledge
  library and hard rules.

## Notes

- No NASA logos, flags, or mission identifiers are bundled or generated.
- The app uses the NASA-blue palette as a design choice, not as NASA branding.
- If a dependency or asset is added, update this file and the corresponding
  lockfile before submission.
- License texts for the largest assets are in `docs/licenses/`.
