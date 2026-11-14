from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Measurement, MetricDefinition, User
from app.schemas import MeasurementBatchCreate, MeasurementCreate, MeasurementRead

router = APIRouter(tags=["metrics"])


def _metric_or_404(db: Session, code: str) -> MetricDefinition:
    metric = db.get(MetricDefinition, code)
    if metric is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown metric code: {code}"
        )
    return metric


@router.post("/measurements", response_model=MeasurementRead, status_code=status.HTTP_201_CREATED)
def create_measurement(
    payload: MeasurementCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Measurement:
    metric = _metric_or_404(db, payload.metric_code)
    measurement = Measurement(
        user_id=user.id,
        metric_code=metric.code,
        value=payload.value,
        unit=metric.unit,
        measured_at=payload.measured_at or datetime.now(UTC),
        source=payload.source,
        confidence=payload.confidence,
        notes=payload.notes,
    )
    db.add(measurement)
    db.commit()
    db.refresh(measurement)
    return measurement


@router.post(
    "/measurements/batch",
    response_model=list[MeasurementRead],
    status_code=status.HTTP_201_CREATED,
)
def create_measurements(
    payload: MeasurementBatchCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Measurement]:
    codes = {item.metric_code for item in payload.measurements}
    metrics = {
        metric.code: metric
        for metric in db.scalars(
            select(MetricDefinition).where(MetricDefinition.code.in_(codes))
        ).all()
    }
    missing = codes - metrics.keys()
    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown metric codes: {', '.join(sorted(missing))}",
        )

    rows = [
        Measurement(
            user_id=user.id,
            metric_code=item.metric_code,
            value=item.value,
            unit=metrics[item.metric_code].unit,
            measured_at=item.measured_at or datetime.now(UTC),
            source=item.source,
            confidence=item.confidence,
            notes=item.notes,
        )
        for item in payload.measurements
    ]
    db.add_all(rows)
    db.commit()
    return rows


@router.get("/measurements", response_model=list[MeasurementRead])
def list_measurements(
    metric: str | None = Query(default=None),
    from_at: datetime | None = Query(default=None, alias="from"),
    to_at: datetime | None = Query(default=None),
    limit: int = Query(default=500, ge=1, le=5000),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Measurement]:
    statement = select(Measurement).where(Measurement.user_id == user.id)
    if metric:
        statement = statement.where(Measurement.metric_code == metric)
    if from_at:
        statement = statement.where(Measurement.measured_at >= from_at)
    if to_at:
        statement = statement.where(Measurement.measured_at <= to_at)
    statement = statement.order_by(Measurement.measured_at.asc()).offset(offset).limit(limit)
    return list(db.scalars(statement).all())
