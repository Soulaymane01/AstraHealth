# syntax=docker/dockerfile:1

# Build from the repository root:
#   docker build -t astrahealth-api .
#
# The backend reads ../README.md from pyproject.toml, so the repository layout
# is preserved inside the image instead of flattening the backend directory.

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PATH="/app/backend/.venv/bin:${PATH}"

WORKDIR /app/backend

# uv gives us the exact locked dependency set used in development.
COPY --from=ghcr.io/astral-sh/uv:0.9.5 /uv /uvx /bin/

COPY backend/pyproject.toml backend/uv.lock ./
COPY README.md /app/README.md

RUN uv sync --frozen --no-dev

COPY backend/ ./

EXPOSE 8000

# Render supplies PORT. Locally the image still works without it.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
