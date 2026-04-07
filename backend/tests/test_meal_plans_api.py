from datetime import date
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import Day, MealSlot
from app.models.planned_event import MealDetail, PlannedEvent
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


@pytest.mark.asyncio
async def test_save_creates_planned_events(client: AsyncClient, db: AsyncSession):
    """Verify that POST /save decomposes JSON into planned_events rows."""
    response = await client.post(
        f"{BASE}/save",
        json={"week_start_date": str(MONDAY), "plan_data": WEEKLY_PLAN_PAYLOAD},
    )
    assert response.status_code == 200
    plan_id = response.json()["id"]

    # Query the database directly to verify rows were created
    result = await db.execute(
        select(PlannedEvent).where(PlannedEvent.meal_plan_id == plan_id)
    )
    events = result.scalars().all()
    assert len(events) == 1  # One meal slot in WEEKLY_PLAN_PAYLOAD
    assert events[0].event_type == "meal"
    assert events[0].title == "Breakfast"  # Falls back to slot_name when no recipe
    assert events[0].day == "Monday"

    result = await db.execute(
        select(MealDetail).where(MealDetail.event_id == events[0].id)
    )
    detail = result.scalar_one()
    assert detail.calories == 600
    assert detail.protein == 30
    assert detail.slot_name == "Breakfast"


@pytest.mark.asyncio
async def test_save_get_roundtrip_totals(client: AsyncClient):
    """Verify GET /week returns server-computed totals matching the original save."""
    await client.post(
        f"{BASE}/save",
        json={"week_start_date": str(MONDAY), "plan_data": WEEKLY_PLAN_PAYLOAD},
    )
    response = await client.get(f"{BASE}/week", params={"week_start_date": str(MONDAY)})
    assert response.status_code == 200
    data = response.json()
    monday = next(d for d in data["plan_data"]["daily_plans"] if d["day"] == "Monday")
    assert monday["total_calories"] == 600
    assert monday["total_protein"] == 30
    assert monday["total_carbs"] == 75
    assert monday["total_fat"] == 20
    assert data["plan_data"]["total_weekly_calories"] == 600


@pytest.mark.asyncio
async def test_add_event(client: AsyncClient):
    """POST /{plan_id}/events creates a new meal event."""
    save_resp = await client.post(
        f"{BASE}/save",
        json={"week_start_date": str(MONDAY), "plan_data": WEEKLY_PLAN_PAYLOAD},
    )
    plan_id = save_resp.json()["id"]

    response = await client.post(
        f"{BASE}/{plan_id}/events",
        json={
            "day": "Monday",
            "event_type": "meal",
            "time": "12:00:00",
            "title": "Custom Lunch",
            "slot_name": "Lunch",
            "calories": 500,
            "protein": 30,
            "carbohydrates": 60,
            "fat": 15,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["day"] == "Monday"
    assert len(data["events"]) == 2  # original breakfast + new lunch
    # Totals should include both meals
    assert data["total_calories"] == 1100  # 600 + 500
    assert data["total_protein"] == 60  # 30 + 30


@pytest.mark.asyncio
async def test_update_event_macros(client: AsyncClient):
    """PUT /events/{id} updates macros and recalculates totals."""
    save_resp = await client.post(
        f"{BASE}/save",
        json={"week_start_date": str(MONDAY), "plan_data": WEEKLY_PLAN_PAYLOAD},
    )
    plan_id = save_resp.json()["id"]

    # Add an event so we know its ID
    add_resp = await client.post(
        f"{BASE}/{plan_id}/events",
        json={
            "day": "Monday",
            "event_type": "meal",
            "time": "12:00:00",
            "title": "Lunch",
            "slot_name": "Lunch",
            "calories": 500,
            "protein": 30,
            "carbohydrates": 60,
            "fat": 15,
        },
    )
    events = add_resp.json()["events"]
    lunch_event = next(e for e in events if e["title"] == "Lunch")

    # Update the lunch macros
    response = await client.put(
        f"{BASE}/events/{lunch_event['id']}",
        json={"calories": 400, "protein": 25},
    )
    assert response.status_code == 200
    data = response.json()
    # Totals should reflect updated values
    assert data["total_calories"] == 1000  # 600 + 400
    assert data["total_protein"] == 55  # 30 + 25


@pytest.mark.asyncio
async def test_delete_event(client: AsyncClient):
    """DELETE /events/{id} removes event and recalculates totals."""
    save_resp = await client.post(
        f"{BASE}/save",
        json={"week_start_date": str(MONDAY), "plan_data": WEEKLY_PLAN_PAYLOAD},
    )
    plan_id = save_resp.json()["id"]

    # Add an event
    add_resp = await client.post(
        f"{BASE}/{plan_id}/events",
        json={
            "day": "Monday",
            "event_type": "meal",
            "time": "12:00:00",
            "title": "Lunch",
            "slot_name": "Lunch",
            "calories": 500,
            "protein": 30,
            "carbohydrates": 60,
            "fat": 15,
        },
    )
    events = add_resp.json()["events"]
    lunch_id = next(e for e in events if e["title"] == "Lunch")["id"]

    response = await client.delete(f"{BASE}/events/{lunch_id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data["events"]) == 1  # Only breakfast remains
    assert data["total_calories"] == 600


@pytest.mark.asyncio
async def test_complete_event(client: AsyncClient):
    """POST /events/{id}/complete marks event as completed."""
    save_resp = await client.post(
        f"{BASE}/save",
        json={"week_start_date": str(MONDAY), "plan_data": WEEKLY_PLAN_PAYLOAD},
    )
    plan_id = save_resp.json()["id"]

    add_resp = await client.post(
        f"{BASE}/{plan_id}/events",
        json={
            "day": "Monday",
            "event_type": "meal",
            "time": "08:00:00",
            "title": "Breakfast",
            "slot_name": "Breakfast",
            "calories": 400,
        },
    )
    event_id = add_resp.json()["events"][-1]["id"]

    response = await client.post(f"{BASE}/events/{event_id}/complete")
    assert response.status_code == 200
    assert response.json()["completed"] is True


@pytest.mark.asyncio
async def test_event_ownership_validation(client: AsyncClient):
    """Events from other users return 404."""
    response = await client.put(
        f"{BASE}/events/99999",
        json={"title": "Hacked"},
    )
    assert response.status_code == 404
