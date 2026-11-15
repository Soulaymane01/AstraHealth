from datetime import UTC, datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    alerts,
    assistant,
    auth,
    captures,
    checkins,
    crew,
    domains,
    gamification,
    knowledge,
    measurements,
    metrics,
    missions,
    quizzes,
    readiness,
    surgeon,
    training,
    users,
)
from app.core.config import settings

TAGS_METADATA = [
    {"name": "system", "description": "Health checks and service metadata."},
    {"name": "auth", "description": "Registration, login, and token refresh."},
    {"name": "crew", "description": "Crew roster, privacy filtering, and the consistency board."},
    {"name": "metrics", "description": "Metric definitions, measurements, and trends."},
    {"name": "captures", "description": "Simulated habitat and suit sensor captures."},
    {"name": "checkins", "description": "Guided Systems Check sessions and reports."},
    {"name": "readiness", "description": "Readiness scoring, factors, and alerts."},
    {"name": "training", "description": "Countermeasures, training plans, and streaks."},
    {"name": "gamification", "description": "Mission points, ranks, achievements, and streaks."},
    {"name": "quizzes", "description": "Know Yourself and Know Your Crew quizzes."},
    {"name": "knowledge", "description": "HRP-sourced health education."},
    {"name": "mission", "description": "Mission profile and space-weather context."},
    {"name": "assistant", "description": "SI Flight Surgeon with citations."},
    {"name": "surgeon", "description": "Earth-side clinical console for the flight surgeon."},
]

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "Mission-control software for the human body. Collects health indicators, "
        "scores crew readiness with an explainable rule engine, and recommends the "
        "next health action. Guidance only — not a medical diagnosis."
    ),
    openapi_tags=TAGS_METADATA,
    contact={"name": "AstraHealth", "url": "https://github.com/"},
    license_info={"name": "MIT"},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(metrics.router)
app.include_router(captures.router)
app.include_router(domains.router)
app.include_router(measurements.router)
app.include_router(checkins.router)
app.include_router(missions.router)
app.include_router(readiness.router)
app.include_router(alerts.router)
app.include_router(gamification.router)
app.include_router(crew.router)
app.include_router(quizzes.router)
app.include_router(training.router)
app.include_router(knowledge.router)
app.include_router(assistant.router)
app.include_router(surgeon.router)


@app.get("/health", tags=["system"], summary="Service health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "timestamp": datetime.now(UTC).isoformat(),
    }
