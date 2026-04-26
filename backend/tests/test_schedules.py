from datetime import datetime

import pytest
from httpx import AsyncClient

from app.domain.enums import ActivityType
from app.models.meal import Meal, ScheduleItemAlternative
from app.models.schedule import ScheduleItem

MONDAY = "2025-06-02"  # confirmed Monday
TUESDAY = "2025-06-03"  # not a Monday

BASE = "/api/v1/schedules"


def _payload(dt: str = "2025-06-15T10:00:00") -> dict:
    return {
        "date": dt,
        "activity_type": "exercise",
        "duration_minutes": 60,
        "is_completed": False,
    }


@pytest.mark.asyncio
async def test_create_schedule_item(client: AsyncClient):
    response = await client.post(BASE, json=_payload())
    assert response.status_code == 200
    data = response.json()
    assert data["activity_type"] == "exercise"
    assert data["duration_minutes"] == 60
    assert "id" in data


@pytest.mark.asyncio
async def test_get_schedule_items_in_range(client: AsyncClient):
    await client.post(BASE, json=_payload("2025-06-15T10:00:00"))
    response = await client.get(
        BASE,
        params={
            "start_date": "2025-06-01T00:00:00",
            "end_date": "2025-06-30T23:59:59",
        },
    )
    assert response.status_code == 200
    items = response.json()
    assert len(items) >= 1
    assert items[0]["activity_type"] == "exercise"


