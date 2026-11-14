from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.alert import AlertRead
from app.schemas.gamification import AchievementRead, RankRead, StreakRead
from app.schemas.readiness import ReadinessFactor


class CheckinEntryCreate(BaseModel):
    metric_code: str = Field(min_length=1, max_length=60)
    value: float = Field(allow_inf_nan=False)
    meta: dict = Field(default_factory=dict)


class SymptomCreate(BaseModel):
    region: str = Field(min_length=1, max_length=40)
    symptom: str = Field(min_length=1, max_length=80)
    severity: int = Field(ge=1, le=10)
    duration: str | None = Field(default=None, max_length=40)


class CheckinCreate(BaseModel):
    entries: list[CheckinEntryCreate] = Field(default_factory=list, max_length=40)
    symptoms: list[SymptomCreate] = Field(default_factory=list, max_length=20)
    notes: str | None = Field(default=None, max_length=2000)
    started_at: datetime | None = None
    idempotency_key: str | None = Field(default=None, max_length=80)


class CheckinEntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    metric_code: str
    value: float
    meta: dict


class SymptomRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    region: str
    symptom: str
    severity: int
    duration: str | None


class CheckinRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    started_at: datetime
    completed_at: datetime | None
    status: str
    notes: str | None
    entries: list[CheckinEntryRead]
    symptoms: list[SymptomRead]


class CheckinReportRead(BaseModel):
    checkin_id: int
    completed_at: datetime | None
    notes: str | None
    snapshot_id: int | None
    computed_at: datetime | None
    score: float | None
    status: str | None
    previous_score: float | None
    previous_status: str | None
    score_delta: float | None
    status_changed: bool
    domain_scores: dict[str, float]
    top_factors: list[ReadinessFactor]
    recommended_action: str
    credits: int
    current_balance: int
    lifetime_credited: int
    rank: RankRead
    streak: StreakRead | None
    new_achievements: list[AchievementRead]
    alerts: list[AlertRead]
    insufficient_data: bool
