from __future__ import annotations

import statistics
from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Alert, Measurement, MetricDefinition, User
from app.schemas.prediction import (
    PredictionRead,
    PredictionSignalRead,
)
from app.services.readiness import (
    BASELINE_DAYS,
    BASELINE_END_OFFSET_DAYS,
    HISTORY_DAYS,
    MIN_BASELINE_POINTS,
)

WINDOW_DAYS = 7
PREDICTION_DISCLAIMER = (
    "Heuristic early-warning support from recent measurements. It is not a "
    "diagnosis and does not guarantee an outcome; clinical judgment remains "
    "with the flight surgeon."
)

# (metric code, label, adverse direction)
SIGNAL_METRICS: tuple[tuple[str, str, str], ...] = (
    ("heart_rate", "Heart rate", "up"),
    ("hrv_rmssd", "HRV (RMSSD)", "down"),
    ("systolic_bp", "Systolic pressure", "up"),
    ("diastolic_bp", "Diastolic pressure", "up"),
    ("body_temp_c", "Core temperature", "up"),
    ("spo2", "Oxygen saturation", "down"),
    ("sleep_efficiency_pct", "Sleep efficiency", "down"),
    ("sleep_duration_h", "Sleep duration", "down"),
    ("sleep_latency_min", "Sleep latency", "up"),
    ("stress_score", "Stress", "up"),
    ("mood_score", "Mood", "down"),
    ("symptom_score", "Symptom load", "up"),
    ("hydration_l", "Hydration", "down"),
    ("caloric_intake", "Caloric intake", "down"),
    ("exercise_load_min", "Exercise load", "down"),
)

ALERT_WEIGHT = {"critical": 28, "caution": 10, "watch": 4}
SIGNAL_WEIGHT = {"watch": 3, "moderate": 7, "high": 12}
SIGNAL_RANK = {"watch": 0, "moderate": 1, "high": 2}


@dataclass
class _MetricState:
    latest: float
    z: float | None
    trend_per_week: float | None
    baseline: float | None
    sd: float | None
    points: int


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _daily_values(rows: list[Measurement]) -> dict[object, float]:
    by_day: dict[object, list[Measurement]] = defaultdict(list)
    for row in rows:
        by_day[_as_utc(row.measured_at).date()].append(row)
    return {
        day: max(items, key=lambda item: _as_utc(item.measured_at)).value
        for day, items in by_day.items()
    }


def _slope_per_week(values: list[tuple[int, float]]) -> float | None:
    if len(values) < 2:
        return None
    mean_x = sum(x for x, _ in values) / len(values)
    mean_y = sum(y for _, y in values) / len(values)
    denominator = sum((x - mean_x) ** 2 for x, _ in values)
    if denominator == 0:
        return None
    slope = sum((x - mean_x) * (y - mean_y) for x, y in values) / denominator
    return slope * 7


def _state(rows: list[Measurement], metric: MetricDefinition, now: datetime) -> _MetricState | None:
    if not rows:
        return None
    by_day = _daily_values(rows)
    days = sorted(by_day)
    latest = by_day[days[-1]]

    baseline_end = now - timedelta(days=BASELINE_END_OFFSET_DAYS)
    baseline_start = baseline_end - timedelta(days=BASELINE_DAYS)
    baseline_values = [
        value
        for day, value in by_day.items()
        if baseline_start.date() <= day <= baseline_end.date()
    ]
    center = sd = z = None
    if len(baseline_values) >= MIN_BASELINE_POINTS:
        center = statistics.median(baseline_values)
        sd = max(
            statistics.pstdev(baseline_values) if len(baseline_values) > 1 else 0.0,
            metric.floor_sd,
        )
        z = (latest - center) / sd if sd else None

    recent_start = (now - timedelta(days=WINDOW_DAYS)).date()
    recent = [(index, by_day[day]) for index, day in enumerate(days) if day >= recent_start]
    trend = _slope_per_week(recent)

    return _MetricState(
        latest=latest,
        z=round(z, 2) if z is not None else None,
        trend_per_week=round(trend, 3) if trend is not None else None,
        baseline=round(center, 2) if center is not None else None,
        sd=round(sd, 2) if sd is not None else None,
        points=len(rows),
    )


