from datetime import datetime

from pydantic import BaseModel

from app.schemas.metric import MetricDefinitionRead


class MetricPointRead(BaseModel):
    id: int
    value: float
    measured_at: datetime
    source: str
    confidence: float | None = None


class BaselineBandRead(BaseModel):
    center: float
    sd: float
    lower: float
    upper: float
    points: int
    start: datetime
    end: datetime


class ReferenceBandRead(BaseModel):
    lower: float | None
    upper: float | None


class MetricStatsRead(BaseModel):
    count: int
    distinct_days: int
    min: float | None
    max: float | None
    mean: float | None


class MetricSeriesRead(BaseModel):
    metric: MetricDefinitionRead
    range_days: int
    from_at: datetime
    to_at: datetime
    points: list[MetricPointRead]
    baseline: BaselineBandRead | None
    reference: ReferenceBandRead
    latest: MetricPointRead | None
    previous: MetricPointRead | None
    delta: float | None
    delta_pct: float | None
    z: float | None
    subscore: float | None
    status: str
    stale: bool
    latest_in_range: bool
    stats: MetricStatsRead


class DomainMetricSummaryRead(BaseModel):
    metric: str
    label: str
    unit: str
    description: str
    frequency: str
    normal_min: float | None
    normal_max: float | None
    latest: MetricPointRead | None
    baseline: BaselineBandRead | None
    z: float | None
    subscore: float | None
    status: str
    delta: float | None
    sparkline: list[float]
    point_count: int
    distinct_days: int


class DomainSummaryRead(BaseModel):
    domain: str
    label: str
    score: float | None
    status: str
    from_at: datetime
    to_at: datetime
    range_days: int
    metrics: list[DomainMetricSummaryRead]
    covered_metrics: int
    total_metrics: int
