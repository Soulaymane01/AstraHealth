from pydantic import BaseModel, ConfigDict


class KnowledgeArticleSummaryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    title: str
    domain: str
    summary: str
    source_name: str
    citation: str
    read_minutes: int


class KnowledgeArticleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    title: str
    domain: str
    summary: str
    body_md: str
    source_name: str
    source_url: str
    citation: str
    read_minutes: int
