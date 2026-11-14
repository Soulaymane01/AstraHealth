from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import (
    Alert,
    KnowledgeArticle,
    Measurement,
    MetricDefinition,
    ReadinessSnapshot,
    User,
)
from app.schemas.assistant import (
    AssistantAnswerRead,
    AssistantCitationRead,
    AssistantSuggestionRead,
)
from app.services.knowledge import get_articles, slug_for_rule

logger = logging.getLogger(__name__)

MAX_WORDS = 120
CACHE_LIMIT = 100

REFUSAL_TERMS = (
    "diagnose",
    "diagnosis",
    "prescribe",
    "prescription",
    "dosage",
    "what medication",
    "which antibiotic",
    "treat my",
    "cure",
    "what disease",
    "do i have",
    "is this cancer",
)

RED_FLAG_TERMS = (
    "chest pain",
    "shortness of breath",
    "dyspnea",
    "fainting",
    "passed out",
    "vision loss",
    "self-harm",
    "suicidal",
    "suicide",
)

INTENT_SLUGS = {
    "hrv": ["hrv-basics", "sleep-circadian", "fluid-shifts"],
    "sleep": ["sleep-circadian", "hrv-basics", "isolation-confinement"],
    "readiness": ["hrv-basics", "sleep-circadian", "red-flags"],
    "red_flag": ["red-flags", "immune-changes", "hrv-basics"],
    "red_flag_info": ["red-flags", "immune-changes", "sleep-circadian"],
    "hydration": ["hydration-nutrition", "fluid-shifts", "hrv-basics"],
    "training": ["bone-loading", "sleep-circadian", "hydration-nutrition"],
    "mood": ["isolation-confinement", "sleep-circadian", "red-flags"],
    "metabolic": ["hydration-nutrition", "red-flags", "immune-changes"],
    "radiation": ["space-radiation", "immune-changes", "red-flags"],
    "immune": ["immune-changes", "red-flags", "sleep-circadian"],
    "refusal": ["red-flags", "immune-changes"],
    "general": ["red-flags", "hrv-basics", "sleep-circadian"],
}


@dataclass
class AssistantContext:
    snapshot: ReadinessSnapshot | None
    alerts: list[Alert]
    metrics: dict[str, dict]
    articles: list[KnowledgeArticle]


_CACHE: dict[str, AssistantAnswerRead] = {}


def _normalize(question: str) -> str:
    text = question.lower().strip()
    text = re.sub(r"[^a-z0-9\s%]", "", text)
    return re.sub(r"\s+", " ", text).strip()


def detect_intent(question: str) -> str:
    text = question.lower()
    if any(term in text for term in REFUSAL_TERMS):
        return "refusal"
    if any(term in text for term in RED_FLAG_TERMS):
        return "red_flag"
    if "contact the flight surgeon" in text or "when should i contact" in text:
        return "red_flag_info"
    if "hrv" in text or "heart rate variability" in text:
        return "hrv"
    if any(term in text for term in ("sleep", "tired", "insomnia", "fatigue")):
        return "sleep"
    if any(term in text for term in ("ready", "readiness", "eva", "score")):
        return "readiness"
    if any(term in text for term in ("hydration", "water", "fluid")):
        return "hydration"
    if any(term in text for term in ("bone", "muscle", "exercise", "training", "load")):
        return "training"
    if any(term in text for term in ("mood", "stress", "anxious", "lonely", "isolation")):
        return "mood"
    if any(term in text for term in ("glucose", "food", "calorie", "nutrition", "vitamin")):
        return "metabolic"
    if any(term in text for term in ("radiation", "solar", "space weather")):
        return "radiation"
    if any(term in text for term in ("fever", "temperature", "immune", "symptom")):
        return "immune"
    return "general"


