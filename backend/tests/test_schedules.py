import pytest
from httpx import AsyncClient

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
