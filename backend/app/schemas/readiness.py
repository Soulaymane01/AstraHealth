from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ReadinessFactor(BaseModel):
    metric: str
    label: str
    value: float
    unit: str | None = None
    z: float
    contribution: float
    direction: str | None = None


class ReadinessSnapshotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    computed_at: datetime
    score: float
    status: str
    domain_scores: dict[str, float]
    factors: list[ReadinessFactor]
    fired_rules: list[str]


class DomainMetricRead(BaseModel):
    metric: str
    label: str
    value: float
    unit: str
    z: float
    subscore: float
    status: str
    direction: str | None = None


class DomainDetailRead(BaseModel):
    domain: str
    label: str
    score: float
    status: str
    metrics: list[DomainMetricRead]
