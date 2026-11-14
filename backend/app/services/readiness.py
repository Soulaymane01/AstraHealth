from __future__ import annotations

import json
import statistics
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Alert,
    Checkin,
    Crew,
    Measurement,
    MetricDefinition,
    Mission,
    ReadinessSnapshot,
    User,
)

RULES_PATH = Path(__file__).resolve().parents[2] / "data" / "rules.json"

BASELINE_DAYS = 21
BASELINE_END_OFFSET_DAYS = 3
HISTORY_DAYS = 28
MIN_BASELINE_POINTS = 3
TREND_Z_THRESHOLD = 2.0
TREND_ALERT_LIMIT = 2
CONTRIBUTION_SCALE = 10.0

# A score built from only one or two domains is not a comparable readiness
# picture. Below this share of the profile weight, a reassuring (nominal/watch)
# result is suppressed instead of being shown as a false "all clear". Low
# scores and fired hard rules are still returned.
MIN_WEIGHT_COVERAGE = 0.5

DOMAIN_KEYS = {
    "Cardiovascular": "cardiovascular",
    "Musculoskeletal": "musculoskeletal",
    "Sleep & circadian": "sleep",
    "Neurobehavioral": "neurobehavioral",
    "Metabolic & nutrition": "metabolic",
    "Immune & sensory": "immune",
}

DOMAIN_LABELS = {
    "cardiovascular": "Cardiovascular",
    "musculoskeletal": "Musculoskeletal",
    "sleep": "Sleep & circadian",
    "neurobehavioral": "Neurobehavioral",
    "metabolic": "Metabolic & nutrition",
    "immune": "Immune & sensory",
}

PROFILE_WEIGHTS = {
    "mars_transit": {
        "cardiovascular": 0.22,
        "musculoskeletal": 0.16,
        "sleep": 0.20,
        "neurobehavioral": 0.20,
        "metabolic": 0.12,
        "immune": 0.10,
    },
    "lunar_surface": {
        "cardiovascular": 0.18,
        "musculoskeletal": 0.20,
        "sleep": 0.16,
        "neurobehavioral": 0.18,
        "metabolic": 0.12,
        "immune": 0.16,
    },
    "station": {
        "cardiovascular": 0.20,
        "musculoskeletal": 0.20,
        "sleep": 0.18,
        "neurobehavioral": 0.18,
        "metabolic": 0.12,
        "immune": 0.12,
    },
}

MAX_AGE_DAYS = {
    "daily": 2,
    "every_3_days": 5,
    "weekly": 14,
}

SEVERITY_ORDER = {
    "nominal": 0,
    "watch": 1,
    "caution": 2,
    "critical": 3,
}

DOMAIN_ORDER = [
    "cardiovascular",
    "musculoskeletal",
    "sleep",
    "neurobehavioral",
    "metabolic",
    "immune",
]

