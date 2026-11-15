from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import User


def get_current_user(
    x_astra_role: str | None = Header(default=None, alias="X-Astra-Role"),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the public demo identity from the selected role.

    The app has no accounts, passwords, or tokens. The role picker stores the
    selected view and every request carries it in a small header.
    """
    role = (x_astra_role or "astronaut").strip().lower()
    if role not in {"astronaut", "surgeon"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Select the astronaut or surgeon role.",
        )

    db_role = "commander" if role == "astronaut" else "flight_surgeon"
    user = db.scalar(select(User).where(User.role == db_role).order_by(User.id))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Demo data is not seeded. Run make reset-demo.",
        )
    return user


def get_current_surgeon(user: User = Depends(get_current_user)) -> User:
    if user.role != "flight_surgeon":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Flight surgeon access required",
        )
    return user
