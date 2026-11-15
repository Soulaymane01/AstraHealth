#!/usr/bin/env bash
#
# Start the complete AstraHealth local stack:
#   PostgreSQL -> migrations -> seed -> FastAPI -> Vite
#
# Usage:
#   ./scripts/start.sh                 start with the existing demo state
#   ./scripts/start.sh --reset-demo    rebuild the scripted demo state first
#   ./scripts/start.sh --no-seed       skip the idempotent seed step
#
# Press Ctrl+C to stop both servers. The database keeps running.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RESET_DEMO=0
SEED=1

for arg in "$@"; do
  case "$arg" in
    --reset-demo) RESET_DEMO=1 ;;
    --no-seed) SEED=0 ;;
    -h | --help)
      sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Run ./scripts/start.sh --help for usage." >&2
      exit 2
      ;;
  esac
done

say() { printf '\n==> %s\n' "$*"; }
fail() {
  printf '\nError: %s\n' "$*" >&2
  exit 1
}

API_URL="http://localhost:8000"
WEB_URL="http://localhost:5173"
API_PID=""
WEB_PID=""

cleanup() {
  local status=$?
  trap - EXIT INT TERM
  if [[ -n "$WEB_PID" ]] && kill -0 "$WEB_PID" 2>/dev/null; then
    kill "$WEB_PID" 2>/dev/null || true
  fi
  if [[ -n "$API_PID" ]] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" 2>/dev/null || true
  fi
  [[ -n "$WEB_PID" ]] && wait "$WEB_PID" 2>/dev/null || true
  [[ -n "$API_PID" ]] && wait "$API_PID" 2>/dev/null || true
  exit "$status"
}
trap cleanup EXIT INT TERM

command -v curl >/dev/null 2>&1 || fail "curl is required."
command -v uv >/dev/null 2>&1 || fail "uv is required. Install it from https://docs.astral.sh/uv/"
command -v npm >/dev/null 2>&1 || fail "Node.js and npm are required (Node 22+)."

[[ -x "backend/.venv/bin/python" ]] ||
  fail "Backend dependencies are missing. Run: make install"
[[ -x "frontend/node_modules/.bin/vite" ]] ||
  fail "Frontend dependencies are missing. Run: make install"

if [[ ! -f .env ]]; then
  cp .env.example .env
  say "Created .env from .env.example"
fi

if curl -fsS "$API_URL/health" >/dev/null 2>&1; then
  fail "Something is already listening on port 8000. Stop it first, then run this script."
fi
if curl -fsS "$WEB_URL/" >/dev/null 2>&1; then
  fail "Something is already listening on port 5173. Stop it first, then run this script."
fi

db_ready() {
  (
    cd backend
    .venv/bin/python - <<'PY' >/dev/null 2>&1
from sqlalchemy import text

from app.db.session import SessionLocal

with SessionLocal() as session:
    session.execute(text("SELECT 1"))
PY
  )
}

if db_ready; then
  say "PostgreSQL is already running"
else
  say "Starting PostgreSQL"
  make db
fi

say "Waiting for PostgreSQL"
for _ in {1..40}; do
  db_ready && break
  sleep 1
done
db_ready || fail "PostgreSQL did not become ready. Check the database container logs."

say "Applying migrations"
make migrate

if [[ "$RESET_DEMO" -eq 1 ]]; then
  say "Rebuilding the scripted demo state"
  make reset-demo
  make demo-verify
elif [[ "$SEED" -eq 1 ]]; then
  say "Ensuring the demo state is seeded"
  make seed
fi

say "Starting FastAPI on $API_URL"
(
  cd backend
  exec .venv/bin/python -m uvicorn app.main:app --reload --port 8000
) &
API_PID=$!

for _ in {1..40}; do
  curl -fsS "$API_URL/health" >/dev/null 2>&1 && break
  if ! kill -0 "$API_PID" 2>/dev/null; then
    fail "The API exited during startup. Check the output above."
  fi
  sleep 1
done
curl -fsS "$API_URL/health" >/dev/null 2>&1 ||
  fail "The API did not become ready at $API_URL/health"

say "Starting Vite on $WEB_URL"
(
  cd frontend
  exec ./node_modules/.bin/vite
) &
WEB_PID=$!

for _ in {1..40}; do
  curl -fsS "$WEB_URL/" >/dev/null 2>&1 && break
  if ! kill -0 "$WEB_PID" 2>/dev/null; then
    fail "The web server exited during startup. Check the output above."
  fi
  sleep 1
done
curl -fsS "$WEB_URL/" >/dev/null 2>&1 ||
  fail "The web server did not become ready at $WEB_URL"

cat <<EOF

AstraHealth is running.
  Web   $WEB_URL
  API   $API_URL
  Docs  $API_URL/docs
  Choose Astronaut or Flight Surgeon at http://localhost:5173

Press Ctrl+C to stop both servers. PostgreSQL keeps running in the background.
EOF

wait -n "$API_PID" "$WEB_PID"
