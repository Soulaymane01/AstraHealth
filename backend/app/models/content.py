from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class KnowledgeArticle(TimestampMixin, Base):
    __tablename__ = "knowledge_articles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    domain: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    body_md: Mapped[str] = mapped_column(Text, nullable=False)
    source_name: Mapped[str] = mapped_column(String(120), nullable=False)
    source_url: Mapped[str] = mapped_column(String(300), nullable=False)
    citation: Mapped[str] = mapped_column(Text, nullable=False)


class TrainingItem(Base):
    __tablename__ = "training_items"

    code: Mapped[str] = mapped_column(String(60), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    domain: Mapped[str] = mapped_column(String(40), nullable=False)
    target_per_week: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    duration_min: Mapped[int] = mapped_column(Integer, nullable=False, default=20)

    sessions: Mapped[list[TrainingSession]] = relationship("TrainingSession", back_populates="item")


class TrainingSession(TimestampMixin, Base):
    __tablename__ = "training_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    item_code: Mapped[str] = mapped_column(
        ForeignKey("training_items.code"), nullable=False, index=True
    )
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    duration_min: Mapped[int] = mapped_column(Integer, nullable=False)
    rpe: Mapped[int | None] = mapped_column(Integer, nullable=True)

    user: Mapped[User] = relationship("User", back_populates="training_sessions")
    item: Mapped[TrainingItem] = relationship("TrainingItem", back_populates="sessions")


class Quiz(TimestampMixin, Base):
    __tablename__ = "quizzes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    mode: Mapped[str] = mapped_column(String(20), nullable=False, default="self")
    questions: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    attempts: Mapped[list[QuizAttempt]] = relationship(
        "QuizAttempt", back_populates="quiz", cascade="all, delete-orphan"
    )


class QuizAttempt(TimestampMixin, Base):
    __tablename__ = "quiz_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    quiz_id: Mapped[int] = mapped_column(
        ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subject_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    answers: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    score: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )

    quiz: Mapped[Quiz] = relationship("Quiz", back_populates="attempts")
    user: Mapped[User] = relationship(
        "User", back_populates="quiz_attempts", foreign_keys=[user_id]
    )