def _base_context(
    db: Session, user: User, reference: datetime | None = None
) -> tuple[ReadinessSnapshot | None, list[Alert], dict[str, dict]]:
    reference = reference or datetime.now(UTC)
    snapshot = db.scalar(
        select(ReadinessSnapshot)
        .where(ReadinessSnapshot.user_id == user.id)
        .order_by(ReadinessSnapshot.computed_at.desc())
        .limit(1)
    )
    alerts = list(
        db.scalars(
            select(Alert)
            .where(Alert.user_id == user.id, Alert.status == "active")
            .order_by(Alert.created_at.desc())
        ).all()
    )
    rows = db.execute(
        select(Measurement, MetricDefinition)
        .join(MetricDefinition, Measurement.metric_code == MetricDefinition.code)
        .where(
            Measurement.user_id == user.id,
            Measurement.measured_at >= reference - timedelta(days=7),
        )
        .order_by(Measurement.measured_at.desc())
    ).all()
    metrics: dict[str, dict] = {}
    for measurement, metric in rows:
        metrics.setdefault(
            measurement.metric_code,
            {
                "label": metric.name,
                "value": measurement.value,
                "unit": metric.unit,
            },
        )
    return snapshot, alerts, metrics


def _article_slugs(intent: str, alerts: list[Alert]) -> list[str]:
    slugs: list[str] = []
    if intent not in {"refusal", "red_flag", "red_flag_info"}:
        for alert in alerts:
            slug = slug_for_rule(alert.rule_id)
            if slug and slug not in slugs:
                slugs.append(slug)
    for slug in INTENT_SLUGS.get(intent, INTENT_SLUGS["general"]):
        if slug not in slugs:
            slugs.append(slug)
    return slugs


def build_context(
    db: Session, user: User, intent: str = "general"
) -> AssistantContext:
    snapshot, alerts, metrics = _base_context(db, user)
    articles = get_articles(db, _article_slugs(intent, alerts))[:3]
    return AssistantContext(
        snapshot=snapshot,
        alerts=alerts,
        metrics=metrics,
        articles=articles,
    )


def _citation(article: KnowledgeArticle) -> AssistantCitationRead:
    return AssistantCitationRead(
        slug=article.slug,
        title=article.title,
        source_name=article.source_name,
        source_url=article.source_url,
        citation=article.citation,
    )


def _metric(context: AssistantContext, code: str) -> tuple[float | None, str]:
    metric = context.metrics.get(code)
    if metric is None:
        return None, ""
    return float(metric["value"]), str(metric["unit"])


def _top_factor(context: AssistantContext) -> dict | None:
    if context.snapshot is None or not context.snapshot.factors:
        return None
    return context.snapshot.factors[0]


def _alert_sentence(context: AssistantContext) -> str:
    if not context.alerts:
        return "There are no active alerts."
    titles = "; ".join(alert.title for alert in context.alerts[:3])
    return f"Active alerts: {titles}."


def _readiness_sentence(context: AssistantContext) -> str:
    if context.snapshot is None:
        return "There is no readiness snapshot yet."
    return f"Your current readiness is {context.snapshot.score:.1f} ({context.snapshot.status})."


def _limit_words(text: str) -> str:
    words = text.split()
    if len(words) <= MAX_WORDS:
        return " ".join(words)
    return " ".join(words[:MAX_WORDS]).rstrip(",.;") + "…"


def _suggestions(context: AssistantContext) -> list[AssistantSuggestionRead]:
    critical = any(alert.severity == "critical" for alert in context.alerts)
    sleep_related = any(
        "sleep" in f"{alert.rule_id} {alert.title}".lower()
        or "hrv" in f"{alert.rule_id} {alert.title}".lower()
        for alert in context.alerts
    )
    if critical:
        return [
            AssistantSuggestionRead(
                question="When should I contact the flight surgeon?",
                reason="A critical alert is active.",
            ),
            AssistantSuggestionRead(
                question="What does my readiness score mean?",
                reason="Understand the composite.",
            ),
            AssistantSuggestionRead(
                question="What should I do next?",
                reason="Turn the alert into one action.",
            ),
            AssistantSuggestionRead(
                question="Why is my HRV low?",
                reason="Check the autonomic context.",
            ),
        ]
    if sleep_related:
        return [
            AssistantSuggestionRead(
                question="Why is my HRV low?",
                reason="Your recent HRV trend is below baseline.",
            ),
            AssistantSuggestionRead(
                question="What should I do about sleep debt?",
                reason="Sleep is driving the current alert.",
            ),
            AssistantSuggestionRead(
                question="Am I ready for EVA?",
                reason="Readiness is guidance, not a fitness decision.",
            ),
            AssistantSuggestionRead(
                question="When should I contact the flight surgeon?",
                reason="Know the red flags.",
            ),
        ]
    return [
        AssistantSuggestionRead(
            question="What does my readiness score mean?",
            reason="Explain the composite and factors.",
        ),
        AssistantSuggestionRead(
            question="What should I do next?",
            reason="Turn your current state into one action.",
        ),
        AssistantSuggestionRead(
            question="How should I protect my sleep window?",
            reason="The highest-leverage routine change.",
        ),
        AssistantSuggestionRead(
            question="When should I contact the flight surgeon?",
            reason="Know the red flags.",
        ),
    ]


