from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas import (
    AchievementRead,
    CreditLedgerRead,
    GamificationSummaryRead,
    StreakRead,
)
from app.services.gamification import (
    gamification_summary,
    get_streak,
    list_achievements,
    list_credits,
    streak_read,
)

router = APIRouter(tags=["gamification"])


@router.get("/gamification/summary", response_model=GamificationSummaryRead)
def read_gamification_summary(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GamificationSummaryRead:
    return gamification_summary(db, user)


@router.get("/credits", response_model=CreditLedgerRead)
def read_credits(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CreditLedgerRead:
    return list_credits(db, user, limit=limit, offset=offset)


@router.get("/achievements", response_model=list[AchievementRead])
def read_achievements(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AchievementRead]:
    return list_achievements(db, user)


@router.get("/streaks", response_model=list[StreakRead])
def read_streaks(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[StreakRead]:
    streaks = [
        get_streak(db, user.id, kind) for kind in ("checkin", "training")
    ]
    return [streak_read(streak) for streak in streaks if streak is not None]
