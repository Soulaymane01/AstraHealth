from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    Achievement,
    Alert,
    Checkin,
    CheckinEntry,
    CreditEvent,
    QuizAttempt,
    Redemption,
    Reward,
    Streak,
    User,
    UserAchievement,
)
from app.schemas.gamification import (
    AchievementRead,
    CreditEventRead,
    CreditLedgerRead,
    GamificationSummaryRead,
    RankRead,
    RedemptionRead,
    RedemptionResultRead,
    RewardRead,
    StreakRead,
)

CHECKIN_CREDITS = 40
QUIZ_CREDITS = 50
TRAINING_CREDITS = 30
STREAK_BONUS = 50
STREAK_MILESTONE = 7

RANK_TIERS = [
    ("Trainee", 0),
    ("Crew Specialist", 300),
    ("Senior Specialist", 700),
    ("Flight Officer", 1000),
    ("Flight Commander", 1600),
    ("Voyager", 2400),
]

ACHIEVEMENT_CRITERIA = {
    "checkins": "checkins",
    "checkin_streak": "checkin_streak",
    "sleep_nights": "sleep_nights",
    "quiz_score": "quiz_score",
    "recovered_alerts": "recovered_alerts",
}


class AlreadyRedeemedError(Exception):
    pass


class InsufficientCreditsError(Exception):
    def __init__(self, shortfall: int):
        self.shortfall = shortfall
        super().__init__(f"Insufficient credits: {shortfall} short")


@dataclass
class StreakUpdate:
    streak: Streak
    credits_awarded: int = 0
    milestone: bool = False


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def credit_totals(db: Session, user_id: int) -> tuple[int, int, int]:
    amounts = list(
        db.scalars(select(CreditEvent.amount).where(CreditEvent.user_id == user_id)).all()
    )
    lifetime = sum(amount for amount in amounts if amount > 0)
    spent = abs(sum(amount for amount in amounts if amount < 0))
    return lifetime, spent, lifetime - spent


def rank_for_credits(lifetime: int, balance: int) -> RankRead:
    current_name, current_min = RANK_TIERS[0]
    next_name: str | None = None
    next_min: int | None = None

    for index, (name, threshold) in enumerate(RANK_TIERS):
        if lifetime >= threshold:
            current_name, current_min = name, threshold
            if index + 1 < len(RANK_TIERS):
                next_name, next_min = RANK_TIERS[index + 1]
        else:
            break

    if next_min is None:
        progress = 1.0
        credits_to_next = None
    else:
        span = next_min - current_min
        progress = min(1.0, max(0.0, (lifetime - current_min) / span)) if span else 1.0
        credits_to_next = max(0, next_min - lifetime)

    return RankRead(
        rank=current_name,
        lifetime_credits=lifetime,
        balance=balance,
        next_rank=next_name,
        next_threshold=next_min,
        progress=round(progress, 3),
        credits_to_next=credits_to_next,
    )


def award_credits(
    db: Session,
    user_id: int,
    amount: int,
    reason: str,
    ref_type: str | None = None,
    ref_id: str | None = None,
    created_at: datetime | None = None,
) -> CreditEvent:
    event = CreditEvent(
        user_id=user_id,
        amount=amount,
        reason=reason,
        ref_type=ref_type,
        ref_id=ref_id,
    )
    if created_at is not None:
        event.created_at = created_at
    db.add(event)
    db.flush()
    return event


