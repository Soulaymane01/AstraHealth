from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Quiz, QuizAttempt, User
from app.schemas import (
    AchievementRead,
    QuizListItemRead,
    QuizQuestionRead,
    QuizQuestionResultRead,
    QuizRead,
    QuizResultRead,
    QuizSubjectRead,
    QuizSubmitRequest,
)
from app.services.crew import crew_members
from app.services.gamification import (
    QUIZ_CREDITS,
    award_credits,
    evaluate_achievements,
)
from app.services.quiz_screening import screening_for, screening_reading

router = APIRouter(prefix="/quizzes", tags=["quizzes"])


def _quiz_or_404(db: Session, slug: str) -> Quiz:
    quiz = db.scalar(select(Quiz).where(Quiz.slug == slug))
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    return quiz


def _eligible_subjects(db: Session, user: User) -> list[QuizSubjectRead]:
    return [
        QuizSubjectRead(
            id=member.id,
            full_name=member.full_name,
            role=member.role,
            share_status=member.share_status,
        )
        for member in crew_members(db, user)
        if member.id != user.id and member.share_status != "private"
    ]


@router.get("", response_model=list[QuizListItemRead])
def list_quizzes(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[QuizListItemRead]:
    quizzes = list(db.scalars(select(Quiz).order_by(Quiz.mode, Quiz.title)).all())
    result: list[QuizListItemRead] = []
    for quiz in quizzes:
        screening = screening_for(quiz.slug)
        attempts = list(
            db.scalars(
                select(QuizAttempt)
                .where(
                    QuizAttempt.user_id == user.id,
                    QuizAttempt.quiz_id == quiz.id,
                )
                .order_by(QuizAttempt.completed_at.desc())
            ).all()
        )
        latest = attempts[0] if attempts else None
        latest_total = latest_severity = latest_label = None
        if screening is not None and latest is not None:
            total, band, _ = screening_reading(screening, quiz.questions, latest.answers)
            latest_total = total
            latest_severity = band.key
            latest_label = band.label
        result.append(
            QuizListItemRead(
                slug=quiz.slug,
                title=quiz.title,
                mode=quiz.mode,
                kind="screening" if screening else "knowledge",
                instrument=screening.instrument if screening else None,
                max_score=screening.max_score if screening else None,
                question_count=len(quiz.questions),
                best_score=(
                    None
                    if screening
                    else max((attempt.score for attempt in attempts), default=None)
                ),
                latest_total_score=latest_total,
                latest_severity=latest_severity,
                latest_severity_label=latest_label,
                attempt_count=len(attempts),
                last_attempted_at=latest.completed_at if latest else None,
            )
        )
    return result


@router.get("/{slug}", response_model=QuizRead)
def read_quiz(
    slug: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> QuizRead:
    quiz = _quiz_or_404(db, slug)
    screening = screening_for(quiz.slug)
    return QuizRead(
        slug=quiz.slug,
        title=quiz.title,
        mode=quiz.mode,
        kind="screening" if screening else "knowledge",
        instrument=screening.instrument if screening else None,
        max_score=screening.max_score if screening else None,
        questions=[
            QuizQuestionRead(
                id=question["id"],
                prompt=question["prompt"],
                options=question["options"],
            )
            for question in quiz.questions
        ],
        eligible_subjects=_eligible_subjects(db, user) if quiz.mode == "crew" else [],
    )


@router.post("/{slug}/submit", response_model=QuizResultRead)
def submit_quiz(
    slug: str,
    payload: QuizSubmitRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> QuizResultRead:
    quiz = _quiz_or_404(db, slug)
    questions = quiz.questions
    if len(payload.answers) != len(questions):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Expected {len(questions)} answers.",
        )

    subject: User | None = None
    if quiz.mode == "crew":
        if payload.subject_user_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Select a crewmate before starting this quiz.",
            )
        subject = db.get(User, payload.subject_user_id)
        if (
            subject is None
            or user.crew_id is None
            or subject.crew_id != user.crew_id
            or subject.id == user.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="That crewmate is not eligible for this quiz.",
            )
        if subject.share_status == "private":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This crewmate has not consented to share their status.",
            )

    screening = screening_for(quiz.slug)
    correct_count = 0
    question_results: list[QuizQuestionResultRead] = []
    for question, selected in zip(questions, payload.answers, strict=True):
        options = question["options"]
        if selected < 0 or selected >= len(options):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Answer for {question['id']} is out of range.",
            )
        if screening is not None:
            question_results.append(
                QuizQuestionResultRead(
                    id=question["id"],
                    prompt=question["prompt"],
                    options=options,
                    answer_index=-1,
                    explanation="",
                    selected_index=selected,
                    correct=False,
                    score_value=selected,
                )
            )
            continue
        answer_index = int(question["answer_index"])
        correct = selected == answer_index
        if correct:
            correct_count += 1
        question_results.append(
            QuizQuestionResultRead(
                id=question["id"],
                prompt=question["prompt"],
                options=options,
                answer_index=answer_index,
                explanation=question.get("explanation", ""),
                selected_index=selected,
                correct=correct,
            )
        )

    total = len(questions)
    total_score: int | None = None
    max_score: int | None = None
    severity: str | None = None
    severity_label: str | None = None
    severity_advice: str | None = None
    self_harm = False
    now = datetime.now(UTC)

    if screening is not None:
        total_score, band, self_harm = screening_reading(
            screening, questions, payload.answers
        )
        max_score = screening.max_score
        score = round(100.0 * total_score / max_score, 1) if max_score else 0.0
        severity = band.key
        severity_label = band.label
        severity_advice = band.advice
        if self_harm:
            severity_advice = (
                "You reported thoughts of self-harm. Contact the flight surgeon now. "
                "If there is immediate danger, follow the mission emergency procedure."
            )
        credits_awarded = 0
        new_achievements: list = []
    else:
        score = round(100.0 * correct_count / total, 1) if total else 0.0
        previous_attempts = (
            db.scalar(
                select(func.count(QuizAttempt.id)).where(
                    QuizAttempt.user_id == user.id,
                    QuizAttempt.quiz_id == quiz.id,
                )
            )
            or 0
        )
        credits_awarded = QUIZ_CREDITS if previous_attempts == 0 else 0
        new_achievements = []

    attempt = QuizAttempt(
        quiz_id=quiz.id,
        user_id=user.id,
        subject_user_id=subject.id if subject is not None else None,
        answers=payload.answers,
        score=score,
        completed_at=now,
    )
    db.add(attempt)
    db.flush()

    if credits_awarded:
        award_credits(
            db,
            user.id,
            credits_awarded,
            "Quiz completed",
            ref_type="quiz",
            ref_id=quiz.slug,
            created_at=now,
        )

    if screening is None:
        new_achievements = evaluate_achievements(db, user, now)
    db.commit()

    return QuizResultRead(
        attempt_id=attempt.id,
        quiz_slug=quiz.slug,
        quiz_title=quiz.title,
        mode=quiz.mode,
        kind="screening" if screening else "knowledge",
        instrument=screening.instrument if screening else None,
        subject=(
            QuizSubjectRead(
                id=subject.id,
                full_name=subject.full_name,
                role=subject.role,
                share_status=subject.share_status,
            )
            if subject is not None
            else None
        ),
        score=score,
        correct_count=correct_count,
        total_questions=total,
        total_score=total_score,
        max_score=max_score,
        severity=severity,
        severity_label=severity_label,
        severity_advice=severity_advice,
        self_harm_flag=self_harm,
        credits_awarded=credits_awarded,
        new_achievements=[
            AchievementRead(
                code=achievement.code,
                name=achievement.name,
                description=achievement.description,
                icon=achievement.icon,
                unlocked=True,
                unlocked_at=now,
            )
            for achievement in new_achievements
        ],
        questions=question_results,
    )
