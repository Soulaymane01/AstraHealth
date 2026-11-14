import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas import CaptureFeedRead
from app.services.captures import build_capture_feed, simulate_capture
from app.services.readiness import compute_and_persist_readiness, profile_for_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/captures", tags=["captures"])


def _recompute_after_capture(db: Session, user: User) -> None:
    """Captured sensors should move the readiness score without a check-in.
    Readiness is best-effort; the capture itself is already committed."""
    try:
        compute_and_persist_readiness(
            db,
            user,
            profile_for_user(db, user),
            datetime.now(UTC),
        )
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Readiness recompute failed after a sensor capture")


@router.get("", response_model=CaptureFeedRead)
def read_capture_feed(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CaptureFeedRead:
    _, created = simulate_capture(db, user)
    if created:
        # Commit the capture before the readiness calculation so a score failure
        # cannot discard the sensor data.
        db.commit()
        _recompute_after_capture(db, user)
    return CaptureFeedRead.model_validate(
        build_capture_feed(db, user, captured=created)
    )


@router.post("/simulate", response_model=CaptureFeedRead)
def simulate_sensor_capture(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CaptureFeedRead:
    measurements, created = simulate_capture(db, user, force=True)
    if measurements:
        db.commit()
        _recompute_after_capture(db, user)
    return CaptureFeedRead.model_validate(
        build_capture_feed(db, user, captured=created)
    )
