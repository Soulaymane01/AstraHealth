from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas import CrewLeaderboardEntryRead, CrewMemberRead
from app.services.crew import leaderboard, roster

router = APIRouter(prefix="/crew", tags=["crew"])


@router.get("", response_model=list[CrewMemberRead])
def read_crew(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CrewMemberRead]:
    return roster(db, user)


@router.get("/leaderboard", response_model=list[CrewLeaderboardEntryRead])
def read_leaderboard(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CrewLeaderboardEntryRead]:
    return leaderboard(db, user)
