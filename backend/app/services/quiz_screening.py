from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SeverityBand:
    max_score: int
    key: str
    label: str
    advice: str


@dataclass(frozen=True)
class ScreeningDefinition:
    instrument: str
    max_score: int
    bands: tuple[SeverityBand, ...]
    self_harm_question_id: str | None = None


PHQ9 = ScreeningDefinition(
    instrument="phq9",
    max_score=27,
    bands=(
        SeverityBand(
            4,
            "minimal",
            "Minimal",
            "Little or no depressive symptoms reported.",
        ),
        SeverityBand(
            9,
            "mild",
            "Mild",
            "Some symptoms. Protect sleep, activity, and crew support; repeat the screen in two weeks.",
        ),
        SeverityBand(
            14,
            "moderate",
            "Moderate",
            "Moderate symptoms. Discuss the result with the flight surgeon at the next contact.",
        ),
        SeverityBand(
            19,
            "moderately_severe",
            "Moderately severe",
            "Contact the flight surgeon and review the result together.",
        ),
        SeverityBand(
            27,
            "severe",
            "Severe",
            "Contact the flight surgeon now. If there is immediate danger, follow the mission emergency procedure.",
        ),
    ),
    self_harm_question_id="q9",
)

GAD7 = ScreeningDefinition(
    instrument="gad7",
    max_score=21,
    bands=(
        SeverityBand(
            4,
            "minimal",
            "Minimal",
            "Little or no anxiety symptoms reported.",
        ),
        SeverityBand(
            9,
            "mild",
            "Mild",
            "Some symptoms. Protect sleep, activity, and crew support; repeat the screen in two weeks.",
        ),
        SeverityBand(
            14,
            "moderate",
            "Moderate",
            "Moderate symptoms. Discuss the result with the flight surgeon at the next contact.",
        ),
        SeverityBand(
            21,
            "severe",
            "Severe",
            "Contact the flight surgeon now. If there is immediate danger, follow the mission emergency procedure.",
        ),
    ),
)

SCREENINGS: dict[str, ScreeningDefinition] = {
    "phq9-depression": PHQ9,
    "gad7-anxiety": GAD7,
}


def screening_for(slug: str) -> ScreeningDefinition | None:
    return SCREENINGS.get(slug)


def screening_reading(
    definition: ScreeningDefinition,
    questions: list[dict],
    answers: list[int],
) -> tuple[int, SeverityBand, bool]:
    total = sum(answers)
    band = next(
        (candidate for candidate in definition.bands if total <= candidate.max_score),
        definition.bands[-1],
    )
    self_harm = False
    if definition.self_harm_question_id:
        index = next(
            (
                position
                for position, question in enumerate(questions)
                if question.get("id") == definition.self_harm_question_id
            ),
            None,
        )
        if index is not None and answers[index] >= 1:
            self_harm = True
    return total, band, self_harm
