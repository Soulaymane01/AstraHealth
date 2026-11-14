from datetime import UTC, datetime, timedelta

import httpx
from sqlalchemy.orm import Session

from app.models import SpaceWeatherEvent
from app.services import nasa


def _notification(**overrides) -> dict:
    issued = datetime.now(UTC) - timedelta(hours=1)
    payload = {
        "messageType": "Geomagnetic Storm",
        "messageID": "2026-11-14-GST-001",
        "messageIssueTime": issued.isoformat().replace("+00:00", "Z"),
        "messageBody": "G3 geomagnetic storm conditions observed. Strong storm levels.",
    }
    payload.update(overrides)
    return payload


def test_parse_notification_maps_kind_severity_and_window() -> None:
    parsed = nasa.parse_notification(_notification())

    assert parsed is not None
    assert parsed["event_id"] == "DONKI-2026-11-14-GST-001"
    assert parsed["kind"] == "Geomagnetic storm"
    assert parsed["severity"] == "moderate"
    assert parsed["summary"].startswith("G3 geomagnetic storm")
    assert parsed["end_at"] > parsed["start_at"]
    assert parsed["fetched_at"].tzinfo is not None


def test_parse_notification_rejects_missing_issue_time() -> None:
    assert nasa.parse_notification(_notification(messageIssueTime=None)) is None


def test_get_mission_context_falls_back_to_fixture(
    db_session: Session, monkeypatch
) -> None:
    now = datetime.now(UTC)
    db_session.add(
        SpaceWeatherEvent(
            event_id="FIXTURE-GST",
            kind="Geomagnetic storm",
            start_at=now - timedelta(days=2),
            end_at=now - timedelta(days=1),
            severity="minor",
            summary="Seeded fixture event.",
            fetched_at=now,
        )
    )
    db_session.commit()

    def fail(_: str):
        raise httpx.ConnectError("DONKI is unreachable")

    monkeypatch.setattr(nasa, "fetch_notifications", fail)
    nasa.clear_cache()
    try:
        event, source = nasa.get_mission_context(db_session, "TEST_KEY")
        assert source == "fixture"
        assert event is not None
        assert event.event_id == "FIXTURE-GST"
    finally:
        nasa.clear_cache()


def test_get_mission_context_uses_live_donki(db_session: Session, monkeypatch) -> None:
    monkeypatch.setattr(nasa, "fetch_notifications", lambda _: [_notification()])
    nasa.clear_cache()
    try:
        event, source = nasa.get_mission_context(db_session, "TEST_KEY")
        assert source == "live"
        assert event is not None
        assert event.event_id == "DONKI-2026-11-14-GST-001"
        assert event.kind == "Geomagnetic storm"
        assert db_session.get(SpaceWeatherEvent, event.id) is not None
    finally:
        nasa.clear_cache()
