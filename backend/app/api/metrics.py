from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import MetricDefinition, User
from app.schemas import MetricDefinitionRead, MetricSeriesRead
from app.services.telemetry import TELEMETRY_RANGES, build_metric_series

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/definitions", response_model=list[MetricDefinitionRead])
def list_metric_definitions(
    domain: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[MetricDefinition]:
    statement = select(MetricDefinition).order_by(MetricDefinition.domain, MetricDefinition.name)
    if domain:
        statement = statement.where(MetricDefinition.domain == domain)
    return list(db.scalars(statement).all())


@router.get("/{code}/series", response_model=MetricSeriesRead)
def read_metric_series(
    code: str,
    days: int = Query(default=30, ge=7, le=90),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MetricSeriesRead:
    if days not in TELEMETRY_RANGES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="days must be 7, 30, or 90",
        )
    metric = db.get(MetricDefinition, code)
    if metric is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown metric code: {code}",
        )
    return build_metric_series(db, user, metric, days)