def _deterministic_answer(
    intent: str, context: AssistantContext
) -> tuple[str, bool]:
    hrv, hrv_unit = _metric(context, "hrv_rmssd")
    sleep, _ = _metric(context, "sleep_duration_h")
    efficiency, _ = _metric(context, "sleep_efficiency_pct")
    hydration, _ = _metric(context, "hydration_l")
    mood, _ = _metric(context, "mood_score")
    stress, _ = _metric(context, "stress_score")
    glucose, glucose_unit = _metric(context, "blood_glucose")
    temperature, temp_unit = _metric(context, "body_temp_c")
    top_factor = _top_factor(context)

    if intent == "refusal":
        text = (
            "I can't diagnose or prescribe. This tool explains your data and points to "
            "NASA guidance; it does not replace the flight surgeon. If chest pain, "
            "shortness of breath, fainting, sudden vision loss, a fever with a fast heart "
            "rate, or thoughts of self-harm are present, stop activity and contact the "
            "flight surgeon now. For a non-urgent concern, describe what you noticed and "
            "when it started."
        )
        return text, True

    if intent == "red_flag":
        text = (
            "This may be a red flag. Stop activity and contact the flight surgeon now. "
            "Chest pain, shortness of breath, fainting, sudden vision loss, a fever at or "
            "above 38 °C with a heart rate above 100 bpm, or any thought of self-harm "
            "should never wait for a trend. Follow the mission emergency procedure first "
            "if the situation is immediately life-threatening."
        )
        return text, False

    if intent == "red_flag_info":
        text = (
            "Contact the flight surgeon now for chest pain, shortness of breath at rest, "
            "fainting, sudden vision loss, a fever at or above 38 °C with a heart rate "
            "above 100 bpm, glucose below 70 or above 250 mg/dL, or any thought of "
            "self-harm. Escalate soon for a new rash with fever, persistent vomiting, a "
            "head injury, or symptoms that worsen despite a countermeasure."
        )
        return text, False

    if intent == "hrv":
        if hrv is None:
            text = (
                "I don't have a recent HRV reading. HRV is most useful against your own "
                "21-day baseline, not a population average. Take a morning reading, pair "
                "it with sleep and hydration, and look for a trend over three or more days."
            )
        else:
            factor = next(
                (
                    factor
                    for factor in (context.snapshot.factors if context.snapshot else [])
                    if factor.get("metric") == "hrv_rmssd"
                ),
                None,
            )
            context_text = (
                f"The readiness engine places it {abs(factor['z']):.1f} SD "
                f"{'below' if factor['z'] < 0 else 'above'} your 21-day baseline. "
                if factor
                else ""
            )
            text = (
                f"Your latest HRV is {hrv:.1f} {hrv_unit}. {context_text}"
                "A single low reading is not a diagnosis. Sleep debt, dehydration, and "
                "workload often drive the pattern. Protect tonight's sleep window, review "
                "hydration, reduce non-essential load, and repeat the measurement tomorrow. "
                "If chest pain, shortness of breath, fever, or fainting is present, contact "
                "the flight surgeon now."
            )
        return text, False

    if intent == "sleep":
        if sleep is None:
            text = (
                "I don't have a recent sleep reading. The usual target is 7–9 hours. "
                "Keep a steady wake time, get bright light early, dim the cabin before bed, "
                "and move caffeine earlier. Track duration and efficiency for a week."
            )
        else:
            text = (
                f"Your latest sleep is {sleep:.1f} h"
                + (f" with {efficiency:.0f}% efficiency." if efficiency is not None else ".")
                + " The target is 7–9 hours. Protect the sleep window, dim lights 60 minutes "
                "before bed, keep a steady wake time, and move caffeine earlier. If sleep "
                "stays under 6 hours for several nights or you feel impaired, escalate. A "
                "single short night is not a diagnosis."
            )
        return text, False

    if intent == "readiness":
        text = _readiness_sentence(context)
        if top_factor:
            text += (
                f" The largest factor is {top_factor['label']} at {top_factor['value']} "
                f"{top_factor.get('unit') or ''}."
            )
        text += " " + _alert_sentence(context)
        text += (
            " This is guidance, not a fitness-for-duty decision. Review the active alerts "
            "and the flight surgeon's rules before EVA."
        )
        return text, False

    if intent == "hydration":
        if hydration is None:
            text = (
                "I don't have a recent hydration reading. A practical daily target is "
                "2.0–3.0 L. Fluid shifts make thirst easy to misread, so track intake "
                "against the target rather than waiting to feel thirsty."
            )
        else:
            text = (
                f"Your latest hydration is {hydration:.1f} L. The daily target is 2.0–3.0 L. "
                "Fluid shifts in microgravity make intake easy to under-read. Add two "
                "500 ml servings before the next exercise block and repeat the check. "
                "Persistent dizziness or fainting needs the flight surgeon."
            )
        return text, False

    if intent == "training":
        text = (
            "The training plan prioritizes the items linked to your active alerts. "
            "Follow the next due session, keep the prescribed loading patterns, and log "
            "the actual duration and RPE. Mechanical loading is the signal bone needs; "
            "consistency matters more than one heroic session."
        )
        return text, False

    if intent == "mood":
        if mood is not None and stress is not None:
            text = (
                f"Your latest mood is {mood:.1f}/5 and stress is {stress:.1f}/5. "
                "Isolation and confinement can make changes gradual. Protect sleep, "
                "schedule a private crew check-in, and keep a predictable routine. "
                "Persistent low mood or any thought of self-harm needs the flight surgeon."
            )
        else:
            text = (
                "Mood and stress are early signals in confinement. Protect sleep, schedule "
                "a private crew check-in, and keep a predictable routine. Persistent low "
                "mood or any thought of self-harm needs the flight surgeon."
            )
        return text, False

    if intent == "metabolic":
        if glucose is None:
            text = (
                "I don't have a recent glucose reading. Track energy and fluid intake "
                "against the daily target. Glucose below 70 or above 250 mg/dL is an "
                "immediate escalation."
            )
        else:
            text = (
                f"Your latest blood glucose is {glucose:.0f} {glucose_unit}. "
                "Track energy and fluid intake against the daily target, and review the "
                "meal plan if intake is low. Glucose below 70 or above 250 mg/dL is an "
                "immediate escalation."
            )
        return text, False

    if intent == "radiation":
        text = (
            "There is no wearable that measures cumulative radiation dose in this "
            "prototype. Use the space-weather context, follow the mission's shielding and "
            "shelter plan, and report unusual symptoms. Do not interpret a single symptom "
            "as radiation injury; escalate persistent or severe symptoms."
        )
        return text, False

    if intent == "immune":
        if temperature is None:
            text = (
                "I don't have a recent temperature reading. Monitor temperature, resting "
                "heart rate, and symptom load. A temperature at or above 38 °C with a "
                "resting heart rate above 100 bpm is an immediate escalation."
            )
        else:
            text = (
                f"Your latest core temperature is {temperature:.1f} {temp_unit}. "
                "Monitor temperature, resting heart rate, and symptom load. A temperature "
                "at or above 38 °C with a resting heart rate above 100 bpm, or a rapidly "
                "rising symptom load, needs the flight surgeon now."
            )
        return text, False

    text = _readiness_sentence(context) + " " + _alert_sentence(context)
    if top_factor:
        text += (
            f" The largest factor is {top_factor['label']}. Start with the recommended "
            "action on the highest-severity alert and repeat the check tomorrow."
        )
    else:
        text += (
            " Complete a check-in, keep the sleep and hydration routine steady, and "
            "repeat the measurement tomorrow."
        )
    return text, False


