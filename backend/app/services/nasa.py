from __future__ import annotations

import logging
import re
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import SpaceWeatherEvent

logger = logging.getLogger(__name__)

DONKI_URL = "https://api.nasa.gov/DONKI/notifications"
DONKI_WINDOW_DAYS = 7
CACHE_TTL = timedelta(minutes=30)
REQUEST_TIMEOUT_SECONDS = 6.0
SUMMARY_LIMIT = 500

KIND_MAP = {
    "FLR": "Solar flare",
    "Solar Flare": "Solar flare",
    "GST": "Geomagnetic storm",
    "Geomagnetic Storm": "Geomagnetic storm",
    "SEP": "Solar energetic particle",
    "Solar Energetic Particle": "Solar energetic particle",
    "CME": "Coronal mass ejection",
    "Coronal Mass Ejection": "Coronal mass ejection",
    "RBE": "Radiation belt enhancement",
    "Radiation Belt Enhancement": "Radiation belt enhancement",
    "IPS": "Interplanetary shock",
    "Interplanetary Shock": "Interplanetary shock",
    "HSS": "High-speed solar wind stream",
    "High Speed Stream": "High-speed solar wind stream",
}

DURATION_BY_KIND = {
    "Solar flare": timedelta(hours=2),
    "Geomagnetic storm": timedelta(hours=24),
    "Solar energetic particle": timedelta(hours=48),
    "Coronal mass ejection": timedelta(hours=24),
    "Radiation belt enhancement": timedelta(hours=24),
    "Interplanetary shock": timedelta(hours=6),
    "High-speed solar wind stream": timedelta(hours=24),
}

SCALE_RE = re.compile(r"\b([RSG])([1-5])\b", re.IGNORECASE)

# The public DONKI endpoint is rate limited; avoid a network call on every
# dashboard request. The cache is per process and intentionally simple.
_last_attempt: datetime | None = None
_last_source: str = "fixture"
_last_live_event_id: str | None = None


def clear_cache() -> None:
    global _last_attempt, _last_source, _last_live_event_id
    _last_attempt = None
    _last_source = "fixture"
    _last_live_event_id = None


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _parse_issue_time(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return _as_utc(parsed)


def _severity(body: str) -> str:
    match = SCALE_RE.search(body)
    if match:
        level = int(match.group(2))
        if level >= 4:
            return "severe"
        if level == 3:
            return "moderate"
        return "minor"

    lowered = body.lower()
    if any(word in lowered for word in ("extreme", "severe", "strong", "major")):
        return "severe"
    if "moderate" in lowered:
        return "moderate"
    return "minor"


def parse_notification(notification: dict[str, Any]) -> dict[str, Any] | None:
    """Map one DONKI notification to the SpaceWeatherEvent shape.

    DONKI notifications are human-readable messages, not normalized event
    windows. Issue time is used as the start and a short, type-specific window
    is applied so the UI can show an active/ended state; the summary always
    names DONKI as the source.
    """
    message_type = str(notification.get("messageType") or "").strip()
    body = str(notification.get("messageBody") or "").strip()
    issued = _parse_issue_time(notification.get("messageIssueTime"))

    if not message_type or issued is None:
        return None

    kind = KIND_MAP.get(message_type, message_type[:60])
    message_id = str(notification.get("messageID") or "").strip()
    if not message_id:
        message_id = f"{message_type.replace(' ', '-').lower()}-{issued.isoformat()}"

    summary = re.sub(r"\s+", " ", body).strip()
    if len(summary) > SUMMARY_LIMIT:
        summary = summary[: SUMMARY_LIMIT - 1].rstrip() + "…"
    if not summary:
        summary = f"NASA DONKI issued a {kind.lower()} notification."

    return {
        "event_id": f"DONKI-{message_id}"[:80],
        "kind": kind,
        "start_at": issued,
        "end_at": issued + DURATION_BY_KIND.get(kind, timedelta(hours=6)),
        "severity": _severity(body),
        "summary": summary,
        "fetched_at": datetime.now(UTC),
    }


def fetch_notifications(api_key: str) -> list[dict[str, Any]]:
    end = datetime.now(UTC)
    start = end - timedelta(days=DONKI_WINDOW_DAYS)
    response = httpx.get(
        DONKI_URL,
        params={
            "startDate": start.date().isoformat(),
            "endDate": end.date().isoformat(),
            "type": "all",
            "api_key": api_key,
        },
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    payload = response.json()
    return payload if isinstance(payload, list) else []


def upsert_events(db: Session, notifications: list[dict[str, Any]]) -> SpaceWeatherEvent | None:
    latest: SpaceWeatherEvent | None = None

    for notification in notifications:
        parsed = parse_notification(notification)
        if parsed is None:
            continue

        event = db.scalar(
            select(SpaceWeatherEvent).where(
                SpaceWeatherEvent.event_id == parsed["event_id"]
            )
        )
        if event is None:
            event = SpaceWeatherEvent(**parsed)
            db.add(event)
        else:
            event.kind = parsed["kind"]
            event.start_at = parsed["start_at"]
            event.end_at = parsed["end_at"]
            event.severity = parsed["severity"]
            event.summary = parsed["summary"]
            event.fetched_at = parsed["fetched_at"]

        if latest is None or parsed["start_at"] > _as_utc(latest.start_at):
            latest = event

    db.commit()
    if latest is not None:
        db.refresh(latest)
    return latest


def latest_cached_event(db: Session) -> SpaceWeatherEvent | None:
    cutoff = datetime.now(UTC) - timedelta(days=30)
    return db.scalar(
        select(SpaceWeatherEvent)
        .where(SpaceWeatherEvent.start_at >= cutoff)
        .order_by(SpaceWeatherEvent.start_at.desc())
        .limit(1)
    )


def _live_event(db: Session, event_id: str) -> SpaceWeatherEvent | None:
    return db.scalar(
        select(SpaceWeatherEvent).where(SpaceWeatherEvent.event_id == event_id)
    )


def refresh_from_donki(db: Session, api_key: str) -> SpaceWeatherEvent | None:
    """Fetch DONKI with a TTL cache, upsert into the local table, and return the
    newest event. Any failure falls back to the local seeded/cached event."""
    global _last_attempt, _last_source, _last_live_event_id

    now = datetime.now(UTC)
    if _last_attempt is not None and now - _last_attempt < CACHE_TTL:
        cached = _live_event(db, _last_live_event_id) if _last_live_event_id else None
        return cached or latest_cached_event(db)

    _last_attempt = now
    try:
        notifications = fetch_notifications(api_key)
        latest = upsert_events(db, notifications)
        if latest is None:
            _last_source = "fixture"
            _last_live_event_id = None
            return latest_cached_event(db)
        _last_source = "live"
        _last_live_event_id = latest.event_id
        return latest
    except (httpx.HTTPError, ValueError, TypeError) as exc:
        # A key without network access, a rate limit, or an unexpected payload
        # must not break the dashboard.
        logger.warning("NASA DONKI refresh failed: %s", exc)
        db.rollback()
        _last_source = "fixture"
        _last_live_event_id = None
        return latest_cached_event(db)


def context_source() -> str:
    return _last_source


def get_mission_context(
    db: Session, api_key: str
) -> tuple[SpaceWeatherEvent | None, str]:
    if not api_key:
        return latest_cached_event(db), "fixture"

    event = refresh_from_donki(db, api_key)
    return event, context_source()
