from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Checkin, ReadinessSnapshot, TrainingSession, User
from app.schemas.crew import CrewLeaderboardEntryRead, CrewMemberRead

WINDOW_DAYS = 14
CHECKIN_TARGET = 7
TRAINING_TARGET = 5


@dataclass
class MemberStats:
    checkin_days: int
    training_days: int
    consistency_score: float


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def crew_members(db: Session, user: User) -> list[User]:
    if user.crew_id is None:
        return []
    return list(
        db.scalars(
            select(User).where(User.crew_id == user.crew_id).order_by(User.full_name)
        ).all()
    )


def member_stats(db: Session, member: User, now: datetime | None = None) -> MemberStats:
    now = now or datetime.now(UTC)
    since = now - timedelta(days=WINDOW_DAYS)

    checkin_starts = db.scalars(
        select(Checkin.started_at).where(
            Checkin.user_id == member.id,
            Checkin.started_at >= since,
        )
    ).all()
    checkin_days = len({_as_utc(value).date() for value in checkin_starts})

    training_starts = db.scalars(
        select(TrainingSession.completed_at).where(
            TrainingSession.user_id == member.id,
            TrainingSession.completed_at >= since,
        )
    ).all()
    training_days = len({_as_utc(value).date() for value in training_starts})

    consistency = round(
        100.0
        * (
            0.7 * min(checkin_days / CHECKIN_TARGET, 1.0)
            + 0.3 * min(training_days / TRAINING_TARGET, 1.0)
        ),
        1,
    )
    return MemberStats(
        checkin_days=checkin_days,
        training_days=training_days,
        consistency_score=consistency,
    )


def _latest_snapshot(db: Session, user_id: int) -> ReadinessSnapshot | None:
    return db.scalar(
        select(ReadinessSnapshot)
        .where(ReadinessSnapshot.user_id == user_id)
        .order_by(ReadinessSnapshot.computed_at.desc())
        .limit(1)
    )


def roster(db: Session, user: User) -> list[CrewMemberRead]:
    members = crew_members(db, user)
    result: list[CrewMemberRead] = []
    for member in members:
        stats = member_stats(db, member)
        snapshot = _latest_snapshot(db, member.id)
        is_self = member.id == user.id

        if is_self or member.share_status == "full":
            readiness_status = snapshot.status if snapshot else None
            readiness_score = snapshot.score if snapshot else None
        elif member.share_status == "status_only":
            readiness_status = snapshot.status if snapshot else None
            readiness_score = None
        else:
            readiness_status = None
            readiness_score = None

        result.append(
            CrewMemberRead(
                id=member.id,
                full_name=member.full_name,
                role=member.role,
                avatar_seed=member.avatar_seed,
                is_self=is_self,
                share_status=member.share_status,
                readiness_status=readiness_status,
                readiness_score=readiness_score,
                checkin_days=stats.checkin_days,
                training_days=stats.training_days,
                consistency_score=stats.consistency_score,
            )
        )
    return result


def leaderboard(db: Session, user: User) -> list[CrewLeaderboardEntryRead]:
    members = crew_members(db, user)
    scored = [(member, member_stats(db, member)) for member in members]
    scored.sort(
        key=lambda item: (
            -item[1].consistency_score,
            -item[1].training_days,
            -item[1].checkin_days,
            item[0].full_name,
        )
    )
    return [
        CrewLeaderboardEntryRead(
            position=index,
            id=member.id,
            full_name=member.full_name,
            role=member.role,
            avatar_seed=member.avatar_seed,
            is_self=member.id == user.id,
            checkin_days=stats.checkin_days,
            training_days=stats.training_days,
            consistency_score=stats.consistency_score,
        )
        for index, (member, stats) in enumerate(scored, start=1)
    ]
