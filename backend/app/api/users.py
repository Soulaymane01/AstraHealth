from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import SurgeonInstruction, User
from app.schemas import (
    PrivacyRead,
    PrivacyUpdate,
    SurgeonInstructionRead,
    SurgeonUpdatesRead,
    UserRead,
    UserUpdate,
)
from app.services.surgeon import crew_updates, instruction_read

router = APIRouter(tags=["users"])


@router.get("/me", response_model=UserRead)
def read_me(user: User = Depends(get_current_user)) -> User:
    return user


@router.patch("/me", response_model=UserRead)
def update_me(
    payload: UserUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me/privacy", response_model=PrivacyRead)
def read_privacy(user: User = Depends(get_current_user)) -> PrivacyRead:
    return PrivacyRead(share_status=user.share_status)


@router.patch("/me/privacy", response_model=PrivacyRead)
def update_privacy(
    payload: PrivacyUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PrivacyRead:
    user.share_status = payload.share_status
    db.add(user)
    db.commit()
    db.refresh(user)
    return PrivacyRead(share_status=user.share_status)


@router.get("/me/surgeon-updates", response_model=SurgeonUpdatesRead)
def read_surgeon_updates(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SurgeonUpdatesRead:
    return crew_updates(db, user.id)


@router.post(
    "/me/surgeon-updates/{instruction_id}/ack",
    response_model=SurgeonInstructionRead,
)
def acknowledge_surgeon_instruction(
    instruction_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SurgeonInstructionRead:
    instruction = db.scalar(
        select(SurgeonInstruction).where(
            SurgeonInstruction.id == instruction_id,
            SurgeonInstruction.crew_user_id == user.id,
        )
    )
    if instruction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Surgeon instruction not found"
        )
    if instruction.status == "open":
        now = datetime.now(UTC)
        instruction.status = "completed"
        instruction.acknowledged_at = now
        instruction.completed_at = now
        db.add(instruction)
        db.commit()
        db.refresh(instruction)
    return instruction_read(instruction)
