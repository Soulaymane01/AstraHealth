# Deploying AstraHealth

AstraHealth has a React/Vite static frontend, a FastAPI backend, and
PostgreSQL. The zero-cost, no-card path is:

| Piece | Host | Why |
|---|---|---|
| Frontend | **Vercel** — <https://astrahealth-gamma.vercel.app> | Static Vite build, HTTPS, previews, custom domain |
| API | **Vercel Python runtime** — <https://astrahealth-api.vercel.app> | No card required; FastAPI runs as a serverless function |
| Database | **Neon** — project `astrahealth` | Managed Postgres with a free tier and pooled connections |

Render is also supported as an optional backend host if you are willing to add
a card. It runs the API as a normal long-lived container, which avoids
serverless cold starts. The repository includes `render.yaml` and a root
`Dockerfile` for that path.

## Why not Hostinger for the backend?

Hostinger shared hosting can serve the built `dist/` folder, but it cannot run
FastAPI, Python, or Postgres. It is a static/PHP host. Hostinger VPS can run
everything with Docker, but you own TLS, backups, security, and maintenance.
Use Hostinger for the frontend only if you already pay for it.

NASA provides free APIs and data (DONKI, POWER, OSDR), not general app hosting.

## 1. Database (Neon)

The Neon project `astrahealth` is already provisioned and seeded. For a new
environment:

1. Create a project at <https://neon.tech>.
2. Copy the **pooled** connection string. It looks like:
   `postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/astrahealth?sslmode=require`
3. Change the scheme for SQLAlchemy/psycopg:
   `postgresql+psycopg://user:password@ep-xxx-pooler.region.aws.neon.tech/astrahealth?sslmode=require`

Run migrations and seed from your machine:

```bash
cd backend

export DATABASE_URL='postgresql+psycopg://...'
uv run alembic upgrade head
uv run python -m app.db.seed --reset
uv run python -m app.db.verify_demo
```

Use the **pooled** host for Vercel and the **direct** host for Render. Run
`--reset` again before judging so the mission day and readiness state are fresh.

> `app.db.seed` uses the server clock. If the demo sits for several days, the
> mission advances. `verify_demo` accepts day 41+ and prints a reset hint after
> day 43.

## 2. Backend on Vercel

The backend-specific deployment files are:

- `backend/api/index.py` — exposes the FastAPI `app` to Vercel.
- `backend/vercel.json` — sends every path to the function and includes
  `app/**` and `data/**` in the bundle.
- `backend/requirements.txt` — generated from `uv.lock`; do not hand-edit.

Deploy:

```bash
cd backend
vercel link --yes --project astrahealth-api
vercel env add DATABASE_URL --environment production --value 'postgresql+psycopg://...' --yes
vercel env add JWT_SECRET --environment production --value "$(openssl rand -hex 32)" --yes
vercel env add ENVIRONMENT --environment production --value production --yes
vercel env add CORS_ORIGINS --environment production --value '["https://your-frontend.vercel.app"]' --yes
vercel env add NASA_API_KEY --environment production --value 'YOUR_NASA_KEY' --yes
vercel env add LLM_PROVIDER --environment production --value none --yes
vercel --prod --yes
```

Or set the same variables in the Vercel dashboard under
**Project → Settings → Environment Variables**.

Important serverless details:

- Vercel's Hobby plan limits function execution time. AstraHealth endpoints are
  short, but cold starts can add a few seconds.
- Vercel functions are stateless. The database, not the process, holds all
  state.
- Schema migrations and seeding are **not** run by Vercel. Run them locally
  against Neon.
- Keep `DATABASE_URL` on the pooled Neon host for Vercel. The pooler prevents
  connection exhaustion across function instances.
- After changing `requirements.txt`, regenerate it:
  `uv export --frozen --no-dev --no-hashes --format requirements-txt > requirements.txt`
- If the function bundle misses a file, add it to `includeFiles` in
  `backend/vercel.json`.

## 3. Frontend on Vercel

1. Import the repository at <https://vercel.com/new>.
2. Set **Root Directory** to `frontend`. Vercel detects Vite.
3. Add the production environment variable:
   ```
   VITE_API_URL=https://astrahealth-api.vercel.app
   ```
   Use the actual backend URL, with no trailing slash.
4. Deploy. `frontend/vercel.json` provides the SPA fallback so direct links such
   as `/log`, `/check-in`, and `/surgeon` work.
5. Add the final frontend domain to the backend's `CORS_ORIGINS` and redeploy
   the backend if you changed it. The current production CORS values are
   `["https://astrahealth-gamma.vercel.app","http://localhost:5173"]`.

`VITE_API_URL` is baked in at build time. Changing it requires a frontend
redeploy, not just an environment edit.

If you use the Vercel CLI instead of the dashboard:

