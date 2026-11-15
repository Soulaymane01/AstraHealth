from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.content import QuizAttempt, TrainingSession
    from app.models.gamification import CreditEvent, Streak, UserAchievement
    from app.models.health import Alert, Checkin, Measurement, ReadinessSnapshot


class Mission(TimestampMixin, Base):
    __tablename__ = "missions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    profile: Mapped[str] = mapped_column(String(30), nullable=False, default="mars_transit")
    environment: Mapped[str] = mapped_column(String(30), nullable=False, default="spacecraft")
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_days: Mapped[int] = mapped_column(Integer, nullable=False, default=900)

    crews: Mapped[list[Crew]] = relationship(
        "Crew", back_populates="mission", cascade="all, delete-orphan"
    )


class Crew(TimestampMixin, Base):
    __tablename__ = "crews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    mission_id: Mapped[int] = mapped_column(
        ForeignKey("missions.id", ondelete="CASCADE"), nullable=False, index=True
    )

    mission: Mapped[Mission] = relationship("Mission", back_populates="crews")
    members: Mapped[list[User]] = relationship("User", back_populates="crew")


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[str] = mapped_column(String(40), nullable=False, default="crew")
    crew_id: Mapped[int | None] = mapped_column(
        ForeignKey("crews.id", ondelete="SET NULL"), nullable=True, index=True
    )
    share_status: Mapped[str] = mapped_column(String(20), nullable=False, default="private")
    avatar_seed: Mapped[str | None] = mapped_column(String(40), nullable=True)

    crew: Mapped[Crew | None] = relationship("Crew", back_populates="members")
    measurements: Mapped[list[Measurement]] = relationship(
        "Measurement", back_populates="user", cascade="all, delete-orphan"
    )
    checkins: Mapped[list[Checkin]] = relationship(
        "Checkin", back_populates="user", cascade="all, delete-orphan"
    )
    alerts: Mapped[list[Alert]] = relationship(
        "Alert", back_populates="user", cascade="all, delete-orphan"
    )
    readiness_snapshots: Mapped[list[ReadinessSnapshot]] = relationship(
        "ReadinessSnapshot", back_populates="user", cascade="all, delete-orphan"
    )
    training_sessions: Mapped[list[TrainingSession]] = relationship(
        "TrainingSession", back_populates="user", cascade="all, delete-orphan"
    )
    quiz_attempts: Mapped[list[QuizAttempt]] = relationship(
        "QuizAttempt",
        back_populates="user",
        foreign_keys="QuizAttempt.user_id",
        cascade="all, delete-orphan",
    )
    credit_events: Mapped[list[CreditEvent]] = relationship(
        "CreditEvent", back_populates="user", cascade="all, delete-orphan"
    )
    streaks: Mapped[list[Streak]] = relationship(
        "Streak", back_populates="user", cascade="all, delete-orphan"
    )
    achievements: Mapped[list[UserAchievement]] = relationship(
        "UserAchievement", back_populates="user", cascade="all, delete-orphan"
    )
