from typing import Literal

from pydantic import BaseModel


class PredictionSignalRead(BaseModel):
    metric: str
    label: str
    direction: str
    severity: Literal["watch", "moderate", "high"]
    latest_value: float
    unit: str
    z: float | None
    trend_per_week: float | None
    evidence: str


class PredictionRead(BaseModel):
    risk_score: int
    risk_level: Literal["low", "moderate", "high"]
    horizon_hours: int
    summary: str
    drivers: list[PredictionSignalRead]
    recommendations: list[str]
    confidence: Literal["low", "medium", "high"]
    data_coverage: float
    red_flags: list[str]
    disclaimer: str