```bash
cd frontend
vercel link --yes --project astrahealth
vercel env add VITE_API_URL --environment production --value 'https://astrahealth-api.vercel.app' --yes
vercel --prod --yes
```

## Optional: backend on Render

Render's free web service may ask for a payment method even though the plan is
free. If you have a card on file, Render is the more robust backend option
because it runs FastAPI as a normal process.

1. Push the repository to GitHub.
2. In Render, choose **New → Blueprint** and select the repository. Render reads
   [`render.yaml`](../render.yaml).
3. Fill `DATABASE_URL` (direct Neon host), `CORS_ORIGINS`, and optionally
   `NASA_API_KEY`.
4. Deploy. The container runs `alembic upgrade head` on start, then Uvicorn.

You can also create a **Web Service** manually: runtime Docker, Dockerfile path
`Dockerfile`, Docker context `.`, health check `/health`.

The root [`Dockerfile`](../Dockerfile) builds the API from the repository root.
Render free services spin down after inactivity, so use UptimeRobot or
cron-job.org to ping `/health` every 10 minutes.

## Optional: Hostinger frontend

If you want the frontend on Hostinger instead of Vercel:

```bash
cd frontend
VITE_API_URL=https://astrahealth-api.vercel.app npm run build
```

Upload the contents of `frontend/dist/` to `public_html/`. Add this
`.htaccess` so client-side routes do not 404:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

Enable free SSL in Hostinger, then add `https://your-domain` to
`CORS_ORIGINS`. Rebuild the frontend whenever `VITE_API_URL` changes.

## Environment variables

| Variable | Where | Value |
|---|---|---|
| `DATABASE_URL` | Vercel backend | Neon pooled URL with `postgresql+psycopg://` |
| `JWT_SECRET` | Vercel backend | `openssl rand -hex 32` |
| `ENVIRONMENT` | Vercel backend | `production` |
| `CORS_ORIGINS` | Vercel backend | JSON array of allowed frontend origins |
| `NASA_API_KEY` | Vercel backend | Optional; free key from <https://api.nasa.gov> |
| `LLM_PROVIDER` | Vercel backend | Keep `none` unless you intentionally enable an LLM |
| `VITE_API_URL` | Vercel frontend | Public API base URL |
| `VITE_DEMO_MODE` | Vercel frontend | Leave unset or `true` for the demo badge |

Do not commit `.env` or real keys. The repository already ignores `.env`.

## Current deployment

| Item | URL |
|---|---|
| Frontend | <https://astrahealth-gamma.vercel.app> |
| API | <https://astrahealth-api.vercel.app> |
| API health | <https://astrahealth-api.vercel.app/health> |
| Neon project | `astrahealth` (`divine-queen-95255482`) |

The Neon database is already migrated and seeded with the day-42 demo. The
Vercel frontend was built with `VITE_API_URL=https://astrahealth-api.vercel.app`.
Re-run the seed against Neon before judging if the demo has aged.

## Post-deploy checklist

- [ ] `https://<api>/health` returns 200.
- [ ] Login works for `commander@astra.space` / `astra-demo`.
- [ ] Flight Deck shows readiness around 80 / Watch and two alerts.
- [ ] Direct links `/log`, `/check-in`, and `/surgeon` do not 404.
- [ ] Surgeon login works and the astronaut picker loads.
- [ ] 3D body models load; the 2D fallback appears if WebGL fails.
- [ ] Browser console has no CORS or mixed-content errors.
- [ ] The demo has been re-seeded against Neon before judging.
- [ ] The backend has been warmed after a period of inactivity. The repository
      includes `.github/workflows/keep-warm.yml`, which pings `/health` every
      ten minutes; you can also use UptimeRobot or cron-job.org.

## Troubleshooting

**CORS error.** `CORS_ORIGINS` must contain the exact frontend origin, including
`https://` and no trailing slash. It is a JSON array, not a comma-separated
string.

**Login works but every request 401s.** Check that the frontend was built with
the correct `VITE_API_URL`, and that the backend's `JWT_SECRET` has not changed
between deploys. Changing the secret invalidates existing tokens.

**Database connection errors.** Use the Neon pooled host for Vercel and keep
`?sslmode=require`. Make sure the URL starts with `postgresql+psycopg://`.

**Function times out.** Vercel Hobby has a short execution limit. Most
AstraHealth endpoints are quick; if one is slow, check the Neon compute state
and the function logs.

**Old UI after deploy.** The PWA service worker may serve a cached shell. Hard
reload once, or use a fresh browser profile. The app uses `autoUpdate` and
`skipWaiting`, so a normal reload usually picks up the new build.

**Space weather says “Demo fixture”.** Set `NASA_API_KEY` on the backend and
redeploy. The UI labels live DONKI responses as “Live NASA DONKI”.
