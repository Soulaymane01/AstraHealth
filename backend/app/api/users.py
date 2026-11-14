from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas import PrivacyRead, PrivacyUpdate, UserRead, UserUpdate

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
