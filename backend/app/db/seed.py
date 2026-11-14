from __future__ import annotations

import argparse
import random
from datetime import UTC, datetime, time, timedelta

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.base import Base
from app.db.content import (
    ACHIEVEMENTS,
    KNOWLEDGE_ARTICLES,
    METRIC_DEFINITIONS,
    QUIZZES,
    TRAINING_ITEMS,
)
from app.db.session import SessionLocal
from app.models import (
    Achievement,
    Checkin,
    CheckinEntry,
    CreditEvent,
    Crew,
    KnowledgeArticle,
    Measurement,
    MetricDefinition,
    Mission,
    Quiz,
    QuizAttempt,
    SpaceWeatherEvent,
    Streak,
    SurgeonAssessment,
    SurgeonInstruction,
    Symptom,
    TrainingItem,
    TrainingSession,
    User,
    UserAchievement,
)
from app.services.captures import CAPTURE_METRICS, CAPTURE_SOURCES
from app.services.readiness import compute_and_persist_readiness

DEMO_PASSWORD = "astra-demo"
MISSION_NAME = "Artemis Transit"

USER_SPECS = [
    {
        "key": "commander",
        "email": "commander@astra.space",
        "full_name": "Amara Diallo",
        "role": "commander",
        "avatar_seed": "adal",
    },
    {
        "key": "pilot",
        "email": "pilot@astra.space",
        "full_name": "Noah Kim",
        "role": "pilot",
        "avatar_seed": "nkim",
    },
    {
        "key": "specialist",
        "email": "specialist@astra.space",
        "full_name": "Lina Haddad",
        "role": "specialist",
        "avatar_seed": "lhad",
    },
    {
        "key": "engineer",
        "email": "engineer@astra.space",
        "full_name": "Tomas Novak",
        "role": "engineer",
        "avatar_seed": "tnov",
    },
]

SURGEON_SPEC = {
    "email": "surgeon@astra.space",
    "full_name": "Dr. Elena Vasquez",
    "role": "flight_surgeon",
    "avatar_seed": "evas",
}

DEFAULT_BASE = {
    "heart_rate": 66.0,
    "hrv_rmssd": 54.0,
    "systolic_bp": 116.0,
    "diastolic_bp": 74.0,
    "orthostatic_hr_rise": 9.0,
    "exercise_load_min": 44.0,
    "bone_load_min": 28.0,
    "strength_check": 92.0,
    "body_mass": 72.0,
    "sleep_duration_h": 7.2,
    "sleep_efficiency_pct": 91.0,
    "sleep_latency_min": 16.0,
    "mood_score": 4.0,
    "stress_score": 2.0,
    "reaction_time_ms": 248.0,
    "social_interaction_score": 4.0,
    "blood_glucose": 95.0,
    "hydration_l": 2.3,
    "caloric_intake": 2150.0,
    "vitamin_d": 38.0,
    "body_temp_c": 36.7,
    "symptom_score": 0.5,
    "vision_change_score": 0.0,
    "spo2": 98.0,
}

USER_OVERRIDES = {
    "commander": {"hrv_rmssd": 52.0, "sleep_duration_h": 7.0, "mood_score": 3.8},
    "pilot": {"body_temp_c": 36.8, "heart_rate": 68.0, "mood_score": 3.6},
    "specialist": {"mood_score": 3.6, "social_interaction_score": 3.6, "stress_score": 2.2},
    "engineer": {"hrv_rmssd": 58.0, "sleep_duration_h": 7.4, "mood_score": 4.2},
}

