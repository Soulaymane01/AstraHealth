from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    JSON,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class MetricDefinition(Base):
    __tablename__ = "metric_definitions"

    code: Mapped[str] = mapped_column(String(60), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    domain: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    normal_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    normal_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    floor_sd: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    frequency: Mapped[str] = mapped_column(String(20), nullable=False, default="daily")
    source_types: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)

    measurements: Mapped[list[Measurement]] = relationship("Measurement", back_populates="metric")


class Measurement(TimestampMixin, Base):
    __tablename__ = "measurements"
    __table_args__ = (
        Index("ix_measurements_user_metric_time", "user_id", "metric_code", "measured_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    metric_code: Mapped[str] = mapped_column(
        ForeignKey("metric_definitions.code"), nullable=False, index=True
    )
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    measured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    source: Mapped[str] = mapped_column(String(20), nullable=False, default="manual")
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped[User] = relationship("User", back_populates="measurements")
    metric: Mapped[MetricDefinition] = relationship(
        "MetricDefinition", back_populates="measurements"
    )


class Checkin(TimestampMixin, Base):
    __tablename__ = "checkins"
    __table_args__ = (
        UniqueConstraint("user_id", "idempotency_key", name="uq_checkins_user_idempotency"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="completed")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(80), nullable=True)

    user: Mapped[User] = relationship("User", back_populates="checkins")
    entries: Mapped[list[CheckinEntry]] = relationship(
        "CheckinEntry", back_populates="checkin", cascade="all, delete-orphan"
    )
    symptoms: Mapped[list[Symptom]] = relationship(
        "Symptom", back_populates="checkin", cascade="all, delete-orphan"
    )


class CheckinEntry(Base):
    __tablename__ = "checkin_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    checkin_id: Mapped[int] = mapped_column(
        ForeignKey("checkins.id", ondelete="CASCADE"), nullable=False, index=True
    )
    metric_code: Mapped[str] = mapped_column(
        ForeignKey("metric_definitions.code"), nullable=False, index=True
    )
    value: Mapped[float] = mapped_column(Float, nullable=False)
    meta: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    checkin: Mapped[Checkin] = relationship("Checkin", back_populates="entries")


class Symptom(Base):
    __tablename__ = "symptoms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    checkin_id: Mapped[int] = mapped_column(
        ForeignKey("checkins.id", ondelete="CASCADE"), nullable=False, index=True
    )
    region: Mapped[str] = mapped_column(String(40), nullable=False)
    symptom: Mapped[str] = mapped_column(String(80), nullable=False)
    severity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    duration: Mapped[str | None] = mapped_column(String(40), nullable=True)

    checkin: Mapped[Checkin] = relationship("Checkin", back_populates="symptoms")


class Alert(TimestampMixin, Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    rule_id: Mapped[str] = mapped_column(String(40), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    recommended_action: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship("User", back_populates="alerts")


class ReadinessSnapshot(TimestampMixin, Base):
    __tablename__ = "readiness_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    score: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    domain_scores: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    factors: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    fired_rules: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    user: Mapped[User] = relationship("User", back_populates="readiness_snapshots")
