from pydantic import BaseModel


class CrewMemberRead(BaseModel):
    id: int
    full_name: str
    role: str
    avatar_seed: str | None
    is_self: bool
    share_status: str
    readiness_status: str | None
    readiness_score: float | None
    checkin_days: int
    training_days: int
    consistency_score: float


class CrewLeaderboardEntryRead(BaseModel):
    position: int
    id: int
    full_name: str
    role: str
    avatar_seed: str | None
    is_self: bool
    checkin_days: int
    training_days: int
    consistency_score: float
