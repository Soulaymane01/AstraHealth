from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Alert, User
from app.schemas.alert import AlertRead
from app.services.readiness import SEVERITY_ORDER
from app.services.training import alert_read, training_items_map

router = APIRouter(tags=["readiness"])


@router.get("/alerts", response_model=list[AlertRead])
def list_alerts(
    status_filter: str | None = Query(default="active", alias="status"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AlertRead]:
    statement = select(Alert).where(Alert.user_id == user.id)
    if status_filter:
        statement = statement.where(Alert.status == status_filter)
    statement = statement.order_by(Alert.created_at.desc())
    items = training_items_map(db)
    alerts = [alert_read(alert, items) for alert in db.scalars(statement).all()]
    # A Critical finding must never sit below a newer Watch in the UI. Sort by
    # severity first, then newest first within the same severity.
    alerts.sort(key=lambda alert: alert.created_at, reverse=True)
    alerts.sort(key=lambda alert: SEVERITY_ORDER.get(alert.severity, 0), reverse=True)
    return alerts


@router.post("/alerts/{alert_id}/ack", response_model=AlertRead)
def acknowledge_alert(
    alert_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AlertRead:
    alert = db.scalar(select(Alert).where(Alert.id == alert_id, Alert.user_id == user.id))
    if alert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    alert.status = "acknowledged"
    alert.acknowledged_at = datetime.now(UTC)
    db.add(alert)
    db.commit()
    db.refresh(alert)
    items = training_items_map(db)
    return alert_read(alert, items)
