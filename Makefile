SHELL := /bin/bash

# Prefer Docker when its daemon is reachable; fall back to rootless Podman.
COMPOSE := $(shell if docker info >/dev/null 2>&1; then echo "docker compose"; elif command -v podman >/dev/null 2>&1; then echo "podman compose"; else echo "docker compose"; fi)

.PHONY: help install db db-stop start start-demo api web migrate seed reset-demo demo-verify client test lint check

help:
	@echo "AstraHealth — local development"
	@echo ""
	@echo "  make install     Install backend and frontend dependencies"
	@echo "  make db          Start PostgreSQL in Docker"
	@echo "  make db-stop     Stop PostgreSQL"
	@echo "  make start       Start the database, API, and web app together"
	@echo "  make start-demo  Reset the demo state, then start everything"
	@echo "  make api         Run the FastAPI server on :8000"
	@echo "  make web         Run the Vite dev server on :5173"
	@echo "  make migrate     Apply database migrations"
	@echo "  make seed        Seed the demo crew (idempotent)"
	@echo "  make reset-demo  Rebuild the scripted demo state"
	@echo "  make demo-verify Verify the scripted demo state"
	@echo "  make client      Regenerate the typed API client"
	@echo "  make test        Run backend tests"
	@echo "  make lint        Run backend and frontend linters"
	@echo "  make check       Lint, test, typecheck, and build"

install:
	cd backend && uv sync
	cd frontend && npm install

db:
	@if [ "$(COMPOSE)" = "podman compose" ]; then \
		SOCK=/run/user/$$(id -u)/podman/podman.sock; \
		mkdir -p $$(dirname $$SOCK); \
		if ! podman --remote --url unix://$$SOCK info >/dev/null 2>&1; then \
			nohup podman system service --time=0 unix://$$SOCK >/tmp/astrahealth-podman.log 2>&1 & \
			for i in $$(seq 1 20); do \
				podman --remote --url unix://$$SOCK info >/dev/null 2>&1 && break; \
				sleep 1; \
			done; \
		fi; \
	fi
	$(COMPOSE) up -d db

db-stop:
	$(COMPOSE) down

start:
	./scripts/start.sh

start-demo:
	./scripts/start.sh --reset-demo

api:
	cd backend && uv run uvicorn app.main:app --reload --port 8000

web:
	cd frontend && npm run dev

migrate:
	cd backend && uv run alembic upgrade head

seed:
	cd backend && uv run python -m app.db.seed

reset-demo:
	cd backend && uv run python -m app.db.seed --reset

demo-verify:
	cd backend && uv run python -m app.db.verify_demo

client:
	cd frontend && npm run generate:api

test:
	cd backend && uv run pytest

lint:
	cd backend && uv run ruff check .
	cd frontend && npm run lint

check: lint test
	cd frontend && npm run check
