from typing import Literal

from pydantic import BaseModel, Field


class AssistantCitationRead(BaseModel):
    slug: str
    title: str
    source_name: str
    source_url: str
    citation: str


class AssistantSuggestionRead(BaseModel):
    question: str
    reason: str | None = None


class AssistantQuestion(BaseModel):
    question: str = Field(min_length=1, max_length=500)


class AssistantAnswerRead(BaseModel):
    answer: str
    citations: list[AssistantCitationRead]
    suggestions: list[str]
    mode: Literal["rule_based", "llm"]
    refused: bool