SD = {
    "heart_rate": 4.5,
    "hrv_rmssd": 5.0,
    "systolic_bp": 6.0,
    "diastolic_bp": 4.0,
    "orthostatic_hr_rise": 3.0,
    "exercise_load_min": 10.0,
    "bone_load_min": 6.0,
    "strength_check": 3.0,
    "body_mass": 0.5,
    "sleep_duration_h": 0.5,
    "sleep_efficiency_pct": 3.0,
    "sleep_latency_min": 5.0,
    "mood_score": 0.35,
    "stress_score": 0.35,
    "reaction_time_ms": 18.0,
    "social_interaction_score": 0.45,
    "blood_glucose": 8.0,
    "hydration_l": 0.25,
    "caloric_intake": 180.0,
    "vitamin_d": 4.0,
    "body_temp_c": 0.2,
    "symptom_score": 0.5,
    "vision_change_score": 0.2,
    "spo2": 0.6,
}

RANGES = {
    "heart_rate": (45.0, 135.0),
    "hrv_rmssd": (15.0, 100.0),
    "systolic_bp": (85.0, 170.0),
    "diastolic_bp": (55.0, 105.0),
    "orthostatic_hr_rise": (0.0, 40.0),
    "exercise_load_min": (0.0, 90.0),
    "bone_load_min": (0.0, 60.0),
    "strength_check": (60.0, 100.0),
    "body_mass": (55.0, 95.0),
    "sleep_duration_h": (3.5, 9.5),
    "sleep_efficiency_pct": (60.0, 100.0),
    "sleep_latency_min": (3.0, 60.0),
    "mood_score": (1.0, 5.0),
    "stress_score": (1.0, 5.0),
    "reaction_time_ms": (180.0, 380.0),
    "social_interaction_score": (1.0, 5.0),
    "blood_glucose": (65.0, 260.0),
    "hydration_l": (0.8, 3.5),
    "caloric_intake": (1200.0, 3000.0),
    "vitamin_d": (15.0, 60.0),
    "body_temp_c": (36.0, 38.6),
    "symptom_score": (0.0, 10.0),
    "vision_change_score": (0.0, 10.0),
    "spo2": (90.0, 100.0),
}

DECIMALS = {
    "hrv_rmssd": 1,
    "body_mass": 1,
    "sleep_duration_h": 1,
    "mood_score": 1,
    "stress_score": 1,
    "social_interaction_score": 1,
    "hydration_l": 1,
    "body_temp_c": 1,
    "symptom_score": 1,
    "vision_change_score": 1,
}

DEVICE_METRICS = {
    "heart_rate",
    "hrv_rmssd",
    "sleep_duration_h",
    "sleep_efficiency_pct",
    "sleep_latency_min",
    "body_temp_c",
    "spo2",
}


def reset_database(session: Session) -> None:
    tables = ", ".join(f'"{table.name}"' for table in Base.metadata.sorted_tables)
    session.execute(text(f"TRUNCATE TABLE {tables} RESTART IDENTITY CASCADE"))
    session.commit()


def seed_metric_definitions(session: Session) -> None:
    capture_codes = set(CAPTURE_METRICS)
    for item in METRIC_DEFINITIONS:
        data = dict(item)
        if data["code"] in capture_codes:
            data["source_types"] = list(
                dict.fromkeys([*data.get("source_types", []), *CAPTURE_SOURCES])
            )
        existing = session.get(MetricDefinition, data["code"])
        if existing is None:
            session.add(MetricDefinition(**data))
        elif data["code"] in capture_codes:
            # Keep an existing demo database in sync after the capture feature
            # is added, without requiring a destructive reset.
            existing.source_types = data["source_types"]
    session.flush()


def _is_anomaly_day(key: str, code: str, day_index: int) -> bool:
    commander_window = (
        key == "commander"
        and day_index >= 53
        and code
        in {
            "hrv_rmssd",
            "sleep_duration_h",
            "sleep_efficiency_pct",
            "hydration_l",
            "mood_score",
            "stress_score",
        }
    )
    pilot_window = (
        key == "pilot"
        and day_index >= 57
        and code
        in {
            "body_temp_c",
            "symptom_score",
            "heart_rate",
            "sleep_duration_h",
            "mood_score",
        }
    )
    specialist_window = (
        key == "specialist"
        and day_index >= 50
        and code
        in {
            "mood_score",
            "social_interaction_score",
            "stress_score",
            "sleep_duration_h",
        }
    )
    return commander_window or pilot_window or specialist_window


