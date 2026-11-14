from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import (
    Achievement,
    Alert,
    Checkin,
    Crew,
    Mission,
    Redemption,
    Reward,
    SpaceWeatherEvent,
    TrainingItem,
    TrainingSession,
    User,
    UserAchievement,
)
from app.schemas import (
    LogEventRead,
    MissionContextRead,
    MissionRead,
    SpaceWeatherEventRead,
    TapeEventRead,
)

router = APIRouter(tags=["mission"])

COMMS_DELAY_MINUTES = {
    "mars_transit": 14.0,
    "lunar_surface": 0.05,
    "station": 0.0,
}


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _day_index(at: datetime, start: datetime, days: int) -> int:
    value = int((at - start).total_seconds() // 86400)
    return max(0, min(days, value))


@router.get("/mission", response_model=MissionRead)
def read_mission(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MissionRead:
    if user.crew_id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No crew assigned to this user"
        )

    crew = db.get(Crew, user.crew_id)
    if crew is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Crew not found")

    mission = db.get(Mission, crew.mission_id)
    if mission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mission not found")

    start_at = _as_utc(mission.start_at)
    met_seconds = max(0, int((datetime.now(UTC) - start_at).total_seconds()))
    crew_count = db.scalar(select(func.count(User.id)).where(User.crew_id == crew.id)) or 0
    comms_delay_min = COMMS_DELAY_MINUTES.get(mission.profile, 0.0)

    return MissionRead(
        id=mission.id,
        name=mission.name,
        profile=mission.profile,
        environment=mission.environment,
        start_at=mission.start_at,
        duration_days=mission.duration_days,
        met_seconds=met_seconds,
        crew_id=crew.id,
        crew_name=crew.name,
        crew_count=crew_count,
        comms_delay_min=comms_delay_min,
    )


@router.get("/mission/context", response_model=MissionContextRead)
def read_mission_context(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MissionContextRead:
    del user
    now = datetime.now(UTC)
    event = db.scalar(
        select(SpaceWeatherEvent)
        .where(SpaceWeatherEvent.start_at >= now - timedelta(days=30))
        .order_by(SpaceWeatherEvent.start_at.desc())
        .limit(1)
    )
    if event is None:
        return MissionContextRead(latest_event=None, active=False)

    start_at = _as_utc(event.start_at)
    end_at = _as_utc(event.end_at) if event.end_at is not None else start_at

    return MissionContextRead(
        latest_event=SpaceWeatherEventRead.model_validate(event),
        active=start_at <= now <= end_at,
    )


@router.get("/mission/tape", response_model=list[TapeEventRead])
def read_mission_tape(
    days: int = Query(default=30, ge=7, le=90),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TapeEventRead]:
    if user.crew_id is None:
        return []

    crew = db.get(Crew, user.crew_id)
    if crew is None:
        return []

    mission = db.get(Mission, crew.mission_id)
    if mission is None:
        return []

    now = datetime.now(UTC)
    start = now - timedelta(days=days)
    events: list[TapeEventRead] = []

    for checkin in db.scalars(
        select(Checkin)
        .where(
            Checkin.user_id == user.id,
            Checkin.started_at >= start,
            Checkin.started_at <= now,
        )
        .order_by(Checkin.started_at)
    ).all():
        at = _as_utc(checkin.started_at)
        events.append(
            TapeEventRead(
                id=f"checkin-{checkin.id}",
                type="checkin",
                label="Systems Check",
                at=at,
                day=_day_index(at, start, days),
            )
        )

    for alert in db.scalars(
        select(Alert)
        .where(
            Alert.user_id == user.id,
            Alert.created_at >= start,
            Alert.created_at <= now,
        )
        .order_by(Alert.created_at)
    ).all():
        at = _as_utc(alert.created_at)
        events.append(
            TapeEventRead(
                id=f"alert-{alert.id}",
                type="alert",
                label=alert.title,
                at=at,
                day=_day_index(at, start, days),
                status=alert.severity,
            )
        )

    training_rows = db.execute(
        select(TrainingSession, TrainingItem)
        .join(TrainingItem, TrainingSession.item_code == TrainingItem.code)
        .where(
            TrainingSession.user_id == user.id,
            TrainingSession.completed_at >= start,
            TrainingSession.completed_at <= now,
        )
        .order_by(TrainingSession.completed_at)
    ).all()
    for session, item in training_rows:
        at = _as_utc(session.completed_at)
        events.append(
            TapeEventRead(
                id=f"training-{session.id}",
                type="training",
                label=item.name,
                at=at,
                day=_day_index(at, start, days),
            )
        )

    achievement_rows = db.execute(
        select(UserAchievement, Achievement)
        .join(Achievement, UserAchievement.achievement_code == Achievement.code)
        .where(
            UserAchievement.user_id == user.id,
            UserAchievement.unlocked_at >= start,
            UserAchievement.unlocked_at <= now,
        )
        .order_by(UserAchievement.unlocked_at)
    ).all()
    for unlock, achievement in achievement_rows:
        at = _as_utc(unlock.unlocked_at)
        events.append(
            TapeEventRead(
                id=f"achievement-{unlock.id}",
                type="achievement",
                label=achievement.name,
                at=at,
                day=_day_index(at, start, days),
            )
        )

    redemption_rows = db.execute(
        select(Redemption, Reward)
        .join(Reward, Redemption.reward_code == Reward.code)
        .where(
            Redemption.user_id == user.id,
            Redemption.redeemed_at >= start,
            Redemption.redeemed_at <= now,
        )
        .order_by(Redemption.redeemed_at)
    ).all()
    for redemption, reward in redemption_rows:
        at = _as_utc(redemption.redeemed_at)
        events.append(
            TapeEventRead(
                id=f"redemption-{redemption.id}",
                type="redemption",
                label=f"Redeemed: {reward.name}",
                at=at,
                day=_day_index(at, start, days),
            )
        )

    for weather in db.scalars(
        select(SpaceWeatherEvent)
        .where(
            SpaceWeatherEvent.start_at >= start - timedelta(days=1),
            SpaceWeatherEvent.start_at <= now,
        )
        .order_by(SpaceWeatherEvent.start_at)
    ).all():
        at = _as_utc(weather.start_at)
        events.append(
            TapeEventRead(
                id=f"weather-{weather.id}",
                type="weather",
                label=f"{weather.kind} · {weather.severity}",
                at=at,
                day=_day_index(at, start, days),
            )
        )

    events.sort(key=lambda event: event.at)
    return events


@router.get("/mission/log", response_model=list[LogEventRead])
def read_mission_log(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[LogEventRead]:
    events: list[LogEventRead] = []

    for checkin in db.scalars(
        select(Checkin)
        .where(Checkin.user_id == user.id)
        .order_by(Checkin.started_at.desc())
    ).all():
        at = _as_utc(checkin.completed_at or checkin.started_at)
        events.append(
            LogEventRead(
                id=f"checkin-{checkin.id}",
                type="checkin",
                title="Systems Check",
                detail=checkin.notes or "Completed a Systems Check.",
                at=at,
                status="completed",
            )
        )

    for alert in db.scalars(
        select(Alert).where(Alert.user_id == user.id).order_by(Alert.created_at.desc())
    ).all():
        events.append(
            LogEventRead(
                id=f"alert-{alert.id}",
                type="alert",
                title=alert.title,
                detail=alert.rationale,
                at=_as_utc(alert.created_at),
                status=alert.severity,
            )
        )

    for session, item in db.execute(
        select(TrainingSession, TrainingItem)
        .join(TrainingItem, TrainingSession.item_code == TrainingItem.code)
        .where(TrainingSession.user_id == user.id)
        .order_by(TrainingSession.completed_at.desc())
    ).all():
        detail = f"{session.duration_min} min"
        if session.rpe is not None:
            detail += f" · RPE {session.rpe}"
        events.append(
            LogEventRead(
                id=f"training-{session.id}",
                type="training",
                title=item.name,
                detail=detail,
                at=_as_utc(session.completed_at),
                status="completed",
            )
        )

    for unlock, achievement in db.execute(
        select(UserAchievement, Achievement)
        .join(Achievement, UserAchievement.achievement_code == Achievement.code)
        .where(UserAchievement.user_id == user.id)
        .order_by(UserAchievement.unlocked_at.desc())
    ).all():
        events.append(
            LogEventRead(
                id=f"achievement-{unlock.id}",
                type="achievement",
                title=achievement.name,
                detail=achievement.description,
                at=_as_utc(unlock.unlocked_at),
                status="unlocked",
            )
        )

    for redemption, reward in db.execute(
        select(Redemption, Reward)
        .join(Reward, Redemption.reward_code == Reward.code)
        .where(Redemption.user_id == user.id)
        .order_by(Redemption.redeemed_at.desc())
    ).all():
        events.append(
            LogEventRead(
                id=f"redemption-{redemption.id}",
                type="redemption",
                title=f"Redeemed {reward.name}",
                detail=f"−{reward.cost} Flight Credits",
                at=_as_utc(redemption.redeemed_at),
                status="redeemed",
            )
        )

    events.sort(key=lambda event: event.at, reverse=True)
    return events[offset : offset + limit]