def _provider_context(context: AssistantContext) -> str:
    metrics = "; ".join(
        f"{code}={value['value']} {value['unit']}"
        for code, value in list(context.metrics.items())[:12]
    )
    alerts = "; ".join(
        f"{alert.severity}: {alert.title}" for alert in context.alerts[:5]
    )
    articles = "; ".join(
        f"{article.slug}: {article.title}" for article in context.articles
    )
    score = (
        f"{context.snapshot.score:.1f} {context.snapshot.status}"
        if context.snapshot
        else "no snapshot"
    )
    return (
        f"Readiness: {score}. Alerts: {alerts or 'none'}. Recent metrics: "
        f"{metrics or 'none'}. Articles: {articles}. "
        f"Source: {context.articles[0].citation if context.articles else 'NASA HRP'}."
    )


class OpenAIProvider:
    name = "openai"

    def answer(self, question: str, context: AssistantContext) -> str | None:
        if not settings.llm_api_key or not settings.llm_model:
            return None
        system = (
            "You are the AstraHealth Flight Surgeon, a cautious health explainer for "
            "astronauts. Guidance only: never diagnose, prescribe, or give a treatment "
            "dose. Cite the provided article slugs in square brackets. If red flags are "
            "present, tell the user to contact the flight surgeon now. Answer in 120 words "
            "or fewer. Context: "
            + _provider_context(context)
        )
        try:
            response = httpx.post(
                f"{settings.llm_base_url.rstrip('/')}/chat/completions",
                headers={"Authorization": f"Bearer {settings.llm_api_key}"},
                json={
                    "model": settings.llm_model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": question},
                    ],
                    "temperature": 0.2,
                    "max_tokens": 220,
                },
                timeout=20.0,
            )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
            return str(content).strip() or None
        except Exception:
            logger.exception("LLM provider failed; using rule-based answer")
            return None