def _value_for(
    key: str,
    code: str,
    day_index: int,
    rng: random.Random,
    base: float,
) -> float:
    value = base + rng.gauss(0, SD[code])

    if key == "commander" and day_index >= 53:
        t = day_index - 52
        if code == "hrv_rmssd":
            value = 53 - 2.2 * t + rng.gauss(0, 2.0)
        elif code == "sleep_duration_h":
            value = 7.1 - 0.22 * t + rng.gauss(0, 0.2)
        elif code == "sleep_efficiency_pct":
            value = 90 - 1.8 * t + rng.gauss(0, 1.5)
        elif code == "hydration_l":
            value = 2.3 - 0.12 * t + rng.gauss(0, 0.08)
        elif code == "mood_score":
            value = 4.0 - 0.12 * t + rng.gauss(0, 0.2)
        elif code == "stress_score":
            value = 2.0 + 0.18 * t + rng.gauss(0, 0.2)
    elif key == "pilot" and day_index >= 57:
        t = day_index - 56
        if code == "body_temp_c":
            value = 37.9 + 0.17 * t + rng.gauss(0, 0.05)
        elif code == "symptom_score":
            value = 3 + t + rng.gauss(0, 0.3)
        elif code == "heart_rate":
            value = 92 + 4 * t + rng.gauss(0, 2)
        elif code == "sleep_duration_h":
            value = 5.2 + 0.2 * t + rng.gauss(0, 0.2)
        elif code == "mood_score":
            value = 3.2 - 0.2 * t + rng.gauss(0, 0.2)
    elif key == "specialist" and day_index >= 50:
        t = day_index - 49
        if code == "mood_score":
            if day_index >= 55:
                value = 1.85 + rng.gauss(0, 0.06)
            else:
                value = 3.8 - 0.2 * t + rng.gauss(0, 0.15)
        elif code == "social_interaction_score":
            value = 3.6 - 0.18 * t + rng.gauss(0, 0.15)
        elif code == "stress_score":
            value = 2.2 + 0.16 * t + rng.gauss(0, 0.2)
        elif code == "sleep_duration_h":
            value = 7.0 - 0.1 * t + rng.gauss(0, 0.2)

    low, high = RANGES[code]
    return round(min(high, max(low, value)), DECIMALS.get(code, 0))


def _seed_measurements(
    session: Session,
    users: dict[str, User],
    now: datetime,
    rng: random.Random,
) -> int:
    metric_by_code = {item["code"]: item for item in METRIC_DEFINITIONS}
    count = 0

    for key, user in users.items():
        base = DEFAULT_BASE | USER_OVERRIDES.get(key, {})

        for day_index in range(60):
            day = (now - timedelta(days=59 - day_index)).date()

            for code, metric in metric_by_code.items():
                anomaly = _is_anomaly_day(key, code, day_index)
                if not anomaly:
                    if metric["frequency"] == "every_3_days" and day_index % 3 != 0:
                        continue
                    if metric["frequency"] == "weekly" and day_index % 7 != 0:
                        continue

                value = _value_for(key, code, day_index, rng, base[code])
                measured_at = datetime.combine(
                    day, time(hour=7, minute=rng.randint(0, 50)), tzinfo=UTC
                )
                if measured_at > now:
                    measured_at = now - timedelta(minutes=30)

                session.add(
                    Measurement(
                        user_id=user.id,
                        metric_code=code,
                        value=value,
                        unit=metric["unit"],
                        measured_at=measured_at,
                        source="device" if code in DEVICE_METRICS else "manual",
                    )
                )
                count += 1

    return count


