from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class MissionProfileUpdate(BaseModel):
    profile: Literal["mars_transit", "lunar_surface", "station"]


class MissionRead(BaseModel):
    id: int
    name: str
    profile: str
    environment: str
    start_at: datetime
    duration_days: int
    met_seconds: int
    crew_id: int
    crew_name: str
    crew_count: int
    comms_delay_min: float


class SpaceWeatherEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    event_id: str
    kind: str
    start_at: datetime
    end_at: datetime | None
    severity: str
    summary: str


class MissionContextRead(BaseModel):
    latest_event: SpaceWeatherEventRead | None
    active: bool
    source: str = "fixture"
    fetched_at: datetime | None = None


class TapeEventRead(BaseModel):
    id: str
    type: str
    label: str
    at: datetime
    day: int
    status: str | None = None
