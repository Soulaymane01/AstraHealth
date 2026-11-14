from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas import DomainSummaryRead
from app.services.telemetry import TELEMETRY_RANGES, build_domain_summary

router = APIRouter(prefix="/domains", tags=["metrics"])


@router.get("/{domain}", response_model=DomainSummaryRead)
def read_domain_summary(
    domain: str,
    days: int = Query(default=30, ge=7, le=90),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DomainSummaryRead:
    if days not in TELEMETRY_RANGES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="days must be 7, 30, or 90",
        )
    summary = build_domain_summary(db, user, domain, days)
    if summary is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown domain: {domain}",
        )
    return summary