def _add_checkin(
    session: Session,
    user: User,
    now: datetime,
    days_ago: int,
    entries: dict[str, float],
    symptoms: list[dict] | None = None,
    notes: str | None = None,
) -> None:
    started_at = now - timedelta(days=days_ago, hours=2)
    checkin = Checkin(
        user_id=user.id,
        started_at=started_at,
        completed_at=started_at + timedelta(minutes=3),
        status="completed",
        notes=notes,
    )
    for code, value in entries.items():
        checkin.entries.append(CheckinEntry(metric_code=code, value=value, meta={"seed": True}))
    for symptom in symptoms or []:
        checkin.symptoms.append(Symptom(**symptom))
    session.add(checkin)


def _seed_checkins(session: Session, users: dict[str, User], now: datetime) -> int:
    commander = users["commander"]
    pilot = users["pilot"]
    specialist = users["specialist"]
    engineer = users["engineer"]

    commander_checkins = [
        (0, {"heart_rate": 72, "sleep_duration_h": 5.4, "mood_score": 3, "hydration_l": 1.4}),
        (1, {"heart_rate": 70, "sleep_duration_h": 5.2, "mood_score": 3, "hydration_l": 1.5}),
        (2, {"heart_rate": 71, "sleep_duration_h": 5.6, "mood_score": 3, "hydration_l": 1.6}),
        (3, {"heart_rate": 69, "sleep_duration_h": 6.1, "mood_score": 3, "hydration_l": 1.8}),
        (5, {"heart_rate": 68, "sleep_duration_h": 6.8, "mood_score": 4, "hydration_l": 2.0}),
        (9, {"heart_rate": 66, "sleep_duration_h": 7.2, "mood_score": 4, "hydration_l": 2.2}),
        (15, {"heart_rate": 65, "sleep_duration_h": 7.4, "mood_score": 4, "hydration_l": 2.3}),
        (22, {"heart_rate": 66, "sleep_duration_h": 7.0, "mood_score": 4, "hydration_l": 2.2}),
        (30, {"heart_rate": 67, "sleep_duration_h": 7.1, "mood_score": 4, "hydration_l": 2.3}),
        (38, {"heart_rate": 66, "sleep_duration_h": 7.3, "mood_score": 4, "hydration_l": 2.4}),
    ]
    for days_ago, entries in commander_checkins:
        _add_checkin(session, commander, now, days_ago, entries)

    pilot_checkins = [
        (
            0,
            {
                "heart_rate": 104,
                "body_temp_c": 38.4,
                "sleep_duration_h": 5.4,
                "mood_score": 2,
            },
            [
                {"region": "whole_body", "symptom": "fever", "severity": 6, "duration": "2 days"},
                {"region": "head", "symptom": "headache", "severity": 3, "duration": "2 days"},
            ],
        ),
        (
            2,
            {"heart_rate": 96, "body_temp_c": 38.1, "sleep_duration_h": 5.8, "mood_score": 3},
            None,
        ),
        (
            6,
            {"heart_rate": 70, "body_temp_c": 36.8, "sleep_duration_h": 6.6, "mood_score": 3},
            None,
        ),
        (
            12,
            {"heart_rate": 68, "body_temp_c": 36.7, "sleep_duration_h": 7.0, "mood_score": 4},
            None,
        ),
    ]
    for item in pilot_checkins:
        days_ago, entries = item[0], item[1]
        symptoms = item[2] if len(item) > 2 else None
        _add_checkin(session, pilot, now, days_ago, entries, symptoms)

    specialist_checkins = [
        (
            0,
            {
                "mood_score": 2,
                "social_interaction_score": 2,
                "sleep_duration_h": 6.0,
                "stress_score": 4,
            },
        ),
        (
            4,
            {
                "mood_score": 2,
                "social_interaction_score": 3,
                "sleep_duration_h": 6.2,
                "stress_score": 4,
            },
        ),
        (
            11,
            {
                "mood_score": 4,
                "social_interaction_score": 4,
                "sleep_duration_h": 7.0,
                "stress_score": 2,
            },
        ),
    ]
    for days_ago, entries in specialist_checkins:
        _add_checkin(session, specialist, now, days_ago, entries)

    engineer_checkins = [
        (0, {"heart_rate": 62, "sleep_duration_h": 7.6, "mood_score": 4, "hydration_l": 2.6}),
        (1, {"heart_rate": 64, "sleep_duration_h": 7.4, "mood_score": 4, "hydration_l": 2.5}),
        (3, {"heart_rate": 63, "sleep_duration_h": 7.8, "mood_score": 5, "hydration_l": 2.7}),
        (7, {"heart_rate": 65, "sleep_duration_h": 7.2, "mood_score": 4, "hydration_l": 2.4}),
        (14, {"heart_rate": 63, "sleep_duration_h": 7.5, "mood_score": 4, "hydration_l": 2.5}),
    ]
    for days_ago, entries in engineer_checkins:
        _add_checkin(session, engineer, now, days_ago, entries)

    return (
        len(commander_checkins)
        + len(pilot_checkins)
        + len(specialist_checkins)
        + len(engineer_checkins)
    )