def streak_read(streak: Streak) -> StreakRead:
    next_milestone = ((streak.current // STREAK_MILESTONE) + 1) * STREAK_MILESTONE
    if streak.current <= 0:
        next_milestone = STREAK_MILESTONE
    return StreakRead(
        kind=streak.kind,
        current=streak.current,
        longest=streak.longest,
        last_date=streak.last_date,
        grace_used=streak.grace_used,
        grace_available=not streak.grace_used,
        next_milestone=next_milestone,
        days_to_milestone=max(0, next_milestone - streak.current),
    )


def get_streak(db: Session, user_id: int, kind: str) -> Streak | None:
    return db.scalar(select(Streak).where(Streak.user_id == user_id, Streak.kind == kind))


def update_streak(
    db: Session,
    user: User,
    kind: str,
    day: date,
    now: datetime | None = None,
) -> StreakUpdate:
    now = now or datetime.now(UTC)
    streak = get_streak(db, user.id, kind)
    if streak is None:
        streak = Streak(
            user_id=user.id,
            kind=kind,
            current=0,
            longest=0,
            last_date=None,
            grace_used=False,
        )
        db.add(streak)
        db.flush()

    previous = streak.current
    if streak.last_date == day:
        return StreakUpdate(streak=streak)
    # A late offline check-in must not rewind a streak that has already moved on.
    if streak.last_date is not None and day < streak.last_date:
        return StreakUpdate(streak=streak)

    if streak.last_date is None:
        streak.current = 1
        streak.grace_used = False
    elif streak.last_date == day - timedelta(days=1):
        streak.current += 1
    elif streak.last_date == day - timedelta(days=2) and not streak.grace_used:
        streak.current += 1
        streak.grace_used = True
    else:
        streak.current = 1
        streak.grace_used = False

    streak.longest = max(streak.longest, streak.current)
    streak.last_date = day

    credits = 0
    milestone = False
    if streak.current > previous and streak.current % STREAK_MILESTONE == 0:
        ref_id = f"{kind}-{streak.current}-{day.isoformat()}"
        exists = db.scalar(
            select(CreditEvent.id).where(
                CreditEvent.user_id == user.id,
                CreditEvent.ref_type == "streak",
                CreditEvent.ref_id == ref_id,
            )
        )
        if exists is None:
            award_credits(
                db,
                user.id,
                STREAK_BONUS,
                f"{STREAK_MILESTONE}-day {kind} streak",
                ref_type="streak",
                ref_id=ref_id,
                created_at=now,
            )
            credits = STREAK_BONUS
            milestone = True

    db.flush()
    return StreakUpdate(streak=streak, credits_awarded=credits, milestone=milestone)


def _achievement_metrics(db: Session, user: User, now: datetime) -> dict[str, float]:
    checkins = db.scalar(select(func.count(Checkin.id)).where(Checkin.user_id == user.id)) or 0
    streak = get_streak(db, user.id, "checkin")
    since = now - timedelta(days=7)
    sleep_rows = db.execute(
        select(Checkin.started_at, CheckinEntry.value)
        .join(CheckinEntry, CheckinEntry.checkin_id == Checkin.id)
        .where(
            Checkin.user_id == user.id,
            CheckinEntry.metric_code == "sleep_duration_h",
            Checkin.started_at >= since,
        )
    ).all()
    sleep_nights = len(
        {_as_utc(started).date() for started, value in sleep_rows if value >= 7.0}
    )
    quiz_score = (
        db.scalar(select(func.max(QuizAttempt.score)).where(QuizAttempt.user_id == user.id)) or 0.0
    )
    recovered_alerts = (
        db.scalar(
            select(func.count(Alert.id)).where(
                Alert.user_id == user.id,
                Alert.status == "resolved",
            )
        )
        or 0
    )
    return {
        "checkins": float(checkins),
        "checkin_streak": float(streak.current if streak is not None else 0),
        "sleep_nights": float(sleep_nights),
        "quiz_score": float(quiz_score),
        "recovered_alerts": float(recovered_alerts),
    }


def _criteria_met(criteria: dict, metrics: dict[str, float]) -> bool:
    for key, target in criteria.items():
        metric = ACHIEVEMENT_CRITERIA.get(key)
        if metric is None or metrics.get(metric, 0.0) < float(target):
            return False
    return True


def evaluate_achievements(
    db: Session,
    user: User,
    now: datetime | None = None,
) -> list[Achievement]:
    now = now or datetime.now(UTC)
    achievements = list(db.scalars(select(Achievement)).all())
    if not achievements:
        return []

    unlocked = set(
        db.scalars(
            select(UserAchievement.achievement_code).where(
                UserAchievement.user_id == user.id
            )
        ).all()
    )
    metrics = _achievement_metrics(db, user, now)
    new_achievements: list[Achievement] = []
    for achievement in achievements:
        if achievement.code in unlocked:
            continue
        if _criteria_met(achievement.criteria, metrics):
            db.add(
                UserAchievement(
                    user_id=user.id,
                    achievement_code=achievement.code,
                    unlocked_at=now,
                )
            )
            new_achievements.append(achievement)

    if new_achievements:
        db.flush()
    return new_achievements


def achievement_read(
    achievement: Achievement,
    unlocked_at: datetime | None,
) -> AchievementRead:
    return AchievementRead(
        code=achievement.code,
        name=achievement.name,
        description=achievement.description,
        icon=achievement.icon,
        unlocked=unlocked_at is not None,
        unlocked_at=unlocked_at,
    )


def list_achievements(db: Session, user: User) -> list[AchievementRead]:
    achievements = list(db.scalars(select(Achievement).order_by(Achievement.name)).all())
    unlocked = {
        item.achievement_code: item.unlocked_at
        for item in db.scalars(
            select(UserAchievement).where(UserAchievement.user_id == user.id)
        ).all()
    }
    return [achievement_read(item, unlocked.get(item.code)) for item in achievements]


def list_credits(
    db: Session,
    user: User,
    limit: int = 50,
    offset: int = 0,
) -> CreditLedgerRead:
    lifetime, spent, balance = credit_totals(db, user.id)
    entries = list(
        db.scalars(
            select(CreditEvent)
            .where(CreditEvent.user_id == user.id)
            .order_by(CreditEvent.created_at.desc())
            .offset(offset)
            .limit(limit)
        ).all()
    )
    return CreditLedgerRead(
        balance=balance,
        lifetime_credited=lifetime,
        total_spent=spent,
        entries=[CreditEventRead.model_validate(entry) for entry in entries],
    )


def list_rewards(db: Session, user: User) -> list[RewardRead]:
    _, _, balance = credit_totals(db, user.id)
    rewards = list(db.scalars(select(Reward).order_by(Reward.cost)).all())
    redemptions = {
        item.reward_code: item
        for item in db.scalars(
            select(Redemption).where(Redemption.user_id == user.id)
        ).all()
    }

    result: list[RewardRead] = []
    for reward in rewards:
        redemption = redemptions.get(reward.code)
        if redemption is not None:
            state = "redeemed"
            shortfall = 0
        elif balance >= reward.cost:
            state = "available"
            shortfall = 0
        else:
            state = "locked"
            shortfall = reward.cost - balance
        result.append(
            RewardRead(
                code=reward.code,
                name=reward.name,
                description=reward.description,
                cost=reward.cost,
                icon=reward.icon,
                category=reward.category,
                active=reward.active,
                state=state,
                shortfall=shortfall,
                redeemed_at=redemption.redeemed_at if redemption is not None else None,
            )
        )
    return result


def redeem_reward(
    db: Session,
    user: User,
    code: str,
    now: datetime | None = None,
) -> RedemptionResultRead:
    now = now or datetime.now(UTC)
    reward = db.get(Reward, code)
    if reward is None or not reward.active:
        raise LookupError("Reward not found")

    existing = db.scalar(
        select(Redemption).where(
            Redemption.user_id == user.id,
            Redemption.reward_code == reward.code,
            Redemption.status == "redeemed",
        )
    )
    if existing is not None:
        raise AlreadyRedeemedError

    _, _, balance = credit_totals(db, user.id)
    if balance < reward.cost:
        raise InsufficientCreditsError(reward.cost - balance)

    redemption = Redemption(
        user_id=user.id,
        reward_code=reward.code,
        status="redeemed",
        redeemed_at=now,
    )
    db.add(redemption)
    db.flush()
    award_credits(
        db,
        user.id,
        -reward.cost,
        f"Redeemed: {reward.name}",
        ref_type="redemption",
        ref_id=str(redemption.id),
        created_at=now,
    )
    lifetime, _, new_balance = credit_totals(db, user.id)
    return RedemptionResultRead(
        redemption=RedemptionRead(
            id=redemption.id,
            reward_code=reward.code,
            reward_name=reward.name,
            cost=reward.cost,
            status=redemption.status,
            redeemed_at=redemption.redeemed_at,
        ),
        balance=new_balance,
        rank=rank_for_credits(lifetime, new_balance),
    )


def list_redemptions(db: Session, user: User) -> list[RedemptionRead]:
    rows = db.execute(
        select(Redemption, Reward)
        .join(Reward, Redemption.reward_code == Reward.code)
        .where(Redemption.user_id == user.id)
        .order_by(Redemption.redeemed_at.desc())
    ).all()
    return [
        RedemptionRead(
            id=redemption.id,
            reward_code=reward.code,
            reward_name=reward.name,
            cost=reward.cost,
            status=redemption.status,
            redeemed_at=redemption.redeemed_at,
        )
        for redemption, reward in rows
    ]


def gamification_summary(db: Session, user: User) -> GamificationSummaryRead:
    lifetime, _, balance = credit_totals(db, user.id)
    checkin_streak = get_streak(db, user.id, "checkin")
    training_streak = get_streak(db, user.id, "training")
    achievements_total = db.scalar(select(func.count(Achievement.code))) or 0
    achievements_unlocked = (
        db.scalar(
            select(func.count(UserAchievement.id)).where(
                UserAchievement.user_id == user.id
            )
        )
        or 0
    )
    rewards_redeemed = (
        db.scalar(
            select(func.count(Redemption.id)).where(
                Redemption.user_id == user.id,
                Redemption.status == "redeemed",
            )
        )
        or 0
    )
    return GamificationSummaryRead(
        balance=balance,
        lifetime_credited=lifetime,
        rank=rank_for_credits(lifetime, balance),
        checkin_streak=streak_read(checkin_streak) if checkin_streak else None,
        training_streak=streak_read(training_streak) if training_streak else None,
        achievements_unlocked=achievements_unlocked,
        achievements_total=achievements_total,
        rewards_redeemed=rewards_redeemed,
    )
