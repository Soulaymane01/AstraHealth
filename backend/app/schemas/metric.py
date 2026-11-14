from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class MetricDefinitionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    name: str
    unit: str
    domain: str
    description: str
    normal_min: float | None
    normal_max: float | None
    floor_sd: float
    frequency: str
    source_types: list[str]


class MeasurementCreate(BaseModel):
    metric_code: str = Field(min_length=1, max_length=60)
    value: float = Field(allow_inf_nan=False)
    measured_at: datetime | None = None
    source: Literal[
        "manual",
        "device",
        "camera_rppg",
        "derived",
        "iss_capture",
        "lunar_capture",
        "mars_capture",
    ] = "manual"
    confidence: float | None = Field(default=None, ge=0, le=1)
    notes: str | None = Field(default=None, max_length=2000)


class MeasurementBatchCreate(BaseModel):
    measurements: list[MeasurementCreate] = Field(min_length=1, max_length=500)


class MeasurementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    metric_code: str
    value: float
    unit: str
    measured_at: datetime
    source: str
    confidence: float | None
    notes: str | None
