from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.api import deps
from app.db.session import get_db
from app.domain.enums import ActivityLevel, ActivityType, PregnancyStatus, Sex
from app.main import app
from app.models.meal import Meal, ScheduleItemAlternative
from app.models.schedule import ScheduleItem

BASE = "/api/v1/meal-plans"

MONDAY = "2025-06-02"    # confirmed Monday
TUESDAY = "2025-06-03"   # not a Monday


@pytest.fixture
async def mock_client() -> AsyncClient:
    """Client with mocked dependencies (no DB required)."""
    # Create a mock user with required attributes for UserRead validation
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
    mock_user.allergies = []
    mock_user.include_cuisines = []
    mock_user.exclude_cuisines = []
    mock_user.busy_times = []

    # Mock db.execute() to return an object with all() method
    class MockResult:
        def all(self):
            return []

    mock_result = MockResult()

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=mock_result)

    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[deps.get_current_user] = lambda: mock_user

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_generate_week_requires_monday(mock_client: AsyncClient):
    with patch("app.api.endpoints.meal_plans.MealPlanService"):
        response = await mock_client.post(
            f"{BASE}/generate-week",
            params={"week_start_date": TUESDAY},
        )
    assert response.status_code == 400
    assert "Monday" in response.json()["detail"]


@pytest.mark.asyncio
async def test_generate_week_calls_service_and_returns_items(mock_client: AsyncClient):
    mock_items = []  # generate_and_persist returns list[ScheduleItem]; empty is valid

    with patch("app.api.endpoints.meal_plans.MealPlanService") as MockService:
        MockService.return_value.generate_and_persist = AsyncMock(return_value=mock_items)
        response = await mock_client.post(
            f"{BASE}/generate-week",
            params={"week_start_date": MONDAY},
        )

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_generate_week_returns_500_on_service_error(mock_client: AsyncClient):
    with patch("app.api.endpoints.meal_plans.MealPlanService") as MockService:
        MockService.return_value.generate_and_persist = AsyncMock(
            side_effect=RuntimeError("Spoonacular down")
        )
        response = await mock_client.post(
            f"{BASE}/generate-week",
            params={"week_start_date": MONDAY},
        )

    assert response.status_code == 500
    assert "Failed to generate" in response.json()["detail"]


@pytest.mark.asyncio
async def test_planned_weeks_empty_when_no_meal_items(mock_client: AsyncClient):
    response = await mock_client.get(f"{BASE}/planned-weeks")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_planned_weeks_returns_mondays(client: AsyncClient, db, mock_user):
    """Insert meal-type schedule items and verify planned-weeks returns their Monday."""
    from datetime import datetime as dt

    meal = Meal(
        recipe_id="r1", title="T", calories=500, protein=30,
        carbohydrates=60, fat=15, ingredients=[], tags=[],
    )
    db.add(meal)
    await db.flush()

    item = ScheduleItem(
        user_id=mock_user.id,
        date=dt(2025, 6, 4, 8, 0),   # Wednesday in week starting 2025-06-02
        activity_type=ActivityType.MEAL,
        duration_minutes=30,
        is_completed=False,
        meal_id=meal.id,
    )
    db.add(item)
    await db.commit()

    response = await client.get(f"{BASE}/planned-weeks")
    assert response.status_code == 200
    weeks = response.json()
    assert "2025-06-02" in weeks   # Monday of that week


@pytest.mark.asyncio
async def test_removed_endpoints_return_404(mock_client: AsyncClient):
    """Verify that old endpoints no longer exist."""
    r1 = await mock_client.post(f"{BASE}/save", json={})
    r2 = await mock_client.get(f"{BASE}/week", params={"week_start_date": MONDAY})
    r3 = await mock_client.post(f"{BASE}/generate", params={"day": "Monday"})
    assert r1.status_code == 405 or r1.status_code == 404
    assert r2.status_code == 405 or r2.status_code == 404
    assert r3.status_code == 405 or r3.status_code == 404