TREND_ALERTS: dict[str, dict[str, str]] = {
    "hrv_rmssd": {
        "down_title": "HRV is below your baseline",
        "up_title": "HRV is above your baseline",
        "context": "Sleep debt, hydration, and workload often drive this pattern.",
        "action": (
            "Protect tonight's sleep window, review hydration, and repeat the measurement tomorrow."
        ),
    },
    "hydration_l": {
        "down_title": "Hydration is trending low",
        "up_title": "Hydration is above your baseline",
        "context": "Fluid shifts in microgravity make intake easy to under-read.",
        "action": "Add two 500 ml servings before the next exercise block.",
    },
    "sleep_efficiency_pct": {
        "down_title": "Sleep is fragmented",
        "up_title": "Sleep efficiency is unusually high",
        "context": "Efficiency is outside your usual range.",
        "action": "Protect the sleep window and review light exposure before bed.",
    },
    "sleep_latency_min": {
        "down_title": "Sleep latency is unusually short",
        "up_title": "Sleep latency is rising",
        "context": "Taking longer to fall asleep often follows stress or circadian drift.",
        "action": "Start the wind-down protocol 30 minutes earlier.",
    },
    "stress_score": {
        "down_title": "Stress is unusually low",
        "up_title": "Stress is elevated",
        "context": "Stress is outside your usual range.",
        "action": "Reduce non-essential load and protect the sleep window.",
    },
    "reaction_time_ms": {
        "down_title": "Reaction time is unusually fast",
        "up_title": "Reaction time is slower",
        "context": "Fatigue can slow simple reaction time.",
        "action": "Prioritize sleep and repeat the check when rested.",
    },
    "exercise_load_min": {
        "down_title": "Exercise load is below target",
        "up_title": "Exercise load is unusually high",
        "context": "Loading is outside your usual range.",
        "action": "Review the weekly training plan and schedule the next session.",
    },
    "bone_load_min": {
        "down_title": "Bone-load minutes are low",
        "up_title": "Bone-load minutes are unusually high",
        "context": "Mechanical loading is outside your usual range.",
        "action": "Add a bone-load session this week.",
    },
    "strength_check": {
        "down_title": "Strength is below baseline",
        "up_title": "Strength is above baseline",
        "context": "Relative strength is outside your usual range.",
        "action": "Review the resistance plan and repeat the check next week.",
    },
    "body_mass": {
        "down_title": "Body mass is below baseline",
        "up_title": "Body mass is above baseline",
        "context": "A rapid change can signal fluid or intake changes.",
        "action": "Review hydration and caloric intake.",
    },
    "caloric_intake": {
        "down_title": "Caloric intake is low",
        "up_title": "Caloric intake is high",
        "context": "Intake is outside your usual range.",
        "action": "Review the meal plan and protect the daily energy target.",
    },
    "vitamin_d": {
        "down_title": "Vitamin D is below baseline",
        "up_title": "Vitamin D is above baseline",
        "context": "Vitamin D status affects bone and immune health.",
        "action": "Review supplementation and repeat the check next week.",
    },
    "spo2": {
        "down_title": "Oxygen saturation is below baseline",
        "up_title": "Oxygen saturation is above baseline",
        "context": "A persistent drop needs review.",
        "action": "Repeat the measurement and contact the flight surgeon if it persists.",
    },
}

# Only adverse directions produce a trend alert. For example, a low sleep
# latency is fine; a high one is not.
ADVERSE_DIRECTION = {
    "hrv_rmssd": "down",
    "hydration_l": "down",
    "sleep_efficiency_pct": "down",
    "sleep_latency_min": "up",
    "stress_score": "up",
    "reaction_time_ms": "up",
    "exercise_load_min": "down",
    "bone_load_min": "down",
    "strength_check": "down",
    "body_mass": "both",
    "caloric_intake": "down",
    "vitamin_d": "down",
    "spo2": "down",
}


@dataclass
class ReadinessResult:
    score: float
    status: str
    domain_scores: dict[str, float]
    factors: list[dict[str, Any]]
    fired_rules: list[str]
    triggered_rules: list[dict[str, Any]] = field(repr=False)
    rule_metrics: set[str] = field(repr=False)
    metrics: list[dict[str, Any]] = field(repr=False)
    has_score: bool = True


@lru_cache
def load_rules() -> tuple[dict[str, Any], ...]:
    with RULES_PATH.open(encoding="utf-8") as handle:
        return tuple(json.load(handle))


@lru_cache
def rule_metric_codes() -> set[str]:
    codes: set[str] = set()

    def walk(condition: dict[str, Any]) -> None:
        if "all" in condition:
            for child in condition["all"]:
                walk(child)
        elif "any" in condition:
            for child in condition["any"]:
                walk(child)
        elif "consecutive" in condition:
            codes.add(condition["consecutive"]["metric"])
        elif "metric" in condition:
            codes.add(condition["metric"])

    for rule in load_rules():
        walk(rule["condition"])
    return codes


def status_for_score(score: float) -> str:
    if score >= 85:
        return "nominal"
    if score >= 70:
        return "watch"
    if score >= 50:
        return "caution"
    return "critical"


def profile_for_user(db: Session, user: User) -> str:
    if user.crew_id is None:
        return "mars_transit"
    crew = db.get(Crew, user.crew_id)
    if crew is None:
        return "mars_transit"
    mission = db.get(Mission, crew.mission_id)
    return mission.profile if mission is not None else "mars_transit"


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _compare(value: float, op: str, target: float) -> bool:
    if op == "lt":
        return value < target
    if op == "lte":
        return value <= target
    if op == "gt":
        return value > target
    if op == "gte":
        return value >= target
    if op == "eq":
        return value == target
    return False