def _seed_content(session: Session) -> None:
    for article in KNOWLEDGE_ARTICLES:
        session.add(KnowledgeArticle(**article))
    for quiz in QUIZZES:
        session.add(Quiz(**quiz))
    for item in TRAINING_ITEMS:
        session.add(TrainingItem(**item))
    for achievement in ACHIEVEMENTS:
        session.add(Achievement(**achievement))
    session.flush()


def _seed_credits(session: Session, users: dict[str, User], now: datetime) -> None:
    ledgers = {
        "commander": [
            (400, "Mission start readiness", 42),
            (250, "Seven-day check-in streak", 20),
            (180, "Quiz: Know Yourself", 8),
            (160, "Training adherence", 5),
            (150, "Systems check", 2),
            (100, "Morning check-in", 0),
        ],
        "pilot": [
            (300, "Mission start readiness", 42),
            (160, "Training adherence", 9),
            (120, "Systems check", 4),
            (80, "Morning check-in", 0),
        ],
        "specialist": [
            (240, "Mission start readiness", 42),
            (160, "Training adherence", 18),
            (120, "Crew support", 11),
            (80, "Systems check", 5),
            (40, "Morning check-in", 0),
        ],
        "engineer": [
            (320, "Mission start readiness", 42),
            (240, "Seven-day check-in streak", 24),
            (180, "Quiz: Know Yourself", 14),
            (140, "Training adherence", 7),
            (100, "Systems check", 1),
        ],
    }

    for key, events in ledgers.items():
        for amount, reason, days_ago in events:
            session.add(
                CreditEvent(
                    user_id=users[key].id,
                    amount=amount,
                    reason=reason,
                    created_at=now - timedelta(days=days_ago),
                )
            )



def _seed_weather(session: Session, now: datetime) -> None:
    session.add_all(
        [
            SpaceWeatherEvent(
                event_id="DONKI-2026-10-31-SPE",
                kind="Solar Energetic Particle",
                start_at=now - timedelta(days=14),
                end_at=now - timedelta(days=13),
                severity="moderate",
                summary=(
                    "Moderate solar energetic particle event. Crew remained inside the "
                    "shielded habitat; no operational impact reported."
                ),
                fetched_at=now,
            ),
            SpaceWeatherEvent(
                event_id="DONKI-2026-11-11-GST",
                kind="Geomagnetic Storm",
                start_at=now - timedelta(days=3),
                end_at=now - timedelta(days=2),
                severity="minor",
                summary=(
                    "Minor geomagnetic storm. Communications remained available with a short "
                    "increase in link latency."
                ),
                fetched_at=now,
            ),
        ]
    )


