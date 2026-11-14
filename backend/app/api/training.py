from datetime import UTC, date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import TrainingItem, TrainingSession, User
from app.schemas import (
    AchievementRead,
    TrainingItemRead,
    TrainingLogResultRead,
    TrainingPlanRead,
    TrainingReminderRead,
    TrainingRosterRead,
    TrainingSessionCreate,
    TrainingSessionRead,
)
from app.services.gamification import (
    TRAINING_CREDITS,
    award_credits,
    evaluate_achievements,
    streak_read,
    update_streak,
)
from app.services.training import build_reminders, build_roster, build_training_plan, catalog

router = APIRouter(prefix="/training", tags=["training"])


@router.get("/catalog", response_model=list[TrainingItemRead])
def read_training_catalog(
    profile: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TrainingItemRead]:
    return catalog(db, user, profile=profile)


@router.get("/plan", response_model=TrainingPlanRead)
def read_training_plan(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TrainingPlanRead:
    return build_training_plan(db, user)


@router.get("/roster", response_model=TrainingRosterRead)
def read_duty_roster(
    on_date: date | None = Query(default=None, alias="date"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TrainingRosterRead:
    return build_roster(db, user, on_date=on_date)


@router.get("/reminders", response_model=TrainingReminderRead)
def read_training_reminders(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TrainingReminderRead:
    return build_reminders(db, user)


@router.post(
    "/sessions",
    response_model=TrainingLogResultRead,
    status_code=status.HTTP_201_CREATED,
)
def log_training_session(
    payload: TrainingSessionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TrainingLogResultRead:
    item = db.get(TrainingItem, payload.item_code)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Training item not found"
        )

    now = datetime.now(UTC)
    completed_at = payload.completed_at or now
    if completed_at.tzinfo is None:
        completed_at = completed_at.replace(tzinfo=UTC)

    session = TrainingSession(
        user_id=user.id,
        item_code=item.code,
        completed_at=completed_at,
        duration_min=payload.duration_min,
        rpe=payload.rpe,
    )
    db.add(session)
    db.flush()

    award_credits(
        db,
        user.id,
        TRAINING_CREDITS,
        "Training session",
        ref_type="training",
        ref_id=str(session.id),
        created_at=now,
    )
    streak_update = update_streak(db, user, "training", completed_at.date(), now)
    new_achievements = evaluate_achievements(db, user, now)
    db.commit()

    return TrainingLogResultRead(
        session=TrainingSessionRead(
            id=session.id,
            item_code=item.code,
            item_name=item.name,
            domain=item.domain,
            duration_min=session.duration_min,
            rpe=session.rpe,
            completed_at=session.completed_at,
        ),
        credits_awarded=TRAINING_CREDITS,
        streak=streak_read(streak_update.streak),
        new_achievements=[
            AchievementRead(
                code=achievement.code,
                name=achievement.name,
                description=achievement.description,
                icon=achievement.icon,
                unlocked=True,
                unlocked_at=now,
            )
            for achievement in new_achievements
        ],
    )
