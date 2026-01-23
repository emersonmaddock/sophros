import pytest
from httpx import AsyncClient

from app.core.config import settings


@pytest.mark.asyncio
async def test_user_me_requires_auth(async_client: AsyncClient):
    """Test that GET /users/me returns 403 when no auth token is provided."""
    response = await async_client.get("/api/v1/users/me")
    assert response.status_code == 403
    assert "detail" in response.json()


@pytest.mark.asyncio
async def test_user_me_invalid_token(async_client: AsyncClient):
    """Test that GET /users/me returns 403 with invalid auth token."""
    headers = {"Authorization": "Bearer invalid-token-here"}
    response = await async_client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_user_me_with_valid_token(async_client: AsyncClient, auth_headers: dict):
    """Test that GET /users/me works with valid auth token."""
    response = await async_client.get("/api/v1/users/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["id"] == "user_test123"


@pytest.mark.asyncio
async def test_update_user_requires_auth(async_client: AsyncClient):
    """Test that PUT /users/me returns 403 when no auth token is provided."""
    update_data = {"age": 30}
    response = await async_client.put("/api/v1/users/me", json=update_data)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_update_user_with_valid_token(
    async_client: AsyncClient, auth_headers: dict
):
    """Test that PUT /users/me works with valid auth token."""
    update_data = {"age": 30, "weight": 75.0}
    response = await async_client.put(
        "/api/v1/users/me", json=update_data, headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["age"] == 30
    assert data["weight"] == 75.0
