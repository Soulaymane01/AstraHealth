from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import ReadinessSnapshot, User
from app.schemas.readiness import DomainDetailRead, DomainMetricRead, ReadinessSnapshotRead
from app.services.readiness import (
    DOMAIN_LABELS,
    compute_and_persist_readiness,
    compute_readiness,
    profile_for_user,
    status_for_score,
)

router = APIRouter(tags=["readiness"])


def _latest_snapshot(db: Session, user_id: int) -> ReadinessSnapshot | None:
    return db.scalar(
        select(ReadinessSnapshot)
        .where(ReadinessSnapshot.user_id == user_id)
        .order_by(ReadinessSnapshot.computed_at.desc())
        .limit(1)
    )


def _compute(db: Session, user: User) -> ReadinessSnapshot:
    reference_time = datetime.now(UTC)
    snapshot = compute_and_persist_readiness(
        db,
        user,
        profile_for_user(db, user),
        reference_time,
    )
    if snapshot is None:
        # A rule-only evaluation (for example a first check-in red flag) still
        # creates alerts. Keep them even though there is no composite score.
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not enough measurements to compute readiness yet.",
        )
    db.commit()
    db.refresh(snapshot)
    return snapshot


@router.get("/readiness", response_model=ReadinessSnapshotRead)
def read_readiness(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReadinessSnapshot:
    snapshot = _latest_snapshot(db, user.id)
    if snapshot is None:
        snapshot = _compute(db, user)
    return snapshot


@router.get("/readiness/history", response_model=list[ReadinessSnapshotRead])
def readiness_history(
    limit: int = Query(default=30, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ReadinessSnapshot]:
    return list(
        db.scalars(
            select(ReadinessSnapshot)
            .where(ReadinessSnapshot.user_id == user.id)
            .order_by(ReadinessSnapshot.computed_at.desc())
            .offset(offset)
            .limit(limit)
        ).all()
    )


@router.post("/readiness/compute", response_model=ReadinessSnapshotRead)
def compute_readiness_endpoint(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReadinessSnapshot:
    return _compute(db, user)


@router.get("/readiness/domains/{domain}", response_model=DomainDetailRead)
def read_domain_detail(
    domain: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DomainDetailRead:
    result = compute_readiness(db, user, profile_for_user(db, user), datetime.now(UTC))
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not enough measurements to compute readiness yet.",
        )

    score = result.domain_scores.get(domain)
    if score is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Unknown or empty domain."
        )

    metrics = [metric for metric in result.metrics if metric["domain"] == domain]
    if not metrics:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No metrics in this domain."
        )

    return DomainDetailRead(
        domain=domain,
        label=DOMAIN_LABELS.get(domain, domain.replace("_", " ").title()),
        score=score,
        status=status_for_score(score),
        metrics=[
            DomainMetricRead(
                metric=metric["metric"],
                label=metric["label"],
                value=metric["value"],
                unit=metric["unit"],
                z=metric["z"],
                subscore=metric["subscore"],
                status=metric["status"],
                direction=metric.get("direction"),
            )
            for metric in metrics
        ],
    )
