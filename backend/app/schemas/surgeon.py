from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.alert import AlertRead
from app.schemas.capture import CaptureFeedRead
from app.schemas.checkin import CheckinRead
from app.schemas.metric import MeasurementRead
from app.schemas.prediction import PredictionRead
from app.schemas.quiz import QuizQuestionResultRead
from app.schemas.readiness import ReadinessSnapshotRead


class SurgeonMissionRead(BaseModel):
    id: int
    name: str
    profile: str
    environment: str
    mission_day: int
    comms_delay_min: float


class SurgeonCrewSummaryRead(BaseModel):
    id: int
    full_name: str
    role: str
    avatar_seed: str | None
    readiness_score: float | None
    readiness_status: str | None
    active_alerts: int
    critical_alerts: int
    last_capture_at: datetime | None
    last_capture_source: str | None
    last_checkin_at: datetime | None
    open_instructions: int
    risk_score: int | None
    risk_level: Literal["low", "moderate", "high"] | None
    risk_horizon_hours: int | None


class SurgeonAssessmentCreate(BaseModel):
    working_diagnosis: str = Field(min_length=1, max_length=2000)
    findings: str = Field(min_length=1, max_length=5000)
    plan: str = Field(min_length=1, max_length=5000)
    follow_up: str | None = Field(default=None, max_length=2000)
    share_with_crew: bool = True


class SurgeonAssessmentRead(BaseModel):
    id: int
    surgeon_id: int
    surgeon_name: str
    crew_user_id: int
    status: str
    working_diagnosis: str
    findings: str
    plan: str
    follow_up: str | None
    share_with_crew: bool
    created_at: datetime
    updated_at: datetime


class SurgeonInstructionCreate(BaseModel):
    kind: Literal["note", "request_checkin", "request_measurement"] = "note"
    message: str = Field(min_length=1, max_length=2000)


class SurgeonInstructionRead(BaseModel):
    id: int
    surgeon_id: int
    surgeon_name: str
    crew_user_id: int
    kind: str
    message: str
    status: str
    source: str
    protocol: str | None
    target_metrics: list[str]
    due_at: datetime | None
    reason: str | None
    created_at: datetime
    acknowledged_at: datetime | None
    completed_at: datetime | None


class SurgeonCrewDetailRead(BaseModel):
    member: SurgeonCrewSummaryRead
    mission: SurgeonMissionRead
    readiness: ReadinessSnapshotRead | None
    prediction: PredictionRead
    readiness_history: list[ReadinessSnapshotRead]
    alerts: list[AlertRead]
    latest_capture: CaptureFeedRead
    measurements: list[MeasurementRead]
    checkins: list[CheckinRead]
    assessments: list[SurgeonAssessmentRead]
    instructions: list[SurgeonInstructionRead]


class SurgeonUpdatesRead(BaseModel):
    assessments: list[SurgeonAssessmentRead]
    instructions: list[SurgeonInstructionRead]
    open_instructions: int


class SurgeonQuizAttemptRead(BaseModel):
    id: int
    score: float
    total_score: int | None = None
    severity: str | None = None
    severity_label: str | None = None
    self_harm_flag: bool = False
    completed_at: datetime
    subject_name: str | None = None


class SurgeonQuizSummaryRead(BaseModel):
    slug: str
    title: str
    mode: str
    kind: str = "knowledge"
    instrument: str | None = None
    max_score: int | None = None
    question_count: int
    attempt_count: int
    best_score: float | None
    latest_total_score: int | None = None
    latest_severity: str | None = None
    latest_severity_label: str | None = None
    latest_self_harm_flag: bool = False
    last_attempted_at: datetime | None
    attempts: list[SurgeonQuizAttemptRead]


class SurgeonQuizAttemptDetailRead(SurgeonQuizAttemptRead):
    severity_advice: str | None = None
    questions: list[QuizQuestionResultRead]


class SurgeonQuizDetailRead(BaseModel):
    slug: str
    title: str
    mode: str
    kind: str = "knowledge"
    instrument: str | None = None
    max_score: int | None = None
    question_count: int
    attempts: list[SurgeonQuizAttemptDetailRead]
