from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class Achievement(Base):
    __tablename__ = "achievements"

    code: Mapped[str] = mapped_column(String(60), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    icon: Mapped[str] = mapped_column(String(40), nullable=False)
    criteria: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    user_achievements: Mapped[list[UserAchievement]] = relationship(
        "UserAchievement", back_populates="achievement"
    )


class UserAchievement(Base):
    __tablename__ = "user_achievements"
    __table_args__ = (
        UniqueConstraint("user_id", "achievement_code", name="uq_user_achievements_user_code"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    achievement_code: Mapped[str] = mapped_column(
        ForeignKey("achievements.code", ondelete="CASCADE"), nullable=False, index=True
    )
    unlocked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user: Mapped[User] = relationship("User", back_populates="achievements")
    achievement: Mapped[Achievement] = relationship(
        "Achievement", back_populates="user_achievements"
    )


class CreditEvent(TimestampMixin, Base):
    __tablename__ = "credit_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(String(120), nullable=False)
    ref_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    ref_id: Mapped[str | None] = mapped_column(String(60), nullable=True)

    user: Mapped[User] = relationship("User", back_populates="credit_events")


class Reward(Base):
    __tablename__ = "rewards"

    code: Mapped[str] = mapped_column(String(60), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    cost: Mapped[int] = mapped_column(Integer, nullable=False)
    icon: Mapped[str] = mapped_column(String(40), nullable=False)
    category: Mapped[str] = mapped_column(String(40), nullable=False, default="allowance")
    active: Mapped[bool] = mapped_column(nullable=False, default=True)

    redemptions: Mapped[list[Redemption]] = relationship("Redemption", back_populates="reward")


class Redemption(TimestampMixin, Base):
    __tablename__ = "redemptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reward_code: Mapped[str] = mapped_column(ForeignKey("rewards.code"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="redeemed")
    redeemed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user: Mapped[User] = relationship("User", back_populates="redemptions")
    reward: Mapped[Reward] = relationship("Reward", back_populates="redemptions")


class Streak(TimestampMixin, Base):
    __tablename__ = "streaks"
    __table_args__ = (UniqueConstraint("user_id", "kind", name="uq_streaks_user_kind"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    kind: Mapped[str] = mapped_column(String(40), nullable=False)
    current: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    longest: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    grace_used: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    user: Mapped[User] = relationship("User", back_populates="streaks")