def evaluate_condition(
    condition: dict[str, Any],
    latest_values: dict[str, float],
    daily_values: dict[str, dict[date, float]],
    symptoms: set[str],
    today: date,
) -> bool:
    if "all" in condition:
        return all(
            evaluate_condition(child, latest_values, daily_values, symptoms, today)
            for child in condition["all"]
        )

    if "any" in condition:
        return any(
            evaluate_condition(child, latest_values, daily_values, symptoms, today)
            for child in condition["any"]
        )

    if "symptom_any" in condition:
        keywords = [keyword.lower() for keyword in condition["symptom_any"]]
        return any(keyword in symptom for keyword in keywords for symptom in symptoms)

    if "consecutive" in condition:
        spec = condition["consecutive"]
        series = daily_values.get(spec["metric"], {})
        for offset in range(spec["days"]):
            day = today - timedelta(days=offset)
            if day not in series:
                return False
            if not _compare(series[day], spec["op"], spec["value"]):
                return False
        return True

    if "metric" in condition:
        value = latest_values.get(condition["metric"])
        if value is None:
            return False
        return _compare(value, condition["op"], condition["value"])

    return False


def _recent_symptoms(db: Session, user_id: int, reference_time: datetime) -> set[str]:
    """Union symptoms over the recent window.

    A newer symptom-free check-in must not clear an earlier red-flag report;
    chest pain, dyspnea, and vision loss stay visible until the window passes.
    """
    checkins = db.scalars(
        select(Checkin)
        .where(
            Checkin.user_id == user_id,
            Checkin.started_at >= reference_time - timedelta(days=3),
            Checkin.started_at <= reference_time,
        )
        .order_by(Checkin.started_at.desc())
    ).all()
    symptoms: set[str] = set()
    for checkin in checkins:
        symptoms.update(symptom.symptom.lower() for symptom in checkin.symptoms)
    return symptoms


