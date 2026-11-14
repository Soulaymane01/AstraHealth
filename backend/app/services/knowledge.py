import json
from functools import lru_cache
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import KnowledgeArticle
from app.schemas.knowledge import KnowledgeArticleRead, KnowledgeArticleSummaryRead

RULES_PATH = Path(__file__).resolve().parents[2] / "data" / "rules.json"

DOMAIN_ARTICLE_SLUGS = {
    "Cardiovascular": "hrv-basics",
    "Musculoskeletal": "bone-loading",
    "Sleep & circadian": "sleep-circadian",
    "Neurobehavioral": "isolation-confinement",
    "Metabolic & nutrition": "hydration-nutrition",
    "Immune & sensory": "immune-changes",
    "General": "red-flags",
}

TREND_ARTICLE_SLUGS = {
    "hrv_rmssd": "hrv-basics",
    "hydration_l": "hydration-nutrition",
    "sleep_efficiency_pct": "sleep-circadian",
    "sleep_latency_min": "sleep-circadian",
    "sleep_duration_h": "sleep-circadian",
    "stress_score": "isolation-confinement",
    "mood_score": "isolation-confinement",
    "social_interaction_score": "isolation-confinement",
    "reaction_time_ms": "sleep-circadian",
    "exercise_load_min": "bone-loading",
    "bone_load_min": "bone-loading",
    "strength_check": "bone-loading",
    "body_mass": "hydration-nutrition",
    "caloric_intake": "hydration-nutrition",
    "blood_glucose": "hydration-nutrition",
    "vitamin_d": "hydration-nutrition",
    "body_temp_c": "immune-changes",
    "symptom_score": "immune-changes",
    "spo2": "immune-changes",
    "vision_change_score": "red-flags",
}


@lru_cache
def rule_citations() -> dict[str, str | None]:
    with RULES_PATH.open(encoding="utf-8") as handle:
        rules = json.load(handle)
    return {rule["id"]: rule.get("citation") for rule in rules}


def slug_for_rule(rule_id: str) -> str | None:
    if rule_id in rule_citations():
        return rule_citations()[rule_id]
    if rule_id.startswith("trend-"):
        return TREND_ARTICLE_SLUGS.get(rule_id.removeprefix("trend-"))
    return None


def domain_slug(domain: str) -> str | None:
    return DOMAIN_ARTICLE_SLUGS.get(domain)


def _read_minutes(body: str) -> int:
    return max(2, round(len(body.split()) / 200))


def _summary(article: KnowledgeArticle) -> KnowledgeArticleSummaryRead:
    return KnowledgeArticleSummaryRead(
        slug=article.slug,
        title=article.title,
        domain=article.domain,
        summary=article.summary,
        source_name=article.source_name,
        citation=article.citation,
        read_minutes=_read_minutes(article.body_md),
    )


def list_article_summaries(
    db: Session, domain: str | None = None
) -> list[KnowledgeArticleSummaryRead]:
    statement = select(KnowledgeArticle).order_by(KnowledgeArticle.domain, KnowledgeArticle.title)
    if domain:
        statement = statement.where(KnowledgeArticle.domain == domain)
    return [_summary(article) for article in db.scalars(statement).all()]


def get_article(db: Session, slug: str) -> KnowledgeArticle | None:
    return db.scalar(select(KnowledgeArticle).where(KnowledgeArticle.slug == slug))


def get_articles(
    db: Session, slugs: list[str]
) -> list[KnowledgeArticle]:
    if not slugs:
        return []
    articles = {
        article.slug: article
        for article in db.scalars(
            select(KnowledgeArticle).where(KnowledgeArticle.slug.in_(slugs))
        ).all()
    }
    return [articles[slug] for slug in slugs if slug in articles]


def article_read(article: KnowledgeArticle) -> KnowledgeArticleRead:
    return KnowledgeArticleRead(
        slug=article.slug,
        title=article.title,
        domain=article.domain,
        summary=article.summary,
        body_md=article.body_md,
        source_name=article.source_name,
        source_url=article.source_url,
        citation=article.citation,
        read_minutes=_read_minutes(article.body_md),
    )
