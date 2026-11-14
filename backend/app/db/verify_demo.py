from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import func, select

from app.db.seed import DEMO_PASSWORD, MISSION_NAME
from app.db.session import SessionLocal
from app.models import (
    Achievement,
    Alert,
    Checkin,
    KnowledgeArticle,
    Mission,
    Quiz,
    ReadinessSnapshot,
    SpaceWeatherEvent,
    SurgeonAssessment,
    SurgeonInstruction,
    TrainingItem,
    TrainingSession,
    User,
)


def main() -> int:
    failures: list[str] = []
    checks: list[tuple[str, bool, str]] = []

    with SessionLocal() as session:
        mission = session.scalar(select(Mission).where(Mission.name == MISSION_NAME))
        checks.append(("mission", mission is not None, MISSION_NAME))
        if mission is None:
            failures.append("mission is missing")

        users = session.scalars(select(User).order_by(User.id)).all()
        crew = {
            user.email: user
            for user in users
            if user.email.endswith("@astra.space") and user.role != "flight_surgeon"
        }
        surgeon = next(
            (user for user in users if user.email == "surgeon@astra.space"), None
        )
        checks.append(("crew accounts", len(crew) == 4, f"{len(crew)} seeded"))
        checks.append(
            (
                "flight surgeon",
                surgeon is not None and surgeon.role == "flight_surgeon",
                surgeon.full_name if surgeon else "missing",
            )
        )
        instruction_count = session.scalar(select(func.count(SurgeonInstruction.id)))
        assessment_count = session.scalar(select(func.count(SurgeonAssessment.id)))
        checks.append(
            (
                "surgeon updates",
                (instruction_count or 0) >= 1 and (assessment_count or 0) >= 1,
                f"{instruction_count or 0} instructions, {assessment_count or 0} assessments",
            )
        )

        commander = crew.get("commander@astra.space")
        pilot = crew.get("pilot@astra.space")
        specialist = crew.get("specialist@astra.space")
        engineer = crew.get("engineer@astra.space")
        checks.append(
            (
                "commander",
                commander is not None and commander.full_name == "Amara Diallo",
                commander.full_name if commander else "missing",
            )
        )
        checks.append(
            (
                "privacy",
                bool(
                    commander
                    and pilot
                    and specialist
                    and engineer
                    and commander.share_status == "status_only"
                    and pilot.share_status == "status_only"
                    and specialist.share_status == "private"
                    and engineer.share_status == "private"
                ),
                "commander/pilot status_only, specialist/engineer private",
            )
        )

        if commander is not None:
            snapshot = session.scalar(
                select(ReadinessSnapshot)
                .where(ReadinessSnapshot.user_id == commander.id)
                .order_by(ReadinessSnapshot.computed_at.desc())
                .limit(1)
            )
            score = snapshot.score if snapshot else None
            status_value = snapshot.status if snapshot else None
            checks.append(
                (
                    "commander readiness",
                    score is not None and 78 <= score <= 82 and status_value == "watch",
                    f"{score:.1f} {status_value}" if snapshot else "missing",
                )
            )
            active_alerts = session.scalars(
                select(Alert).where(
                    Alert.user_id == commander.id,
                    Alert.status == "active",
                )
            ).all()
            rules = {alert.rule_id for alert in active_alerts}
            checks.append(
                (
                    "commander alerts",
                    {"trend-hrv_rmssd", "trend-sleep_efficiency_pct"} <= rules,
                    ", ".join(sorted(rules)) or "none",
                )
            )
            checkins = session.scalar(
                select(func.count(Checkin.id)).where(Checkin.user_id == commander.id)
            )
            training = session.scalar(
                select(func.count(TrainingSession.id)).where(
                    TrainingSession.user_id == commander.id
                )
            )
            checks.append(
                (
                    "commander history",
                    (checkins or 0) >= 1 and (training or 0) >= 1,
                    f"{checkins or 0} check-ins, {training or 0} sessions",
                )
            )

        if mission is not None:
            day = max(1, int((datetime.now(UTC) - mission.start_at).total_seconds() // 86400))
            # Elapsed wall-clock time is not a failure: the demo still works on
            # a later day, but the scripted screenshots expect day 42.
            detail = f"day {day}"
            if day > 43:
                detail += " (run make reset-demo for the scripted day 42)"
            checks.append(("mission day", day >= 41, detail))
            weather = session.scalar(select(SpaceWeatherEvent).limit(1))
            checks.append(
                ("space weather", weather is not None, weather.kind if weather else "missing")
            )

        content_counts = {
            "knowledge": session.scalar(select(func.count(KnowledgeArticle.slug))),
            "training items": session.scalar(select(func.count(TrainingItem.code))),
            "achievements": session.scalar(select(func.count(Achievement.code))),
            "quizzes": session.scalar(select(func.count(Quiz.slug))),
        }
        expected = {
            "knowledge": 9,
            "training items": 8,
            "achievements": 5,
            "quizzes": 4,
        }
        checks.append(
            (
                "content catalog",
                content_counts == expected,
                ", ".join(f"{key} {value}" for key, value in content_counts.items()),
            )
        )

    for label, passed, detail in checks:
        print(f"{'PASS' if passed else 'FAIL'}  {label}: {detail}")
        if not passed:
            failures.append(label)

    if failures:
        print(f"\nDemo state verification failed: {', '.join(failures)}")
        return 1

    print(f"\nDemo state verified. Password: {DEMO_PASSWORD}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
