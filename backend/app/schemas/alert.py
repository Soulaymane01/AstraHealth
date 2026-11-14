from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.training import TrainingItemSummaryRead


class AlertRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    severity: str
    rule_id: str
    title: str
    rationale: str
    recommended_action: str
    status: str
    created_at: datetime
    acknowledged_at: datetime | None
    countermeasure: TrainingItemSummaryRead | None = None
    knowledge_slug: str | None = None
