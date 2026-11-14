from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class RankRead(BaseModel):
    rank: str
    lifetime_credits: int
    balance: int
    next_rank: str | None
    next_threshold: int | None
    progress: float
    credits_to_next: int | None


class CreditEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    amount: int
    reason: str
    ref_type: str | None
    ref_id: str | None
    created_at: datetime


class CreditLedgerRead(BaseModel):
    balance: int
    lifetime_credited: int
    total_spent: int
    entries: list[CreditEventRead]


class AchievementRead(BaseModel):
    code: str
    name: str
    description: str
    icon: str
    unlocked: bool
    unlocked_at: datetime | None = None


class RewardRead(BaseModel):
    code: str
    name: str
    description: str
    cost: int
    icon: str
    category: str
    active: bool
    state: Literal["available", "locked", "redeemed"]
    shortfall: int
    redeemed_at: datetime | None = None


class RedemptionRead(BaseModel):
    id: int
    reward_code: str
    reward_name: str
    cost: int
    status: str
    redeemed_at: datetime


class RedemptionResultRead(BaseModel):
    redemption: RedemptionRead
    balance: int
    rank: RankRead


class StreakRead(BaseModel):
    kind: str
    current: int
    longest: int
    last_date: date | None
    grace_used: bool
    grace_available: bool
    next_milestone: int
    days_to_milestone: int


class GamificationSummaryRead(BaseModel):
    balance: int
    lifetime_credited: int
    rank: RankRead
    checkin_streak: StreakRead | None
    training_streak: StreakRead | None
    achievements_unlocked: int
    achievements_total: int
    rewards_redeemed: int