def _seed_activity(session: Session, users: dict[str, User], now: datetime) -> None:
    sessions = [
        ("resistance-baseline", "commander", 2, 35, 7),
        ("aerobic-interval", "commander", 4, 25, 6),
        ("bone-load", "commander", 5, 20, 8),
        ("sleep-hygiene", "commander", 1, 10, 2),
        ("resistance-baseline", "pilot", 3, 35, 7),
        ("aerobic-interval", "pilot", 1, 25, 6),
        ("mobility", "specialist", 2, 10, 4),
        ("resistance-baseline", "engineer", 1, 35, 7),
        ("aerobic-interval", "engineer", 2, 25, 6),
        ("bone-load", "engineer", 3, 20, 8),
        ("mobility", "engineer", 4, 10, 4),
        ("sleep-hygiene", "engineer", 0, 10, 2),
    ]
    for item_code, key, days_ago, duration_min, rpe in sessions:
        session.add(
            TrainingSession(
                user_id=users[key].id,
                item_code=item_code,
                completed_at=now - timedelta(days=days_ago),
                duration_min=duration_min,
                rpe=rpe,
            )
        )

    streaks = [
        ("commander", "checkin", 7, 12),
        ("commander", "training", 3, 5),
        ("pilot", "checkin", 3, 5),
        ("pilot", "training", 2, 4),
        ("specialist", "checkin", 1, 9),
        ("specialist", "training", 1, 3),
        ("engineer", "checkin", 12, 18),
        ("engineer", "training", 5, 7),
    ]
    for key, kind, current, longest in streaks:
        session.add(
            Streak(
                user_id=users[key].id,
                kind=kind,
                current=current,
                longest=longest,
                last_date=now.date(),
            )
        )

    completed = [
        ("commander", "know-yourself", 90, 8, None),
        ("pilot", "know-your-crew", 80, 6, users["commander"].id),
        ("engineer", "know-yourself", 70, 4, None),
    ]
    for key, slug, score, days_ago, subject_id in completed:
        quiz = session.scalar(select(Quiz).where(Quiz.slug == slug))
        if quiz is None:
            continue
        session.add(
            QuizAttempt(
                quiz_id=quiz.id,
                user_id=users[key].id,
                subject_user_id=subject_id,
                answers=[],
                score=score,
                completed_at=now - timedelta(days=days_ago),
            )
        )

    unlocks = [
        ("commander", "first-check", 40),
        ("commander", "streak-7", 20),
        ("commander", "quiz-ace", 8),
        ("pilot", "first-check", 38),
        ("specialist", "first-check", 36),
        ("engineer", "first-check", 41),
        ("engineer", "streak-7", 24),
        ("engineer", "quiz-ace", 14),
    ]
    for key, code, days_ago in unlocks:
        session.add(
            UserAchievement(
                user_id=users[key].id,
                achievement_code=code,
                unlocked_at=now - timedelta(days=days_ago),
            )
        )


