from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.models import (
    Alert,
    Checkin,
    KnowledgeArticle,
    Measurement,
    MetricDefinition,
    ReadinessSnapshot,
    SurgeonInstruction,
    User,
)
from app.schemas.assistant import AssistantAnswerRead, AssistantCitationRead
from app.schemas.prediction import PredictionRead
from app.services.knowledge import get_articles
from app.services.prediction import predict_crew_risk

MAX_WORDS = 140

REFUSAL_TERMS = (
    "diagnose",
    "diagnosis",
    "prescribe",
    "prescription",
    "dose",
    "dosage",
    "medication",
    "medicine",
    "drug",
    "antibiotic",
    "what disease",
    "do i have",
    "is this cancer",
    "treat",
    "cure",
)

METRIC_TO_SLUG = {
    "hrv_rmssd": "hrv-basics",
    "heart_rate": "hrv-basics",
    "sleep_efficiency_pct": "sleep-circadian",
    "sleep_duration_h": "sleep-circadian",
    "sleep_latency_min": "sleep-circadian",
    "body_temp_c": "immune-changes",
    "spo2": "immune-changes",
    "symptom_score": "immune-changes",
    "mood_score": "isolation-confinement",
    "stress_score": "isolation-confinement",
    "social_interaction_score": "isolation-confinement",
    "hydration_l": "hydration-nutrition",
    "caloric_intake": "hydration-nutrition",
    "vitamin_d": "hydration-nutrition",
    "body_mass": "hydration-nutrition",
    "exercise_load_min": "bone-loading",
    "bone_load_min": "bone-loading",
    "strength_check": "bone-loading",
}

INTENT_SLUGS = {
    "prediction": ["red-flags", "hrv-basics", "sleep-circadian"],
    "readiness": ["hrv-basics", "sleep-circadian", "red-flags"],
    "alerts": ["red-flags", "immune-changes", "hrv-basics"],
    "sleep": ["sleep-circadian", "hrv-basics", "isolation-confinement"],
    "hrv": ["hrv-basics", "sleep-circadian", "red-flags"],
    "mood": ["isolation-confinement", "sleep-circadian", "red-flags"],
    "summary": ["hrv-basics", "sleep-circadian", "red-flags"],
    "questions": ["red-flags", "sleep-circadian", "isolation-confinement"],
    "refusal": ["red-flags", "immune-changes"],
    "general": ["red-flags", "hrv-basics", "sleep-circadian"],
}

SUGGESTIONS = {
    "prediction": [
        "Which signals are worsening?",
        "What should I monitor next?",
        "What questions should I ask the crew?",
    ],
    "readiness": [
        "What is driving the readiness score?",
        "What is the early-warning risk?",
        "Summarize the last 72 hours.",
    ],
    "alerts": [
        "Is there a red flag I should escalate?",
        "What is the early-warning risk?",
        "What should I monitor next?",
    ],
    "sleep": [
        "What is the early-warning risk?",
        "What should I ask the crew about sleep?",
    ],
    "hrv": [
        "What is the early-warning risk?",
        "What is driving the readiness score?",
    ],
    "mood": [
        "What is the early-warning risk?",
        "What questions should I ask the crew?",
    ],
    "summary": [
        "What is the early-warning risk?",
        "What should I monitor next?",
    ],
    "questions": [
        "What is the early-warning risk?",
        "Summarize the last 72 hours.",
    ],
    "refusal": [
        "What is the early-warning risk?",
        "What should I monitor next?",
    ],
    "general": [
        "What is the early-warning risk?",
        "Which signals are worsening?",
        "Summarize the last 72 hours.",
    ],
}


@dataclass
class SurgeonContext:
    member: User
    snapshot: ReadinessSnapshot | None
    alerts: list[Alert]
    prediction: PredictionRead
    checkins: list[Checkin]
    metrics: dict[str, dict[str, object]]
    open_followups: list[SurgeonInstruction]
    articles: list[KnowledgeArticle]


def _normalize(question: str) -> str:
    return re.sub(r"\s+", " ", question.lower().strip())