def _signal(
    label: str,
    code: str,
    direction: str,
    state: _MetricState,
    metric: MetricDefinition,
) -> PredictionSignalRead | None:
    adverse = (direction == "up" and (state.z or 0) > 0) or (
        direction == "down" and (state.z or 0) < 0
    )
    if state.z is not None and not adverse:
        return None

    z_strength = abs(state.z) if state.z is not None and adverse else 0.0
    trend_strength = 0.0
    if state.trend_per_week is not None and state.sd:
        trend_strength = abs(state.trend_per_week) / max(state.sd, 1e-6)
    strength = max(z_strength, trend_strength)
    if strength < 1.5:
        return None

    if strength >= 3.0:
        severity = "high"
    elif strength >= 2.0:
        severity = "moderate"
    else:
        severity = "watch"

    pieces: list[str] = []
    if state.z is not None:
        pieces.append(
            f"{state.latest:.1f} {metric.unit} is {abs(state.z):.1f} SD "
            f"{'below' if state.z < 0 else 'above'} the 21-day baseline"
        )
    if state.trend_per_week is not None and state.sd:
        movement = "falling" if state.trend_per_week < 0 else "rising"
        pieces.append(
            f"trending {movement} by {abs(state.trend_per_week):.1f} {metric.unit}/week"
        )
    if not pieces:
        pieces.append(
            "recent readings moved outside the personal baseline "
            f"({state.latest:.1f} {metric.unit})"
        )

    return PredictionSignalRead(
        metric=code,
        label=label,
        direction=direction,
        severity=severity,
        latest_value=round(state.latest, 2),
        unit=metric.unit,
        z=state.z,
        trend_per_week=state.trend_per_week,
        evidence="; ".join(pieces) + ".",
    )


def _red_flags(alerts: list[Alert], latest: dict[str, float]) -> list[str]:
    flags: list[str] = []
    for alert in alerts:
        if alert.status == "active" and alert.severity == "critical":
            flags.append(alert.title)
    temperature = latest.get("body_temp_c")
    heart_rate = latest.get("heart_rate")
    spo2 = latest.get("spo2")
    if (
        temperature is not None
        and heart_rate is not None
        and temperature >= 38
        and heart_rate > 100
    ):
        flags.append("Fever at or above 38 °C with tachycardia")
    if spo2 is not None and spo2 < 92:
        flags.append("Oxygen saturation below 92%")
    return list(dict.fromkeys(flags))


def _recommendations(signals: list[PredictionSignalRead], red_flags: list[str]) -> list[str]:
    if red_flags:
        return [
            "Review the red-flag criteria and contact criteria with the crew member now.",
            "Repeat temperature, heart rate, and oxygen saturation; document the trend.",
            "Decide whether to escalate to the flight surgeon on console or the "
            "mission medical officer.",
        ]

    codes = {signal.metric for signal in signals}
    recommendations: list[str] = []
    if codes & {"body_temp_c", "heart_rate", "spo2", "symptom_score"}:
        recommendations.append(
            "Repeat the affected vital and symptom check within 24 hours; review "
            "the fever and respiratory criteria."
        )
    if codes & {"hrv_rmssd", "sleep_efficiency_pct", "sleep_duration_h", "sleep_latency_min"}:
        recommendations.append(
            "Protect the sleep window tonight, review caffeine/light exposure, and "
            "repeat the check-in tomorrow."
        )
    if codes & {"hydration_l", "caloric_intake"}:
        recommendations.append("Review fluid and energy intake against the daily target.")
    if codes & {"mood_score", "stress_score"}:
        recommendations.append(
            "Schedule a private crew check-in and review sleep, workload, and isolation."
        )
    if codes & {"exercise_load_min"}:
        recommendations.append("Review the training plan and loading adherence for the week.")
    if not recommendations:
        recommendations.append(
            "Continue the current routine and repeat the next scheduled capture/check-in."
        )
    return recommendations


