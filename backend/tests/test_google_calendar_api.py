from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.api import deps
from app.db.session import get_db
from app.domain.enums import ActivityLevel, PregnancyStatus, Sex
from app.main import app
from app.models.google_calendar import GoogleCalendarConnection
from app.services.clerk_oauth import ClerkOAuthError

BASE = "/api/v1/calendar/google"


@pytest.fixture
async def mock_google_calendar_client() -> AsyncClient:
    mock_user = MagicMock()
    mock_user.id = "test_user_id"
    mock_user.email = "test@example.com"
    mock_user.age = 30
    mock_user.weight = 70.0
    mock_user.height = 175.0
    mock_user.show_imperial = False
    mock_user.gender = Sex.MALE
    mock_user.activity_level = ActivityLevel.MODERATE
    mock_user.pregnancy_status = PregnancyStatus.NOT_PREGNANT
    mock_user.target_weight = None
    mock_user.target_body_fat = None
    mock_user.target_date = None
    mock_user.wake_up_time = None
    mock_user.sleep_time = None
    mock_user.user_allergies = []
    mock_user.user_include_cuisines = []
    mock_user.user_exclude_cuisines = []
    mock_user.user_busy_times = []

    class MockResult:
        def __init__(self, value=None):
            self.value = value

        def scalar_one_or_none(self):
            return self.value

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=MockResult())
    mock_db.add = MagicMock()
    mock_db.flush = AsyncMock()
    mock_db.commit = AsyncMock()

    async def override_get_db():
        yield mock_db

    async def override_get_current_user():
        return mock_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[deps.get_current_user] = override_get_current_user

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        ac.mock_db = mock_db
        yield ac

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_connect_calendar_creates_connection(mock_google_calendar_client):
    mock_service = MagicMock()
    mock_service.get_user_email = AsyncMock(return_value="calendar@example.com")

    async def sync_side_effect(
        connection, access_token, db_session, utc_offset_minutes
    ):
        assert access_token == "google-access-token"
        assert db_session is mock_google_calendar_client.mock_db
        assert utc_offset_minutes == 0
        connection.last_synced_at = datetime(2026, 4, 26, 12, 0, tzinfo=UTC)
        connection.sync_status = "synced"
        return 7, "batch-123"

    mock_service.sync_for_user = AsyncMock(side_effect=sync_side_effect)

    mock_clerk = MagicMock()
    mock_clerk.get_google_access_token = AsyncMock(return_value="google-access-token")

    with (
        patch(
            "app.api.endpoints.google_calendar._get_service",
            return_value=mock_service,
        ),
        patch(
            "app.api.endpoints.google_calendar._get_clerk_oauth_service",
            return_value=mock_clerk,
        ),
    ):
        response = await mock_google_calendar_client.post(f"{BASE}/connect")

    assert response.status_code == 200
    assert response.json() == {
        "connected": True,
        "email": "calendar@example.com",
        "last_synced_at": "2026-04-26T12:00:00Z",
        "sync_status": "synced",
        "needs_reconnect": False,
    }

    added_connection = next(
        call.args[0]
        for call in mock_google_calendar_client.mock_db.add.call_args_list
        if isinstance(call.args[0], GoogleCalendarConnection)
    )
    assert added_connection.user_id == "test_user_id"
    assert added_connection.google_account_email == "calendar@example.com"
    assert added_connection.sync_status == "synced"


@pytest.mark.asyncio
async def test_connect_calendar_returns_409_when_clerk_has_no_google_token(
    mock_google_calendar_client,
):
    mock_clerk = MagicMock()
    mock_clerk.get_google_access_token = AsyncMock(
        side_effect=ClerkOAuthError("Google account is not connected in Clerk")
    )

    with patch(
        "app.api.endpoints.google_calendar._get_clerk_oauth_service",
        return_value=mock_clerk,
    ):
        response = await mock_google_calendar_client.post(f"{BASE}/connect")

    assert response.status_code == 409
    assert "Google account is not connected in Clerk" in response.json()["detail"]