def detect_intent(question: str) -> str:
    text = _normalize(question)
    if any(term in text for term in REFUSAL_TERMS):
        return "refusal"
    if any(
        term in text
        for term in (
            "risk",
            "predict",
            "deterior",
            "future",
            "next 24",
            "next 48",
            "early warning",
            "early-warning",
        )
    ):
        return "prediction"
    if any(term in text for term in ("alert", "red flag", "red-flag", "escalat", "critical")):
        return "alerts"
    if any(term in text for term in ("readiness", "score", "factor", "why")):
        return "readiness"
    if any(term in text for term in ("sleep", "tired", "insomnia", "fatigue")):
        return "sleep"
    if any(term in text for term in ("hrv", "heart rate", "heart")):
        return "hrv"
    if any(term in text for term in ("mood", "stress", "anxious", "lonely", "isolation")):
        return "mood"
    if any(term in text for term in ("summary", "summarize", "changes", "last 72", "last 24")):
        return "summary"
    if any(term in text for term in ("ask", "question")):
        return "questions"
    return "general"


def build_context(db: Session, member: User) -> SurgeonContext:
    snapshot = db.scalar(
        select(ReadinessSnapshot)
        .where(ReadinessSnapshot.user_id == member.id)
        .order_by(ReadinessSnapshot.computed_at.desc())
        .limit(1)
    )
    alerts = list(
        db.scalars(
            select(Alert)
            .where(Alert.user_id == member.id, Alert.status == "active")
            .order_by(Alert.created_at.desc())
        ).all()
    )
    checkins = list(
        db.scalars(
            select(Checkin)
            .options(selectinload(Checkin.entries), selectinload(Checkin.symptoms))
            .where(Checkin.user_id == member.id)
            .order_by(Checkin.started_at.desc())
            .limit(3)
        ).all()
    )
    rows = db.execute(
        select(Measurement, MetricDefinition)
        .join(MetricDefinition, Measurement.metric_code == MetricDefinition.code)
        .where(
            Measurement.user_id == member.id,
            Measurement.measured_at >= datetime.now(UTC) - timedelta(days=7),
        )
        .order_by(Measurement.measured_at.desc())
    ).all()
    metrics: dict[str, dict[str, object]] = {}
    for measurement, metric in rows:
        metrics.setdefault(
            measurement.metric_code,
            {
                "label": metric.name,
                "value": measurement.value,
                "unit": metric.unit,
                "source": measurement.source,
            },
        )

    prediction = predict_crew_risk(db, member)
    followups = list(
        db.scalars(
            select(SurgeonInstruction)
            .where(
                SurgeonInstruction.crew_user_id == member.id,
                SurgeonInstruction.source == "ai",
                SurgeonInstruction.status == "open",
            )
            .order_by(SurgeonInstruction.created_at.desc())
            .limit(3)
        ).all()
    )
    return SurgeonContext(
        member=member,
        snapshot=snapshot,
        alerts=alerts,
        prediction=prediction,
        checkins=checkins,
        metrics=metrics,
        open_followups=followups,
        articles=[],
    )


def _article_slugs(intent: str, context: SurgeonContext) -> list[str]:
    slugs: list[str] = []
    for slug in INTENT_SLUGS.get(intent, INTENT_SLUGS["general"]):
        if slug not in slugs:
            slugs.append(slug)
    for driver in context.prediction.drivers:
        slug = METRIC_TO_SLUG.get(driver.metric)
        if slug and slug not in slugs:
            slugs.append(slug)
    return slugs[:3]


def _metric(context: SurgeonContext, code: str) -> str:
    item = context.metrics.get(code)
    if not item:
        return f"{code} unavailable"
    return f"{item['label']} {item['value']} {item['unit']}"


def _factor_lines(context: SurgeonContext, limit: int = 3) -> str:
    if not context.snapshot or not context.snapshot.factors:
        return "no factor breakdown yet"
    parts = []
    for factor in context.snapshot.factors[:limit]:
        parts.append(
            f"{factor.get('label', factor.get('metric'))} "
            f"{factor.get('value')} {factor.get('unit', '')} (z {factor.get('z')})"
        )
    return "; ".join(parts)


def _alert_lines(context: SurgeonContext) -> str:
    if not context.alerts:
        return "no active alerts"
    return "; ".join(
        f"{alert.severity} {alert.title}" for alert in context.alerts[:4]
    )


def _prediction_answer(context: SurgeonContext) -> str:
    prediction = context.prediction
    drivers = "; ".join(
        f"{driver.label}: {driver.evidence}" for driver in prediction.drivers[:3]
    )
    recommendations = " ".join(prediction.recommendations[:2])
    followup = (
        f"An AI follow-up request is open: {context.open_followups[0].message}"
        if context.open_followups
        else ""
    )
    return (
        f"{prediction.summary} Risk score {prediction.risk_score}/100, "
        f"confidence {prediction.confidence}, data coverage "
        f"{round(prediction.data_coverage * 100)}%. "
        f"{('Drivers: ' + drivers + ' ') if drivers else ''}"
        f"{recommendations} {followup} "
        "This is decision support, not a diagnosis."
    )