def predict_crew_risk(db: Session, member: User, now: datetime | None = None) -> PredictionRead:
    now = now or datetime.now(UTC)
    metrics = db.scalars(select(MetricDefinition)).all()
    metric_map = {metric.code: metric for metric in metrics}
    rows = list(
        db.scalars(
            select(Measurement)
            .where(
                Measurement.user_id == member.id,
                Measurement.measured_at >= now - timedelta(days=HISTORY_DAYS),
                Measurement.measured_at <= now,
            )
            .order_by(Measurement.measured_at.asc())
        ).all()
    )
    by_code: dict[str, list[Measurement]] = defaultdict(list)
    for row in rows:
        by_code[row.metric_code].append(row)

    signals: list[PredictionSignalRead] = []
    latest_values: dict[str, float] = {}
    baselines = 0
    for code, label, direction in SIGNAL_METRICS:
        metric = metric_map.get(code)
        if metric is None:
            continue
        state = _state(by_code.get(code, []), metric, now)
        if state is None:
            continue
        latest_values[code] = state.latest
        if state.baseline is not None:
            baselines += 1
        signal = _signal(label, code, direction, state, metric)
        if signal is not None:
            signals.append(signal)

    signals.sort(
        key=lambda signal: (SIGNAL_RANK[signal.severity], abs(signal.z or 0)),
        reverse=True,
    )
    top_signals = signals[:5]

    alerts = list(
        db.scalars(
            select(Alert).where(Alert.user_id == member.id, Alert.status == "active")
        ).all()
    )
    alert_points = sum(ALERT_WEIGHT.get(alert.severity, 4) for alert in alerts)
    # Use the two strongest signals for the score; the full ranked list is still
    # shown as drivers. This keeps a single noisy metric from looking critical.
    signal_points = sum(
        SIGNAL_WEIGHT[signal.severity] for signal in top_signals[:2]
    )
    red_flags = _red_flags(alerts, latest_values)
    critical_active = any(alert.severity == "critical" for alert in alerts)
    risk_score = min(100, alert_points + signal_points + (15 * len(red_flags)))
    # An active critical alert or a red flag is high risk by definition; the
    # score is a supporting signal, not a reason to downgrade it.
    if red_flags or critical_active:
        risk_score = max(risk_score, 65)
        risk_level = "high"
        horizon = 48
    elif risk_score >= 60:
        risk_level = "high"
        horizon = 48
    elif risk_score >= 35:
        risk_level = "moderate"
        horizon = 72
    else:
        risk_level = "low"
        horizon = 168

    expected = len(SIGNAL_METRICS)
    data_coverage = round(min(1.0, baselines / expected), 2)
    if data_coverage >= 0.6:
        confidence = "high"
    elif data_coverage >= 0.3:
        confidence = "medium"
    else:
        confidence = "low"

    if red_flags:
        summary = (
            f"{risk_level.title()} early-warning risk over the next {horizon} hours. "
            f"Red flags: {', '.join(red_flags)}. Review immediately."
        )
    elif top_signals:
        summary = (
            f"{risk_level.title()} early-warning risk over the next {horizon} hours. "
            "Strongest signals: "
            + ", ".join(signal.label for signal in top_signals[:3])
            + "."
        )
    else:
        summary = (
            "No adverse early-warning signal crossed the threshold. Continue routine "
            "monitoring and the next scheduled check-in."
        )

    return PredictionRead(
        risk_score=risk_score,
        risk_level=risk_level,
        horizon_hours=horizon,
        summary=summary,
        drivers=top_signals,
        recommendations=_recommendations(top_signals, red_flags),
        confidence=confidence,
        data_coverage=data_coverage,
        red_flags=red_flags,
        disclaimer=PREDICTION_DISCLAIMER,
    )
