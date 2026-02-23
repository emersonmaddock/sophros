from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.domain.enums import ActivityType
from app.services.google_calendar import GoogleCalendarService


@pytest.fixture
def google_service():
    return GoogleCalendarService()


def test_classify_activity(google_service):
    assert google_service.classify_activity("Team Standup") == ActivityType.WORK
    assert (
        google_service.classify_activity("Morning Gym Session") == ActivityType.EXERCISE
    )
    assert google_service.classify_activity("Dinner with family") == ActivityType.MEAL
    assert google_service.classify_activity("Sleep") == ActivityType.SLEEP
    assert google_service.classify_activity("Watching a movie") == ActivityType.LEISURE
    assert google_service.classify_activity("Random task") == ActivityType.OTHER


@pytest.mark.asyncio
async def test_sync_calendar_no_token(google_service):
    db = AsyncMock()
    with patch.object(google_service, "get_google_token_from_clerk", return_value=None):
        result = await google_service.sync_calendar(db, "user_123")
        assert result.items_synced == 0
        assert "Could not retrieve Google access token" in result.errors[0]


@pytest.mark.asyncio
async def test_sync_calendar_success(google_service):
    db = AsyncMock()
    user_id = "user_123"
    token = "fake_token"

    # Mock events from Google
    mock_events = {
        "items": [
            {
                "id": "event_1",
                "summary": "Weightlifting",
                "start": {"dateTime": "2024-02-23T10:00:00Z"},
                "end": {"dateTime": "2024-02-23T11:00:00Z"},
            }
        ]
    }

    with (
        patch.object(google_service, "get_google_token_from_clerk", return_value=token),
        patch("app.services.google_calendar.build") as mock_build,
        patch("app.services.google_calendar.select") as mock_select,
        patch("app.services.google_calendar.ScheduleItem") as mock_schedule_item_class,
    ):
        # Setup mock service
        mock_calendar_service = mock_build.return_value
        mock_calendar_service.events.return_value.list.return_value.execute.return_value = mock_events

        # Setup mock DB result (event doesn't exist)
        db_result = MagicMock()  # Sync mock because scalar_one_or_none is sync
        db_result.scalar_one_or_none.return_value = None
        db.execute.return_value = db_result

        # Configure mock class to return a mock instance
        mock_item_instance = MagicMock()
        mock_schedule_item_class.return_value = mock_item_instance

        result = await google_service.sync_calendar(db, user_id)

        assert result.items_synced == 1
        assert result.items_updated == 0
        assert len(result.errors) == 0

        # Check if item was added to DB
        db.add.assert_called_once()
        mock_schedule_item_class.assert_called_once()

        # Verify initialization arguments
        call_args = mock_schedule_item_class.call_args[1]
        assert call_args["user_id"] == user_id
        assert call_args["activity_type"] == ActivityType.EXERCISE
        assert call_args["google_event_id"] == "event_1"
        assert call_args["duration_minutes"] == 60
