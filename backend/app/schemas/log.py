from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class LogEventRead(BaseModel):
    id: str
    type: Literal["checkin", "alert", "training", "achievement", "redemption"]
    title: str
    detail: str
    at: datetime
    status: str | None = None
