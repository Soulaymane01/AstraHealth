from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.gamification import AchievementRead


class QuizQuestionRead(BaseModel):
    id: str
    prompt: str
    options: list[str]


class QuizSubjectRead(BaseModel):
    id: int
    full_name: str
    role: str
    share_status: str


class QuizRead(BaseModel):
    slug: str
    title: str
    mode: str
    kind: str = "knowledge"
    instrument: str | None = None
    max_score: int | None = None
    questions: list[QuizQuestionRead]
    eligible_subjects: list[QuizSubjectRead]


class QuizListItemRead(BaseModel):
    slug: str
    title: str
    mode: str
    kind: str = "knowledge"
    instrument: str | None = None
    max_score: int | None = None
    question_count: int
    best_score: float | None
    latest_total_score: int | None = None
    latest_severity: str | None = None
    latest_severity_label: str | None = None
    attempt_count: int
    last_attempted_at: datetime | None


class QuizSubmitRequest(BaseModel):
    answers: list[int] = Field(min_length=1, max_length=50)
    subject_user_id: int | None = None


class QuizQuestionResultRead(BaseModel):
    id: str
    prompt: str
    options: list[str]
    answer_index: int
    explanation: str
    selected_index: int | None
    correct: bool
    score_value: int | None = None


class QuizResultRead(BaseModel):
    attempt_id: int
    quiz_slug: str
    quiz_title: str
    mode: str
    kind: str = "knowledge"
    instrument: str | None = None
    subject: QuizSubjectRead | None
    score: float
    correct_count: int
    total_questions: int
    total_score: int | None = None
    max_score: int | None = None
    severity: str | None = None
    severity_label: str | None = None
    severity_advice: str | None = None
    self_harm_flag: bool = False
    credits_awarded: int
    new_achievements: list[AchievementRead]
    questions: list[QuizQuestionResultRead]
