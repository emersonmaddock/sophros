import os
from collections.abc import AsyncGenerator
from typing import Any

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.db.base_class import Base
from app.db.session import get_db
from app.main import app
from app.models.user import User
from app.models.goal import UserGoal  # Import to ensure mapper initialization


# Use in-memory SQLite database for testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Create test engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# Create test session factory
TestSessionLocal = sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


@pytest_asyncio.fixture
async def test_db() -> AsyncGenerator[AsyncSession, None]:
    """Create a fresh database for each test."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def async_client(test_db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create an async test client with database dependency override."""

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield test_db

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(test_db: AsyncSession) -> User:
    """Create a test user in the database."""
    user = User(
        id="user_test123",
        email="test@example.com",
        is_active=True,
        age=25,
        weight=70.0,
        height=175.0,
        gender="male",
        activity_level="moderate",
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user: User) -> dict[str, str]:
    """Generate valid JWT authentication headers for test user."""
    # Create a JWT token with the test user's ID
    # This mimics what Clerk would provide
    token_data = {"sub": test_user.id}
    token = jwt.encode(token_data, "test-secret", algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}



@pytest.fixture
def webhook_headers() -> dict[str, str]:
    """Generate valid webhook secret headers."""
    # Set a test webhook secret
    secret = "test-webhook-secret-123"

    # Store original value
    original = settings.CLERK_WEBHOOK_SECRET

    # Set test secret
    settings.CLERK_WEBHOOK_SECRET = secret

    headers = {"X-Webhook-Secret": secret}

    yield headers

    # Restore original
    settings.CLERK_WEBHOOK_SECRET = original


@pytest.fixture
def invalid_webhook_headers(webhook_headers: dict[str, str]) -> dict[str, str]:
    """Generate invalid webhook secret headers.

    Note: This depends on webhook_headers to ensure the secret is configured.
    """
    return {"X-Webhook-Secret": "wrong-secret"}

