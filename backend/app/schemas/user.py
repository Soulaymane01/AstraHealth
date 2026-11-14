from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ShareStatus = Literal["private", "status_only", "full"]


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role: str
    crew_id: int | None
    share_status: str
    avatar_seed: str | None
    created_at: datetime


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    avatar_seed: str | None = Field(default=None, max_length=40)


class PrivacyRead(BaseModel):
    share_status: str


class PrivacyUpdate(BaseModel):
    share_status: ShareStatus