def compute_readiness(
    db: Session,
    user: User,
    profile: str,
    reference_time: datetime,
    *,
    for_alerts: bool = False,
) -> ReadinessResult | None:
    metrics = db.scalars(
        select(MetricDefinition).order_by(MetricDefinition.domain, MetricDefinition.name)
    ).all()

    history_start = reference_time - timedelta(days=HISTORY_DAYS)
    rows = db.scalars(
        select(Measurement)
        .where(
            Measurement.user_id == user.id,
            Measurement.measured_at >= history_start,
            Measurement.measured_at <= reference_time,
        )
        .order_by(Measurement.measured_at.asc())
    ).all()
    if not rows:
        return None

    by_metric: dict[str, list[Measurement]] = {}
    latest_values: dict[str, float] = {}
    daily_values: dict[str, dict[date, float]] = {}

    for row in rows:
        by_metric.setdefault(row.metric_code, []).append(row)
        measured_at = _as_utc(row.measured_at)
        daily_values.setdefault(row.metric_code, {})[measured_at.date()] = row.value

    baseline_end = reference_time - timedelta(days=BASELINE_END_OFFSET_DAYS)
    baseline_start = baseline_end - timedelta(days=BASELINE_DAYS)

    domain_values: dict[str, list[float]] = {}
    factor_rows: list[dict[str, Any]] = []

    for metric in metrics:
        metric_rows = by_metric.get(metric.code, [])
        if not metric_rows:
            continue

        latest = metric_rows[-1]
        age_days = max(0.0, (reference_time - _as_utc(latest.measured_at)).total_seconds() / 86400)
        if age_days > MAX_AGE_DAYS.get(metric.frequency, 7):
            continue

        latest_values[metric.code] = latest.value

        baseline_rows = [
            row for row in metric_rows if baseline_start <= _as_utc(row.measured_at) <= baseline_end
        ]
        if len(baseline_rows) < MIN_BASELINE_POINTS:
            continue

        values = [row.value for row in baseline_rows]
        center = statistics.median(values)
        spread = max(
            statistics.pstdev(values) if len(values) > 1 else 0.0,
            metric.floor_sd,
        )
        z = (latest.value - center) / spread
        subscore = max(0.0, min(100.0, 100.0 - 18.0 * abs(z)))

        domain_key = DOMAIN_KEYS.get(metric.domain)
        if domain_key is None:
            continue

        domain_values.setdefault(domain_key, []).append(subscore)
        factor_rows.append(
            {
                "metric": metric.code,
                "label": metric.name,
                "value": round(latest.value, 2),
                "unit": metric.unit,
                "z": round(z, 2),
                "contribution": 0.0,
                "direction": "up" if z >= 0 else "down",
                "_subscore": subscore,
                "_domain": domain_key,
            }
        )

    # Evaluate hard rules from the latest values even when the user has no
    # baseline yet. A first-ever check-in can still report a red flag.
    symptoms = _recent_symptoms(db, user.id, reference_time)
    today = reference_time.date()
    fired: list[dict[str, Any]] = []

    for rule in load_rules():
        if evaluate_condition(rule["condition"], latest_values, daily_values, symptoms, today):
            fired.append(rule)

    fired_rule_ids = [rule["id"] for rule in fired]
    rule_metrics = rule_metric_codes()

    if not domain_values:
        if not fired:
            return None
        rule_status = "nominal"
        for rule in fired:
            if SEVERITY_ORDER.get(rule["severity"], 0) > SEVERITY_ORDER.get(rule_status, 0):
                rule_status = rule["severity"]
        return ReadinessResult(
            score=0.0,
            status=rule_status,
            domain_scores={},
            factors=[],
            fired_rules=fired_rule_ids,
            triggered_rules=fired,
            rule_metrics=rule_metrics,
            metrics=[],
            has_score=False,
        )

    domain_scores = {
        key: round(statistics.mean(values), 1) for key, values in domain_values.items()
    }
    domain_scores = {key: domain_scores[key] for key in DOMAIN_ORDER if key in domain_scores}

    weights = PROFILE_WEIGHTS.get(profile, PROFILE_WEIGHTS["mars_transit"])
    available = [(key, score) for key, score in domain_scores.items() if key in weights]
    total_weight = sum(weights[key] for key, _ in available)
    if total_weight <= 0:
        return None

    score = sum(weights[key] * domain_score for key, domain_score in available) / total_weight

    for factor in factor_rows:
        domain_key = factor["_domain"]
        count = len(domain_values[domain_key])
        weight = weights.get(domain_key, 0.0)
        factor["contribution"] = round(
            (factor["_subscore"] - 100.0)
            * weight
            * (1.0 / count)
            / total_weight
            * CONTRIBUTION_SCALE,
            1,
        )

    factors = sorted(
        (
            {
                "metric": factor["metric"],
                "label": factor["label"],
                "value": factor["value"],
                "unit": factor["unit"],
                "z": factor["z"],
                "contribution": factor["contribution"],
                "direction": factor["direction"],
            }
            for factor in factor_rows
        ),
        key=lambda factor: factor["contribution"],
    )

    metric_details = [
        {
            "metric": factor["metric"],
            "label": factor["label"],
            "value": factor["value"],
            "unit": factor["unit"],
            "z": factor["z"],
            "subscore": round(factor["_subscore"], 1),
            "status": status_for_score(factor["_subscore"]),
            "direction": factor["direction"],
            "domain": factor["_domain"],
        }
        for factor in factor_rows
    ]

    status = status_for_score(score)
    for rule in fired:
        if SEVERITY_ORDER.get(rule["severity"], 0) > SEVERITY_ORDER.get(status, 0):
            status = rule["severity"]

    # Sparse data must never read as a reassuring all-clear. Low scores and
    # fired rules are still returned because they are actionable.
    if total_weight < MIN_WEIGHT_COVERAGE and not fired and status in {"nominal", "watch"}:
        if not for_alerts:
            return None
        # Alert reconciliation still needs the factor list (e.g. to resolve a
        # trend alert when the metric has returned to baseline), but no
        # composite snapshot is stored for a sparse result.
        return ReadinessResult(
            score=round(score, 1),
            status=status,
            domain_scores=domain_scores,
            factors=factors,
            fired_rules=fired_rule_ids,
            triggered_rules=fired,
            rule_metrics=rule_metrics,
            metrics=metric_details,
            has_score=False,
        )

    return ReadinessResult(
        score=round(score, 1),
        status=status,
        domain_scores=domain_scores,
        factors=factors,
        fired_rules=fired_rule_ids,
        triggered_rules=fired,
        rule_metrics=rule_metrics,
        metrics=metric_details,
    )


