from __future__ import annotations

import random
import threading
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Measurement, MetricDefinition, User
from app.services.readiness import profile_for_user

CAPTURE_INTERVAL = timedelta(minutes=5)

CAPTURE_SOURCES = ("iss_capture", "lunar_capture", "mars_capture")

CAPTURE_SOURCE_LABELS = {
    "iss_capture": "ISS habitat sensors",
    "lunar_capture": "Lunar surface sensors",
    "mars_capture": "Mars transit sensors",
}

CAPTURE_METRICS = (
    "heart_rate",
    "hrv_rmssd",
    "systolic_bp",
    "diastolic_bp",
    "orthostatic_hr_rise",
    "spo2",
    "body_temp_c",
    "exercise_load_min",
    "bone_load_min",
    "body_mass",
)

# Deliberately not captured: sleep, mood, stress, social contact, symptoms,
# hydration, intake, vitamin D, strength checks, and glucose fingersticks.
# Those stay astronaut-entered because a habitat sensor cannot infer them.

CLAMPS: dict[str, tuple[float, float]] = {
    "heart_rate": (35, 200),
    "hrv_rmssd": (5, 200),
    "systolic_bp": (70, 220),
    "diastolic_bp": (40, 140),
    "orthostatic_hr_rise": (0, 60),
    "spo2": (85, 100),
    "body_temp_c": (34, 42),
    "exercise_load_min": (0, 240),
    "bone_load_min": (0, 120),
    "body_mass": (35, 200),
}

NOISE: dict[str, float] = {
    "heart_rate": 2.0,
    "hrv_rmssd": 1.5,
    "systolic_bp": 2.0,
    "diastolic_bp": 1.5,
    "orthostatic_hr_rise": 0.8,
    "spo2": 0.4,
    "body_temp_c": 0.05,
    "exercise_load_min": 2.0,
    "bone_load_min": 1.5,
    "body_mass": 0.1,
}

DECIMALS: dict[str, int] = {
    "heart_rate": 0,
    "hrv_rmssd": 1,
    "systolic_bp": 0,
    "diastolic_bp": 0,
    "orthostatic_hr_rise": 0,
    "spo2": 0,
    "body_temp_c": 1,
    "exercise_load_min": 0,
    "bone_load_min": 0,
    "body_mass": 1,
}

# One capture run per process is enough for the local demo.
_LOCK = threading.Lock()


def capture_source_for_profile(profile: str) -> str:
    if profile == "lunar_surface":
        return "lunar_capture"
    if profile == "station":
        return "iss_capture"
    return "mars_capture"


def source_label(source: str | None) -> str:
    if source is None:
        return "No capture"
    return CAPTURE_SOURCE_LABELS.get(source, source)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _latest_value(db: Session, user_id: int, code: str) -> float | None:
    value = db.scalar(
        select(Measurement.value)
        .where(Measurement.user_id == user_id, Measurement.metric_code == code)
        .order_by(Measurement.measured_at.desc())
        .limit(1)
    )
    return float(value) if value is not None else None


def _default_value(metric: MetricDefinition | None) -> float:
    if metric is None or metric.normal_min is None or metric.normal_max is None:
        return 0.0
    return (metric.normal_min + metric.normal_max) / 2


def _simulated_value(code: str, previous: float | None, metric: MetricDefinition | None) -> float:
    base = previous if previous is not None else _default_value(metric)
    value = base + random.gauss(0.0, NOISE.get(code, 1.0))
    low, high = CLAMPS.get(code, (0.0, 1000.0))
    value = max(low, min(high, value))
    return round(value, DECIMALS.get(code, 1))


def latest_capture_time(db: Session, user_id: int) -> datetime | None:
    value = db.scalar(
        select(func.max(Measurement.measured_at)).where(
            Measurement.user_id == user_id,
            Measurement.source.in_(CAPTURE_SOURCES),
            # Capture batches carry the "Simulated …" note. Check-ins can also
            # write capture sources for auto-filled values, but those must not
            # masquerade as a new sensor batch in the feed.
            Measurement.notes.like("Simulated %"),
        )
    )
    return _as_utc(value) if value is not None else None


def capture_due(db: Session, user_id: int, now: datetime) -> bool:
    latest = latest_capture_time(db, user_id)
    return latest is None or now - latest >= CAPTURE_INTERVAL


def simulate_capture(
    db: Session,
    user: User,
    *,
    now: datetime | None = None,
    force: bool = False,
) -> tuple[list[Measurement], bool]:
    """Create one simulated sensor capture batch for a user.

    Returns ``(measurements, created)``. The caller owns the commit. The
    per-process lock prevents two concurrent dashboard requests from writing
    the same capture twice.
    """
    now = now or datetime.now(UTC)
    with _LOCK:
        if not force and not capture_due(db, user.id, now):
            return [], False

        profile = profile_for_user(db, user)
        source = capture_source_for_profile(profile)
        label = source_label(source)
        created: list[Measurement] = []

        for code in CAPTURE_METRICS:
            metric = db.get(MetricDefinition, code)
            if metric is None:
                continue
            previous = _latest_value(db, user.id, code)
            value = _simulated_value(code, previous, metric)
            measurement = Measurement(
                user_id=user.id,
                metric_code=code,
                value=value,
                unit=metric.unit,
                measured_at=now,
                source=source,
                confidence=0.93,
                notes=f"Simulated {label} capture. Not a medical device.",
            )
            db.add(measurement)
            created.append(measurement)

        db.flush()
        return created, True


def build_capture_feed(
    db: Session,
    user: User,
    *,
    captured: bool = False,
    now: datetime | None = None,
) -> dict[str, Any]:
    now = now or datetime.now(UTC)
    latest = latest_capture_time(db, user.id)
    if latest is None:
        return {
            "source": None,
            "source_label": "No capture",
            "captured_at": None,
            "next_capture_at": now + CAPTURE_INTERVAL,
            "captured": captured,
            "simulated": True,
            "metrics": [],
        }

    rows = db.execute(
        select(Measurement, MetricDefinition)
        .join(MetricDefinition, Measurement.metric_code == MetricDefinition.code)
        .where(
            Measurement.user_id == user.id,
            Measurement.measured_at == latest,
            Measurement.source.in_(CAPTURE_SOURCES),
            Measurement.notes.like("Simulated %"),
        )
        .order_by(MetricDefinition.domain, MetricDefinition.name)
    ).all()

    source = rows[0][0].source if rows else None
    metrics = [
        {
            "metric_code": measurement.metric_code,
            "name": metric.name,
            "value": measurement.value,
            "unit": measurement.unit,
            "source": measurement.source,
            "measured_at": measurement.measured_at,
        }
        for measurement, metric in rows
    ]

    return {
        "source": source,
        "source_label": source_label(source),
        "captured_at": latest,
        "next_capture_at": latest + CAPTURE_INTERVAL,
        "captured": captured,
        "simulated": True,
        "metrics": metrics,
    }
