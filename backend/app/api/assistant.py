from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas import (
    AssistantAnswerRead,
    AssistantQuestion,
    AssistantSuggestionRead,
)
from app.services.assistant import ask as answer_question
from app.services.assistant import suggestions

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.get("/suggestions", response_model=list[AssistantSuggestionRead])
def read_suggestions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AssistantSuggestionRead]:
    return suggestions(db, user)


@router.post("/ask", response_model=AssistantAnswerRead)
def ask(
    payload: AssistantQuestion,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AssistantAnswerRead:
    return answer_question(db, user, payload.question)