@pytest.mark.asyncio
async def test_get_schedule_items_outside_range(client: AsyncClient):
    await client.post(BASE, json=_payload("2025-06-15T10:00:00"))
    response = await client.get(
        BASE,
        params={
            "start_date": "2025-07-01T00:00:00",
            "end_date": "2025-07-31T23:59:59",
        },
    )
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_update_schedule_item(client: AsyncClient):
    create_resp = await client.post(BASE, json=_payload())
    item_id = create_resp.json()["id"]

    response = await client.put(
        f"{BASE}/{item_id}", json={"is_completed": True, "duration_minutes": 90}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_completed"] is True
    assert data["duration_minutes"] == 90


@pytest.mark.asyncio
async def test_update_schedule_item_not_found(client: AsyncClient):
    response = await client.put(f"{BASE}/99999", json={"is_completed": True})
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_schedule_item(client: AsyncClient):
    create_resp = await client.post(BASE, json=_payload())
    item_id = create_resp.json()["id"]

    response = await client.delete(f"{BASE}/{item_id}")
    assert response.status_code == 204

    # Confirm it is no longer returned in a range query
    get_resp = await client.get(
        BASE,
        params={
            "start_date": "2025-01-01T00:00:00",
            "end_date": "2025-12-31T23:59:59",
        },
    )
    assert all(item["id"] != item_id for item in get_resp.json())


@pytest.mark.asyncio
async def test_delete_schedule_item_not_found(client: AsyncClient):
    response = await client.delete(f"{BASE}/99999")
    assert response.status_code == 404


async def _create_meal(db, **kwargs) -> Meal:
    defaults = dict(
        recipe_id="abc123",
        title="Test Meal",
        calories=500,
        protein=30,
        carbohydrates=60,
        fat=15,
        ingredients=[],
        tags=[],
    )
    meal = Meal(**{**defaults, **kwargs})
    db.add(meal)
    await db.flush()
    return meal


async def _create_meal_schedule_item(
    db, user_id: str, day_offset: int, meal: Meal
) -> ScheduleItem:
    monday = datetime(2025, 6, 2)
    item_dt = monday.replace(day=monday.day + day_offset, hour=8)
    item = ScheduleItem(
        user_id=user_id,
        date=item_dt,
        activity_type=ActivityType.MEAL,
        duration_minutes=30,
        is_completed=False,
        meal_id=meal.id,
    )
    db.add(item)
    await db.flush()
    return item


@pytest.mark.asyncio
async def test_get_week_schedule_returns_meal_items(client: AsyncClient, db, mock_user):
    meal = await _create_meal(db)
    await _create_meal_schedule_item(db, mock_user.id, 0, meal)  # Monday
    await db.commit()

    response = await client.get(f"{BASE}/week", params={"week_start_date": MONDAY})

    assert response.status_code == 200
    items = response.json()
    assert len(items) >= 1
    meal_items = [i for i in items if i["activity_type"] == "meal"]
    assert len(meal_items) == 1
    assert meal_items[0]["meal"]["title"] == "Test Meal"
    assert meal_items[0]["meal"]["calories"] == 500
    assert meal_items[0]["alternatives"] == []


@pytest.mark.asyncio
async def test_get_week_schedule_includes_alternatives(
    client: AsyncClient, db, mock_user
):
    primary = await _create_meal(db, recipe_id="primary", title="Primary Meal")
    alt_meal = await _create_meal(db, recipe_id="alt", title="Alt Meal")
    item = await _create_meal_schedule_item(db, mock_user.id, 0, primary)
    db.add(ScheduleItemAlternative(schedule_item_id=item.id, meal_id=alt_meal.id))
    await db.commit()

    response = await client.get(f"{BASE}/week", params={"week_start_date": MONDAY})

    assert response.status_code == 200
    items = response.json()
    meal_items = [i for i in items if i["activity_type"] == "meal"]
    assert len(meal_items[0]["alternatives"]) == 1
    assert meal_items[0]["alternatives"][0]["title"] == "Alt Meal"


@pytest.mark.asyncio
async def test_get_week_schedule_rejects_non_monday(client: AsyncClient):
    response = await client.get(f"{BASE}/week", params={"week_start_date": TUESDAY})
    assert response.status_code == 400
    assert "Monday" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_week_schedule_empty_week(client: AsyncClient):
    response = await client.get(
        f"{BASE}/week", params={"week_start_date": "2025-01-06"}
    )
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_swap_meal(client: AsyncClient, db, mock_user):
    primary = await _create_meal(db, recipe_id="primary", title="Primary")
    alt = await _create_meal(db, recipe_id="alt", title="Alternative")
    item = await _create_meal_schedule_item(db, mock_user.id, 0, primary)
    db.add(ScheduleItemAlternative(schedule_item_id=item.id, meal_id=alt.id))
    await db.commit()

    response = await client.post(f"{BASE}/{item.id}/swap", json={"meal_id": alt.id})

    assert response.status_code == 200
    data = response.json()
    assert data["meal_id"] == alt.id
    assert data["meal"]["title"] == "Alternative"


@pytest.mark.asyncio
async def test_swap_meal_invalid_meal_id(client: AsyncClient, db, mock_user):
    meal = await _create_meal(db)
    item = await _create_meal_schedule_item(db, mock_user.id, 0, meal)
    await db.commit()

    response = await client.post(f"{BASE}/{item.id}/swap", json={"meal_id": 99999})

    assert response.status_code == 400
    assert "not an alternative" in response.json()["detail"]


@pytest.mark.asyncio
async def test_swap_meal_not_found(client: AsyncClient):
    response = await client.post(f"{BASE}/99999/swap", json={"meal_id": 1})
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_primary_cascades_to_leftovers(client, db, mock_user):
    meal = Meal(
        recipe_id="r1",
        title="Chili",
        calories=500,
        protein=30,
        carbohydrates=40,
        fat=20,
        ingredients=[],
        tags=[],
    )
    db.add(meal)
    await db.flush()

    source = ScheduleItem(
        user_id=mock_user.id,
        date=datetime(2026, 4, 20, 18, 0),
        activity_type=ActivityType.MEAL,
        duration_minutes=30,
        meal_id=meal.id,
    )
    db.add(source)
    await db.flush()

    leftover = ScheduleItem(
        user_id=mock_user.id,
        date=datetime(2026, 4, 21, 12, 0),
        activity_type=ActivityType.MEAL,
        duration_minutes=10,
        meal_id=meal.id,
        source_schedule_item_id=source.id,
    )
    db.add(leftover)
    await db.commit()

    leftover_id = leftover.id
    source_id = source.id

    resp = await client.delete(f"/api/v1/schedules/{source_id}")
    assert resp.status_code == 204

    remaining = await db.get(ScheduleItem, leftover_id)
    assert remaining is None, "leftover should have been deleted along with its source"


@pytest.mark.asyncio
async def test_swap_primary_cascades_to_leftovers(client, db, mock_user):
    meal_a = Meal(
        recipe_id="a",
        title="Chili",
        calories=500,
        protein=30,
        carbohydrates=40,
        fat=20,
        ingredients=[],
        tags=[],
    )
    meal_b = Meal(
        recipe_id="b",
        title="Soup",
        calories=300,
        protein=20,
        carbohydrates=30,
        fat=10,
        ingredients=[],
        tags=[],
    )
    db.add_all([meal_a, meal_b])
    await db.flush()

    source = ScheduleItem(
        user_id=mock_user.id,
        date=datetime(2026, 4, 20, 18, 0),
        activity_type=ActivityType.MEAL,
        duration_minutes=30,
        meal_id=meal_a.id,
    )
    db.add(source)
    await db.flush()

    # Register meal_b as an alternative for the source
    db.add(ScheduleItemAlternative(schedule_item_id=source.id, meal_id=meal_b.id))

    leftover = ScheduleItem(
        user_id=mock_user.id,
        date=datetime(2026, 4, 21, 12, 0),
        activity_type=ActivityType.MEAL,
        duration_minutes=10,
        meal_id=meal_a.id,
        source_schedule_item_id=source.id,
    )
    db.add(leftover)
    await db.commit()

    leftover_id = leftover.id
    source_id = source.id

    resp = await client.post(
        f"/api/v1/schedules/{source_id}/swap", json={"meal_id": meal_b.id}
    )
    assert resp.status_code == 200

    await db.refresh(source)
    refreshed = await db.get(ScheduleItem, leftover_id)
    assert source.meal_id == meal_b.id
    assert refreshed is not None
    assert refreshed.meal_id == meal_b.id, "leftover's meal_id should follow the source"


@pytest.mark.asyncio
async def test_create_meal_item_rejects_neither_meal_id_nor_custom_meal(
    client: AsyncClient,
):
    payload = {
        "date": "2025-06-15T08:00:00",
        "activity_type": "meal",
        "duration_minutes": 30,
    }
    response = await client.post(BASE, json=payload)
    assert response.status_code == 422
    assert "exactly one of meal_id or custom_meal" in response.text


@pytest.mark.asyncio
async def test_create_meal_item_rejects_both_meal_id_and_custom_meal(
    client: AsyncClient, db
):
    meal = await _create_meal(db)
    await db.commit()
    payload = {
        "date": "2025-06-15T08:00:00",
        "activity_type": "meal",
        "duration_minutes": 30,
        "meal_id": meal.id,
        "custom_meal": {
            "title": "Avocado Toast",
            "calories": 350,
            "protein": 12,
            "carbohydrates": 40,
            "fat": 15,
        },
    }
    response = await client.post(BASE, json=payload)
    assert response.status_code == 422
    assert "exactly one of meal_id or custom_meal" in response.text


@pytest.mark.asyncio
async def test_create_workout_rejects_meal_id(client: AsyncClient, db):
    meal = await _create_meal(db)
    await db.commit()
    payload = {
        "date": "2025-06-15T08:00:00",
        "activity_type": "exercise",
        "duration_minutes": 45,
        "meal_id": meal.id,
    }
    response = await client.post(BASE, json=payload)
    assert response.status_code == 422
    assert "only valid for meal items" in response.text


@pytest.mark.asyncio
async def test_create_workout_rejects_custom_meal(client: AsyncClient):
    payload = {
        "date": "2025-06-15T08:00:00",
        "activity_type": "exercise",
        "duration_minutes": 45,
        "custom_meal": {
            "title": "ignored",
            "calories": 0,
            "protein": 0,
            "carbohydrates": 0,
            "fat": 0,
        },
    }
    response = await client.post(BASE, json=payload)
    assert response.status_code == 422
    assert "only valid for meal items" in response.text
