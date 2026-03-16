import pytest
from app.domain.enums import Allergy
from app.models.dietary import UserAllergy
from app.models.user import User
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

BASE = "/api/v1/users"

USER_PAYLOAD = {
    "email": "new@sophros.com",
    "age": 25,
    "weight": 70.0,
    "height": 170.0,
    "show_imperial": False,
    "gender": "male",
    "activity_level": "moderate",
    "pregnancy_status": "not_pregnant",
    "allergies": ["Dairy"],
    "include_cuisine": ["Italian"],
    "exclude_cuisine": [],
    "busy_times": [],
}


@pytest.mark.asyncio
async def test_create_user_success(create_user_client: AsyncClient):
    response = await create_user_client.post(BASE, json=USER_PAYLOAD)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "new_clerk_user_id"
    assert data["email"] == "new@sophros.com"
    assert data["allergies"] == ["Dairy"]
    assert data["include_cuisine"] == ["Italian"]


@pytest.mark.asyncio
async def test_create_user_duplicate(create_user_client: AsyncClient):
    await create_user_client.post(BASE, json=USER_PAYLOAD)
    response = await create_user_client.post(BASE, json=USER_PAYLOAD)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


@pytest.mark.asyncio
async def test_read_user_me(client: AsyncClient):
    response = await client.get(f"{BASE}/me")
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@sophros.com"
    assert data["age"] == 30


@pytest.mark.asyncio
async def test_update_user_me_scalar_fields(client: AsyncClient):
    response = await client.put(f"{BASE}/me", json={"age": 35, "weight": 80.0})
    assert response.status_code == 200
    data = response.json()
    assert data["age"] == 35
    assert data["weight"] == 80.0

