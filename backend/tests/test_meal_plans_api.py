from datetime import date
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from app.domain.enums import Day, MealSlot
from app.schemas.meal_plan import DailyMealPlan, MealSlotTarget, WeeklyMealPlan

BASE = "/api/v1/meal-plans"

MONDAY = date(2025, 6, 2)   # confirmed Monday
TUESDAY = date(2025, 6, 3)  # not a Monday

WEEKLY_PLAN_PAYLOAD = {
    "daily_plans": [
        {
            "day": "Monday",
            "slots": [
                {
                    "slot_name": "Breakfast",
                    "calories": 600,
                    "protein": 30,
                    "carbohydrates": 75,
                    "fat": 20,
                }
            ],
            "exercise": None,
            "total_calories": 600,
            "total_protein": 30,
            "total_carbs": 75,
            "total_fat": 20,
        }
    ],
    "total_weekly_calories": 600,
}


@pytest.mark.asyncio
async def test_save_meal_plan_creates_new(client: AsyncClient):
    response = await client.post(
        f"{BASE}/save",
        json={"week_start_date": str(MONDAY), "plan_data": WEEKLY_PLAN_PAYLOAD},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["week_start_date"] == str(MONDAY)
    assert "id" in data


@pytest.mark.asyncio
async def test_save_meal_plan_non_monday_rejected(client: AsyncClient):
    response = await client.post(
        f"{BASE}/save",
        json={"week_start_date": str(TUESDAY), "plan_data": WEEKLY_PLAN_PAYLOAD},
    )
    assert response.status_code == 400
    assert "Monday" in response.json()["detail"]


@pytest.mark.asyncio
async def test_save_meal_plan_upserts_existing(client: AsyncClient):
    first = await client.post(
        f"{BASE}/save",
        json={"week_start_date": str(MONDAY), "plan_data": WEEKLY_PLAN_PAYLOAD},
    )
    first_id = first.json()["id"]

    second = await client.post(
        f"{BASE}/save",
        json={"week_start_date": str(MONDAY), "plan_data": WEEKLY_PLAN_PAYLOAD},
    )
    assert second.status_code == 200
    assert second.json()["id"] == first_id


@pytest.mark.asyncio
async def test_get_week_plan_found(client: AsyncClient):
    await client.post(
        f"{BASE}/save",
        json={"week_start_date": str(MONDAY), "plan_data": WEEKLY_PLAN_PAYLOAD},
    )
    response = await client.get(f"{BASE}/week", params={"week_start_date": str(MONDAY)})
    assert response.status_code == 200
    assert response.json()["week_start_date"] == str(MONDAY)


@pytest.mark.asyncio
async def test_get_week_plan_returns_null_when_none(client: AsyncClient):
    unplanned = date(2025, 1, 6)  # Monday with no saved data
    response = await client.get(
        f"{BASE}/week", params={"week_start_date": str(unplanned)}
    )
    assert response.status_code == 200
    assert response.json() is None


@pytest.mark.asyncio
async def test_get_planned_weeks(client: AsyncClient):
    week1 = date(2025, 6, 2)
    week2 = date(2025, 6, 9)
    for week in (week1, week2):
        await client.post(
            f"{BASE}/save",
            json={"week_start_date": str(week), "plan_data": WEEKLY_PLAN_PAYLOAD},
        )

    response = await client.get(f"{BASE}/planned-weeks")
    assert response.status_code == 200
    weeks = response.json()
    assert str(week1) in weeks
    assert str(week2) in weeks


@pytest.mark.asyncio
async def test_generate_daily_plan(client: AsyncClient):
    mock_plan = DailyMealPlan(
        day=Day.MONDAY,
        slots=[
            MealSlotTarget(
                slot_name=MealSlot.BREAKFAST,
                calories=600,
                protein=30,
                carbohydrates=75,
                fat=20,
            )
        ],
        exercise=None,
        total_calories=600,
        total_protein=30,
        total_carbs=75,
        total_fat=20,
    )
    with patch("app.api.endpoints.meal_plans.MealPlanService") as MockService:
        MockService.return_value.generate_daily_plan = AsyncMock(return_value=mock_plan)
        response = await client.post(f"{BASE}/generate", params={"day": "Monday"})

    assert response.status_code == 200
    assert response.json()["day"] == "Monday"


@pytest.mark.asyncio
async def test_generate_weekly_plan(client: AsyncClient):
    mock_weekly = WeeklyMealPlan(
        daily_plans=[
            DailyMealPlan(
                day=Day.MONDAY,
                slots=[],
                exercise=None,
                total_calories=2000,
                total_protein=150,
                total_carbs=250,
                total_fat=70,
            )
        ],
        total_weekly_calories=2000,
    )
    with patch("app.api.endpoints.meal_plans.MealPlanService") as MockService:
        MockService.return_value.generate_weekly_plan = AsyncMock(return_value=mock_weekly)
        response = await client.post(f"{BASE}/generate-week")

    assert response.status_code == 200
    data = response.json()
    assert "daily_plans" in data
    assert data["total_weekly_calories"] == 2000
