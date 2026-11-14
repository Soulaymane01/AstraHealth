from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class SurgeonAssessment(TimestampMixin, Base):
    __tablename__ = "surgeon_assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    surgeon_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    crew_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="final")
    working_diagnosis: Mapped[str] = mapped_column(Text, nullable=False)
    findings: Mapped[str] = mapped_column(Text, nullable=False)
    plan: Mapped[str] = mapped_column(Text, nullable=False)
    follow_up: Mapped[str | None] = mapped_column(Text, nullable=True)
    share_with_crew: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    surgeon: Mapped[User] = relationship("User", foreign_keys=[surgeon_id])
    crew_user: Mapped[User] = relationship("User", foreign_keys=[crew_user_id])


class SurgeonInstruction(TimestampMixin, Base):
    __tablename__ = "surgeon_instructions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    surgeon_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    crew_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    kind: Mapped[str] = mapped_column(String(30), nullable=False, default="note")
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="open")
    source: Mapped[str] = mapped_column(String(20), nullable=False, default="surgeon")
    protocol: Mapped[str | None] = mapped_column(String(60), nullable=True)
    target_metrics: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    acknowledged_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    surgeon: Mapped[User] = relationship("User", foreign_keys=[surgeon_id])
    crew_user: Mapped[User] = relationship("User", foreign_keys=[crew_user_id])
