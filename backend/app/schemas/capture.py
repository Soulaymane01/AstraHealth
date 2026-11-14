from datetime import datetime

from pydantic import BaseModel


class CaptureMetricRead(BaseModel):
    metric_code: str
    name: str
    value: float
    unit: str
    source: str
    measured_at: datetime


class CaptureFeedRead(BaseModel):
    source: str | None
    source_label: str
    captured_at: datetime | None
    next_capture_at: datetime
    captured: bool
    simulated: bool
    metrics: list[CaptureMetricRead]
