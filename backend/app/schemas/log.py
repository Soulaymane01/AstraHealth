from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class LogEventRead(BaseModel):
    id: str
    type: Literal["checkin", "alert", "training", "achievement"]
    title: str
    detail: str
    at: datetime
    status: str | None = None
