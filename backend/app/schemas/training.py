from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.gamification import AchievementRead, StreakRead


class TrainingItemSummaryRead(BaseModel):
    code: str
    name: str
    duration_min: int
    domain: str


class TrainingItemRead(BaseModel):
    code: str
    name: str
    description: str
    domain: str
    target_per_week: int
    duration_min: int
    profiles: list[str]
    kind: Literal["training", "countermeasure"]


class TrainingPlanItemRead(BaseModel):
    code: str
    name: str
    description: str
    domain: str
    duration_min: int
    target_per_week: int
    completed: int
    remaining: int
    adherence: float
    kind: Literal["training", "countermeasure"]
    profiles: list[str]
    priority: int
    countermeasure_for: list[str]


class TrainingSessionCreate(BaseModel):
    item_code: str = Field(min_length=1, max_length=60)
    duration_min: int = Field(ge=1, le=300)
    rpe: int | None = Field(default=None, ge=1, le=10)
    completed_at: datetime | None = None


class TrainingSessionRead(BaseModel):
    id: int
    item_code: str
    item_name: str
    domain: str
    duration_min: int
    rpe: int | None
    completed_at: datetime


class TrainingLogResultRead(BaseModel):
    session: TrainingSessionRead
    credits_awarded: int
    streak: StreakRead
    new_achievements: list[AchievementRead]


class TrainingPlanRead(BaseModel):
    profile: str
    profile_assigned: bool
    week_start: datetime
    week_end: datetime
    items: list[TrainingPlanItemRead]
    training_target: int
    training_completed: int
    adherence: float
    countermeasure_target: int
    countermeasure_completed: int
    next_session: TrainingPlanItemRead | None
    streak: StreakRead | None
    recent_sessions: list[TrainingSessionRead]
    active_countermeasures: int


class TrainingRosterItemRead(BaseModel):
    time: str
    kind: Literal["checkin", "training", "hydration", "sleep"]
    title: str
    detail: str
    status: Literal["done", "due", "upcoming"]
    training_code: str | None
    alert_titles: list[str] = []


class TrainingRosterRead(BaseModel):
    date: date
    profile: str
    profile_assigned: bool
    items: list[TrainingRosterItemRead]
    next_due: TrainingRosterItemRead | None
    completed: int
    total: int


class TrainingReminderRead(BaseModel):
    due_count: int
    next_due: TrainingRosterItemRead | None
