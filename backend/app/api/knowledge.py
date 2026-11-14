from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas import KnowledgeArticleRead, KnowledgeArticleSummaryRead
from app.services.knowledge import article_read, get_article, list_article_summaries

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


@router.get("", response_model=list[KnowledgeArticleSummaryRead])
def read_articles(
    domain: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[KnowledgeArticleSummaryRead]:
    return list_article_summaries(db, domain=domain)


@router.get("/{slug}", response_model=KnowledgeArticleRead)
def read_article(slug: str, db: Session = Depends(get_db)) -> KnowledgeArticleRead:
    article = get_article(db, slug)
    if article is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge article not found"
        )
    return article_read(article)