def provider_for_settings():
    if settings.llm_provider == "openai":
        return OpenAIProvider()
    return None


def _cache_key(question: str, intent: str, context: AssistantContext, user_id: int) -> str:
    factor = _top_factor(context)
    metric_key = ",".join(
        f"{code}:{value['value']}" for code, value in sorted(context.metrics.items())
    )
    return "|".join(
        [
            str(user_id),
            _normalize(question),
            intent,
            str(context.snapshot.id if context.snapshot else 0),
            str(context.snapshot.score if context.snapshot else 0),
            ",".join(str(alert.id) for alert in context.alerts),
            metric_key,
            factor.get("metric", "") if factor else "",
        ]
    )


def ask(db: Session, user: User, question: str) -> AssistantAnswerRead:
    intent = detect_intent(question)
    context = build_context(db, user, intent)
    suggestions = _suggestions(context)
    key = _cache_key(question, intent, context, user.id)
    cached = _CACHE.get(key)
    if cached is not None:
        return cached

    text, refused = _deterministic_answer(intent, context)
    mode = "rule_based"
    if intent not in {"refusal", "red_flag", "red_flag_info"}:
        provider = provider_for_settings()
        if provider is not None:
            llm_text = provider.answer(question, context)
            if llm_text:
                text = llm_text
                mode = "llm"

    answer = AssistantAnswerRead(
        answer=_limit_words(text),
        citations=[_citation(article) for article in context.articles],
        suggestions=[suggestion.question for suggestion in suggestions[:3]],
        mode=mode,
        refused=refused,
    )
    if len(_CACHE) >= CACHE_LIMIT:
        _CACHE.pop(next(iter(_CACHE)))
    _CACHE[key] = answer
    return answer


def suggestions(db: Session, user: User) -> list[AssistantSuggestionRead]:
    _, alerts, _ = _base_context(db, user)
    context = AssistantContext(
        snapshot=None,
        alerts=alerts,
        metrics={},
        articles=[],
    )
    return _suggestions(context)