def _readiness_answer(context: SurgeonContext) -> str:
    if not context.snapshot:
        return (
            "There is no composite readiness snapshot yet. Review the captures and "
            "check-ins directly; this is decision support, not a diagnosis."
        )
    return (
        f"{context.member.full_name} is {context.snapshot.status} at "
        f"{context.snapshot.score}/100. Top factors: {_factor_lines(context)}. "
        f"Active alerts: {_alert_lines(context)}. "
        f"Early-warning risk is {context.prediction.risk_level} over the next "
        f"{context.prediction.horizon_hours} hours. This is decision support, not a diagnosis."
    )


def _alerts_answer(context: SurgeonContext) -> str:
    if not context.alerts:
        return (
            "No active alerts right now. Continue routine monitoring and repeat the "
            "next scheduled capture/check-in. This is decision support, not a diagnosis."
        )
    critical = [alert for alert in context.alerts if alert.severity == "critical"]
    if critical:
        return (
            f"{len(critical)} critical alert(s) active: {_alert_lines(context)}. "
            "Review the red-flag criteria and escalate to the mission medical officer "
            "now. This is decision support, not a diagnosis."
        )
    return (
        f"Active alerts: {_alert_lines(context)}. Review the rationale and recommended "
        "action, repeat the affected measurement, and document your decision. "
        "This is decision support, not a diagnosis."
    )


def _sleep_answer(context: SurgeonContext) -> str:
    values = "; ".join(
        _metric(context, code)
        for code in ("sleep_duration_h", "sleep_efficiency_pct", "sleep_latency_min")
    )
    return (
        f"{values}. Sleep is the strongest modifiable driver in the current record. "
        "Protect the sleep window, review light/caffeine exposure, and repeat the "
        "check-in tomorrow. This is decision support, not a diagnosis."
    )


def _hrv_answer(context: SurgeonContext) -> str:
    return (
        f"{_metric(context, 'hrv_rmssd')} and {_metric(context, 'heart_rate')}. "
        "Compare the trend with the personal baseline and pair it with sleep, hydration, "
        "and symptoms. A single reading is not a diagnosis. This is decision support, "
        "not a diagnosis."
    )


def _mood_answer(context: SurgeonContext) -> str:
    values = "; ".join(
        _metric(context, code)
        for code in ("mood_score", "stress_score", "social_interaction_score")
    )
    return (
        f"{values}. Review sleep, workload, and crew contact, and offer a private "
        "check-in. This is decision support, not a diagnosis."
    )


def _summary_answer(context: SurgeonContext) -> str:
    checkins = context.checkins
    checkin_text = (
        "; ".join(
            f"{checkin.completed_at.date()} with {len(checkin.symptoms)} symptoms"
            for checkin in checkins
            if checkin.completed_at is not None
        )
        if checkins
        else "no recent check-ins"
    ) or "no recent check-ins"
    return (
        f"Recent check-ins: {checkin_text}. Latest captures: {_metric(context, 'heart_rate')}, "
        f"{_metric(context, 'body_temp_c')}, {_metric(context, 'spo2')}. "
        f"Early-warning risk is {context.prediction.risk_level} over the next "
        f"{context.prediction.horizon_hours} hours. This is decision support, not a diagnosis."
    )


def _questions_answer(context: SurgeonContext) -> str:
    questions = [
        "How did you sleep, and how restored do you feel?",
        "Any chest pain, shortness of breath, fever, or vision change?",
        "How is your mood and crew contact compared with last week?",
        "Are you able to repeat the affected measurement now?",
    ]
    if context.prediction.drivers:
        questions.insert(
            0,
            f"Have you noticed a change in {context.prediction.drivers[0].label.lower()}?",
        )
    return "Questions to ask: " + " ".join(questions[:4])


def _general_answer(context: SurgeonContext) -> str:
    drivers = "; ".join(
        driver.label for driver in context.prediction.drivers[:3]
    ) or "none above threshold"
    return (
        f"{context.member.full_name}: {_readiness_answer(context)} "
        f"Early-warning drivers: {drivers}."
    )