def _upsert_alert(
    db: Session,
    user_id: int,
    rule_id: str,
    severity: str,
    title: str,
    rationale: str,
    recommended_action: str,
    reference_time: datetime,
) -> Alert:
    existing = db.scalar(
        select(Alert).where(
            Alert.user_id == user_id,
            Alert.rule_id == rule_id,
            Alert.status.in_(("active", "acknowledged")),
        )
    )
    if existing is not None:
        existing.severity = severity
        existing.title = title
        existing.rationale = rationale
        existing.recommended_action = recommended_action
        return existing

    alert = Alert(
        user_id=user_id,
        severity=severity,
        rule_id=rule_id,
        title=title,
        rationale=rationale,
        recommended_action=recommended_action,
        status="active",
        created_at=reference_time,
    )
    db.add(alert)
    return alert


def generate_alerts(
    db: Session,
    user: User,
    result: ReadinessResult,
    reference_time: datetime,
) -> list[Alert]:
    active_rule_ids: set[str] = set()
    touched: list[Alert] = []

    for rule in result.triggered_rules:
        alert = _upsert_alert(
            db,
            user.id,
            rule["id"],
            rule["severity"],
            rule["title"],
            rule["rationale"],
            rule["recommended_action"],
            reference_time,
        )
        active_rule_ids.add(rule["id"])
        touched.append(alert)

    candidates: list[tuple[dict[str, Any], dict[str, str], str]] = []
    for factor in result.factors:
        if factor["metric"] in result.rule_metrics:
            continue
        if abs(factor["z"]) < TREND_Z_THRESHOLD:
            continue
        template = TREND_ALERTS.get(factor["metric"])
        if template is None:
            continue
        direction = "down" if factor["z"] < 0 else "up"
        adverse = ADVERSE_DIRECTION.get(factor["metric"], "both")
        if adverse not in ("both", direction):
            continue
        candidates.append((factor, template, direction))

    candidates.sort(key=lambda item: item[0]["contribution"])

    for factor, template, direction in candidates[:TREND_ALERT_LIMIT]:
        title = template["down_title"] if direction == "down" else template["up_title"]
        rationale = (
            f"{factor['label']} is {abs(factor['z']):.1f} standard deviations "
            f"{'below' if direction == 'down' else 'above'} your 21-day baseline. "
            f"{template['context']}"
        )
        severity = "caution" if abs(factor["z"]) >= 2.0 else "watch"
        rule_id = f"trend-{factor['metric']}"

        alert = _upsert_alert(
            db,
            user.id,
            rule_id,
            severity,
            title,
            rationale,
            template["action"],
            reference_time,
        )
        active_rule_ids.add(rule_id)
        touched.append(alert)

    existing = db.scalars(
        select(Alert).where(
            Alert.user_id == user.id,
            Alert.status.in_(("active", "acknowledged")),
        )
    ).all()
    for alert in existing:
        if alert.rule_id not in active_rule_ids:
            alert.status = "resolved"

    return touched


def persist_readiness(
    db: Session,
    user: User,
    result: ReadinessResult,
    reference_time: datetime,
) -> ReadinessSnapshot | None:
    # A rule-only result (no baseline yet) still produces alerts, but there is
    # no composite score to store.
    if not result.has_score:
        generate_alerts(db, user, result, reference_time)
        db.flush()
        return None

    snapshot = ReadinessSnapshot(
        user_id=user.id,
        computed_at=reference_time,
        score=result.score,
        status=result.status,
        domain_scores=result.domain_scores,
        factors=result.factors[:8],
        fired_rules=result.fired_rules,
    )
    db.add(snapshot)
    generate_alerts(db, user, result, reference_time)
    db.flush()
    return snapshot


def compute_and_persist_readiness(
    db: Session,
    user: User,
    profile: str,
    reference_time: datetime,
) -> ReadinessSnapshot | None:
    result = compute_readiness(db, user, profile, reference_time, for_alerts=True)
    if result is None:
        return None
    return persist_readiness(db, user, result, reference_time)