def seed_demo(session: Session, reset: bool = False, now: datetime | None = None) -> None:
    if reset:
        reset_database(session)

    seed_metric_definitions(session)

    if session.scalar(select(Mission).where(Mission.name == MISSION_NAME)) is not None:
        print("AstraHealth demo data already present. Use --reset to rebuild it.")
        return

    now = now or datetime.now(UTC).replace(microsecond=0)
    rng = random.Random(2026111400)

    mission = Mission(
        name=MISSION_NAME,
        profile="mars_transit",
        environment="spacecraft",
        start_at=now - timedelta(days=42),
        duration_days=900,
    )
    session.add(mission)
    session.flush()

    crew = Crew(name="Ares Crew", mission_id=mission.id)
    session.add(crew)
    session.flush()

    password_hash = hash_password(DEMO_PASSWORD)
    users: dict[str, User] = {}
    for spec in USER_SPECS:
        user = User(
            email=spec["email"],
            password_hash=password_hash,
            full_name=spec["full_name"],
            role=spec["role"],
            crew_id=crew.id,
            share_status=(
                "status_only"
                if spec["key"] in {"commander", "pilot"}
                else "private"
            ),
            avatar_seed=spec["avatar_seed"],
        )
        session.add(user)
        users[spec["key"]] = user
    session.flush()

    surgeon = User(
        email=SURGEON_SPEC["email"],
        password_hash=password_hash,
        full_name=SURGEON_SPEC["full_name"],
        role=SURGEON_SPEC["role"],
        crew_id=None,
        share_status="private",
        avatar_seed=SURGEON_SPEC["avatar_seed"],
    )
    session.add(surgeon)
    session.flush()

    session.add_all(
        [
            SurgeonInstruction(
                surgeon_id=surgeon.id,
                crew_user_id=users["commander"].id,
                kind="note",
                message=(
                    "Your HRV and sleep efficiency are below baseline. Protect the "
                    "sleep window tonight, repeat the Systems Check tomorrow, and I "
                    "will review the new capture."
                ),
                status="open",
            ),
            SurgeonAssessment(
                surgeon_id=surgeon.id,
                crew_user_id=users["pilot"].id,
                status="final",
                working_diagnosis="Febrile episode, likely viral — under observation",
                findings=(
                    "Core temperature 38.4 °C with tachycardia at 104 bpm, headache, "
                    "and reduced sleep. No chest pain or dyspnea reported."
                ),
                plan=(
                    "Stop exercise, hydrate, monitor temperature every four hours, "
                    "repeat vitals through the capture feed, and escalate immediately "
                    "for chest pain, dyspnea, or confusion."
                ),
                follow_up="Review in 12 hours; flight surgeon call at the next comms window.",
                share_with_crew=True,
            ),
        ]
    )
    session.flush()

    _seed_content(session)
    measurement_count = _seed_measurements(session, users, now, rng)
    checkin_count = _seed_checkins(session, users, now)
    session.flush()

    computed: dict[str, tuple[float, str]] = {}
    for key, user in users.items():
        # Give each seeded check-in its own snapshot so opening it in the
        # Systems Report shows the state at that moment instead of "insufficient
        # data". Older-than-baseline check-ins are skipped by the engine.
        seeded_checkins = session.scalars(
            select(Checkin)
            .where(Checkin.user_id == user.id)
            .order_by(Checkin.completed_at.asc())
        ).all()
        for seeded_checkin in seeded_checkins:
            if seeded_checkin.completed_at is None:
                continue
            compute_and_persist_readiness(
                session,
                user,
                mission.profile,
                seeded_checkin.completed_at,
            )

        snapshot = None
        for day_offset in range(6, -1, -1):
            snapshot = compute_and_persist_readiness(
                session,
                user,
                mission.profile,
                now - timedelta(days=day_offset),
            )
        if snapshot is not None:
            computed[key] = (snapshot.score, snapshot.status)

    _seed_credits(session, users, now)
    _seed_weather(session, now)
    _seed_activity(session, users, now)

    session.commit()

    print(f"Seeded mission '{mission.name}' for {len(users)} crew members.")
    print(f"  measurements: {measurement_count}")
    print(f"  check-ins: {checkin_count}")
    print("  computed readiness:")
    for key, (score, status) in computed.items():
        print(f"    {key}: {score} ({status})")
    print(f"  knowledge articles: {len(KNOWLEDGE_ARTICLES)}")
    print(f"  quizzes: {len(QUIZZES)}")
    print(f"  training items: {len(TRAINING_ITEMS)}")
    print(f"  achievements: {len(ACHIEVEMENTS)}")
    print(
        "  demo accounts: "
        + ", ".join([*(spec["email"] for spec in USER_SPECS), SURGEON_SPEC["email"]])
    )
    print(f"  password: {DEMO_PASSWORD}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the AstraHealth demo database.")
    parser.add_argument("--reset", action="store_true", help="Truncate all tables first.")
    args = parser.parse_args()

    with SessionLocal() as session:
        seed_demo(session, reset=args.reset)


if __name__ == "__main__":
    main()
