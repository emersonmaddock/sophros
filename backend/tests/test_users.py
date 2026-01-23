import pytest
from httpx import AsyncClient

from app.models.user import User


@pytest.mark.asyncio
async def test_create_user_requires_webhook_secret(async_client: AsyncClient):
    """Test that POST /users/ returns 403 when webhook secret is missing."""
    user_data = {"id": "user_new123", "email": "newuser@example.com"}
    response = await async_client.post("/api/v1/users/", json=user_data)
    assert response.status_code == 403
    assert response.json()["detail"] == "Webhook secret required"


@pytest.mark.asyncio
async def test_create_user_invalid_webhook_secret(
    async_client: AsyncClient, invalid_webhook_headers: dict
):
    """Test that POST /users/ returns 403 with invalid webhook secret."""
    user_data = {"id": "user_new123", "email": "newuser@example.com"}
    response = await async_client.post(
        "/api/v1/users/", json=user_data, headers=invalid_webhook_headers
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Invalid webhook secret"


@pytest.mark.asyncio
async def test_create_user_with_valid_webhook_secret(
    async_client: AsyncClient, webhook_headers: dict
):
    """Test that POST /users/ succeeds with valid webhook secret."""
    user_data = {"id": "user_new123", "email": "newuser@example.com"}
    response = await async_client.post(
        "/api/v1/users/", json=user_data, headers=webhook_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "user_new123"
    assert data["email"] == "newuser@example.com"
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_create_user_duplicate(
    async_client: AsyncClient, webhook_headers: dict, test_user: User
):
    """Test that creating a duplicate user returns 400."""
    user_data = {"id": test_user.id, "email": test_user.email}
    response = await async_client.post(
        "/api/v1/users/", json=user_data, headers=webhook_headers
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "User already exists"


@pytest.mark.asyncio
async def test_get_user_me(async_client: AsyncClient, auth_headers: dict):
    """Test that authenticated users can get their own profile."""
    response = await async_client.get("/api/v1/users/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "user_test123"
    assert data["email"] == "test@example.com"
    assert data["age"] == 25
    assert data["weight"] == 70.0


@pytest.mark.asyncio
async def test_update_user_me(async_client: AsyncClient, auth_headers: dict):
    """Test that authenticated users can update their own profile."""
    update_data = {"age": 26, "weight": 72.5, "activity_level": "active"}
    response = await async_client.put(
        "/api/v1/users/me", json=update_data, headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["age"] == 26
    assert data["weight"] == 72.5
    assert data["activity_level"] == "active"
    # Verify other fields unchanged
    assert data["email"] == "test@example.com"
    assert data["height"] == 175.0
