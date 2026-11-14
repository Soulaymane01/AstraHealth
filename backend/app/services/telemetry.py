from __future__ import annotations

import statistics
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Measurement, MetricDefinition, User
from app.schemas.metric import MetricDefinitionRead
from app.schemas.telemetry import (
    BaselineBandRead,
    DomainMetricSummaryRead,
    DomainSummaryRead,
    MetricPointRead,
    MetricSeriesRead,
    MetricStatsRead,
    ReferenceBandRead,
)
from app.services.readiness import (
    BASELINE_DAYS,
    BASELINE_END_OFFSET_DAYS,
    DOMAIN_LABELS,
    HISTORY_DAYS,
    MAX_AGE_DAYS,
    MIN_BASELINE_POINTS,
    status_for_score,
)

SPARKLINE_POINTS = 14
TELEMETRY_RANGES = (7, 30, 90)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


@dataclass
class _Baseline:
    band: BaselineBandRead
    center: float
    sd: float


def _point(row: Measurement) -> MetricPointRead:
    return MetricPointRead(
        id=row.id,
        value=row.value,
        measured_at=_as_utc(row.measured_at),
        source=row.source,
        confidence=row.confidence,
    )


def _baseline(
    rows: list[Measurement],
    metric: MetricDefinition,
    reference: datetime,
) -> _Baseline | None:
    end = reference - timedelta(days=BASELINE_END_OFFSET_DAYS)
    start = end - timedelta(days=BASELINE_DAYS)
    values = [
        row.value for row in rows if start <= _as_utc(row.measured_at) <= end
    ]
    if len(values) < MIN_BASELINE_POINTS:
        return None

    center = statistics.median(values)
    sd = max(
        statistics.pstdev(values) if len(values) > 1 else 0.0,
        metric.floor_sd,
    )
    band = BaselineBandRead(
        center=round(center, 2),
        sd=round(sd, 2),
        lower=round(center - sd, 2),
        upper=round(center + sd, 2),
        points=len(values),
        start=start,
        end=end,
    )
    return _Baseline(band=band, center=center, sd=sd)


def build_metric_series(
    db: Session,
    user: User,
    metric: MetricDefinition,
    days: int,
    reference: datetime | None = None,
) -> MetricSeriesRead:
    reference = reference or datetime.now(UTC)
    start = reference - timedelta(days=days)
    history_start = reference - timedelta(days=max(days, HISTORY_DAYS))

    rows = list(
        db.scalars(
            select(Measurement)
            .where(
                Measurement.user_id == user.id,
                Measurement.metric_code == metric.code,
                Measurement.measured_at >= history_start,
                Measurement.measured_at <= reference,
            )
            .order_by(Measurement.measured_at.asc())
        ).all()
    )

    in_range = [row for row in rows if _as_utc(row.measured_at) >= start]
    points = [_point(row) for row in in_range]

    # Latest and status follow the readiness engine: only the last 28 days
    # count as a current reading, regardless of the chart range.
    latest_window_start = reference - timedelta(days=HISTORY_DAYS)
    latest_index = next(
        (
            index
            for index in range(len(rows) - 1, -1, -1)
            if _as_utc(rows[index].measured_at) >= latest_window_start
        ),
        None,
    )
    latest_row = rows[latest_index] if latest_index is not None else None
    previous_row = (
        rows[latest_index - 1]
        if latest_index is not None and latest_index > 0
        else None
    )
    latest = _point(latest_row) if latest_row is not None else None
    previous = _point(previous_row) if previous_row is not None else None

    baseline = _baseline(rows, metric, reference)
    age_days = None
    if latest is not None:
        age_days = max(0.0, (reference - latest.measured_at).total_seconds() / 86400)
    stale = bool(
        age_days is not None and age_days > MAX_AGE_DAYS.get(metric.frequency, 7)
    )

    z = None
    subscore = None
    status = "unknown"
    if latest is not None and baseline is not None and not stale:
        z_value = (latest.value - baseline.center) / baseline.sd
        subscore_value = max(0.0, min(100.0, 100.0 - 18.0 * abs(z_value)))
        z = round(z_value, 2)
        subscore = round(subscore_value, 1)
        status = status_for_score(subscore_value)

    delta = None
    delta_pct = None
    if latest is not None and previous is not None:
        delta = round(latest.value - previous.value, 2)
        if previous.value != 0:
            delta_pct = round(delta / abs(previous.value) * 100, 1)

    values = [point.value for point in points]
    stats = MetricStatsRead(
        count=len(points),
        distinct_days=len({point.measured_at.date() for point in points}),
        min=round(min(values), 2) if values else None,
        max=round(max(values), 2) if values else None,
        mean=round(statistics.mean(values), 2) if values else None,
    )

    return MetricSeriesRead(
        metric=MetricDefinitionRead.model_validate(metric),
        range_days=days,
        from_at=start,
        to_at=reference,
        points=points,
        baseline=baseline.band if baseline is not None else None,
        reference=ReferenceBandRead(lower=metric.normal_min, upper=metric.normal_max),
        latest=latest,
        previous=previous,
        delta=delta,
        delta_pct=delta_pct,
        z=z,
        subscore=subscore,
        status=status,
        stale=stale,
        latest_in_range=bool(
            latest is not None and latest.measured_at >= start
        ),
        stats=stats,
    )


def build_domain_summary(
    db: Session,
    user: User,
    domain: str,
    days: int,
    reference: datetime | None = None,
) -> DomainSummaryRead | None:
    label = DOMAIN_LABELS.get(domain)
    if label is None:
        return None

    reference = reference or datetime.now(UTC)
    start = reference - timedelta(days=days)
    metrics = list(
        db.scalars(
            select(MetricDefinition)
            .where(MetricDefinition.domain == label)
            .order_by(MetricDefinition.name)
        ).all()
    )

    series = [
        build_metric_series(db, user, metric, days, reference=reference)
        for metric in metrics
    ]
    subscores = [item.subscore for item in series if item.subscore is not None]
    score = round(statistics.mean(subscores), 1) if subscores else None
    status = status_for_score(score) if score is not None else "unknown"

    return DomainSummaryRead(
        domain=domain,
        label=label,
        score=score,
        status=status,
        from_at=start,
        to_at=reference,
        range_days=days,
        metrics=[
            DomainMetricSummaryRead(
                metric=item.metric.code,
                label=item.metric.name,
                unit=item.metric.unit,
                description=item.metric.description,
                frequency=item.metric.frequency,
                normal_min=item.metric.normal_min,
                normal_max=item.metric.normal_max,
                latest=item.latest,
                baseline=item.baseline,
                z=item.z,
                subscore=item.subscore,
                status=item.status,
                delta=item.delta,
                sparkline=[point.value for point in item.points[-SPARKLINE_POINTS:]],
                point_count=item.stats.count,
                distinct_days=item.stats.distinct_days,
            )
            for item in series
        ],
        covered_metrics=sum(1 for item in series if item.stats.count > 0),
        total_metrics=len(series),
    )