def _deterministic_answer(intent: str, context: SurgeonContext) -> tuple[str, bool]:
    if intent == "refusal":
        return (
            "I can't diagnose, prescribe, or recommend a medication or dose. I can "
            "summarize the captured trends, flag early-warning signals, and suggest "
            "monitoring or questions for the flight surgeon. If a red flag is present, "
            "escalate now. This is decision support, not a diagnosis.",
            True,
        )
    if intent == "prediction":
        return _prediction_answer(context), False
    if intent == "readiness":
        return _readiness_answer(context), False
    if intent == "alerts":
        return _alerts_answer(context), False
    if intent == "sleep":
        return _sleep_answer(context), False
    if intent == "hrv":
        return _hrv_answer(context), False
    if intent == "mood":
        return _mood_answer(context), False
    if intent == "summary":
        return _summary_answer(context), False
    if intent == "questions":
        return _questions_answer(context), False
    return _general_answer(context), False


def _llm_answer(context: SurgeonContext, question: str) -> str | None:
    if (
        settings.llm_provider == "none"
        or not settings.llm_api_key
        or not settings.llm_model
    ):
        return None

    drivers = "; ".join(
        f"{driver.label} ({driver.severity}): {driver.evidence}"
        for driver in context.prediction.drivers[:4]
    )
    articles = "; ".join(
        f"{article.slug}: {article.title}" for article in context.articles
    )
    system = (
        "You are a clinical decision-support assistant for an Earth-based flight "
        "surgeon. Do not diagnose, prescribe, recommend a medication, or give a dose. "
        "Summarize the provided data, flag early-warning signals, suggest monitoring "
        "or questions, and state uncertainty. Cite the provided sources by slug. "
        f"Answer in at most {MAX_WORDS} words."
    )
    user = (
        f"Crew member: {context.member.full_name}. "
        f"Readiness: {context.snapshot.score if context.snapshot else 'not scored'} "
        f"{context.snapshot.status if context.snapshot else ''}. "
        f"Active alerts: {_alert_lines(context)}. "
        f"Early-warning: {context.prediction.risk_level} {context.prediction.risk_score}/100 "
        f"over {context.prediction.horizon_hours}h. Drivers: {drivers or 'none'}. "
        f"Recommendations: {'; '.join(context.prediction.recommendations)}. "
        f"Recent check-ins: {len(context.checkins)}. Sources: {articles or 'none'}. "
        f"Flight surgeon question: {question}"
    )
    try:
        response = httpx.post(
            f"{settings.llm_base_url.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {settings.llm_api_key}"},
            json={
                "model": settings.llm_model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": 0.2,
                "max_tokens": 320,
            },
            timeout=20.0,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"].strip()
    except (httpx.HTTPError, KeyError, TypeError, ValueError):
        return None

    if not content:
        return None
    lowered = content.lower()
    if any(
        phrase in lowered
        for phrase in ("you have ", "diagnosis is", "i diagnose", "prescribe", " mg")
    ):
        return None
    words = content.split()
    if len(words) > MAX_WORDS:
        content = " ".join(words[:MAX_WORDS]) + "…"
    return content


def answer_surgeon_question(
    db: Session,
    member: User,
    question: str,
) -> AssistantAnswerRead:
    intent = detect_intent(question)
    context = build_context(db, member)
    context.articles = get_articles(db, _article_slugs(intent, context))

    if intent == "refusal":
        answer, refused = _deterministic_answer(intent, context)
        mode = "rule_based"
    else:
        llm = _llm_answer(context, question)
        if llm:
            answer = llm
            refused = False
            mode = "llm"
        else:
            answer, refused = _deterministic_answer(intent, context)
            mode = "rule_based"

    words = answer.split()
    if len(words) > MAX_WORDS:
        answer = " ".join(words[:MAX_WORDS]) + "…"

    citations = [
        AssistantCitationRead(
            slug=article.slug,
            title=article.title,
            source_name=article.source_name,
            source_url=article.source_url,
            citation=article.citation,
        )
        for article in context.articles
    ]
    if not citations and intent == "refusal":
        # A refusal should still point at the red-flag guidance when available.
        red_flags = get_articles(db, ["red-flags"])
        citations = [
            AssistantCitationRead(
                slug=article.slug,
                title=article.title,
                source_name=article.source_name,
                source_url=article.source_url,
                citation=article.citation,
            )
            for article in red_flags
        ]

    return AssistantAnswerRead(
        answer=answer,
        citations=citations,
        suggestions=SUGGESTIONS.get(intent, SUGGESTIONS["general"]),
        mode=mode,
        refused=refused,
    )
