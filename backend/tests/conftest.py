from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import selectinload

from app.api import deps
from app.core.config import settings
from app.db.base_class import Base
from app.db.session import get_db
from app.domain.enums import ActivityLevel, PregnancyStatus, Sex
from app.main import app
from app.models.dietary import (  # noqa: F401 — registers models with Base.metadata
    UserAllergy,
    UserBusyTime,
    UserExcludeCuisine,
    UserIncludeCuisine,
)
from app.models.saved_meal_plan import SavedMealPlan  # noqa: F401
from app.models.schedule import ScheduleItem  # noqa: F401
from app.models.user import User

MOCK_USER_ID = "test_clerk_user_id"


@pytest_asyncio.fixture
async def engine():
    if not settings.DATABASE_URL:
        pytest.skip("DATABASE_URL not configured — skipping DB tests")
    eng = create_async_engine(settings.DATABASE_URL, echo=False)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await eng.dispose()


@pytest_asyncio.fixture
async def db(engine) -> AsyncGenerator[AsyncSession, None]:
    session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )
    async with session_factory() as session:
        yield session


@pytest_asyncio.fixture
async def mock_user(db: AsyncSession) -> User:
    user = User(
        id=MOCK_USER_ID,
        email="test@sophros.com",
        age=30,
        weight=75.0,
        height=175.0,
        show_imperial=False,
        gender=Sex.MALE,
        activity_level=ActivityLevel.MODERATE,
        pregnancy_status=PregnancyStatus.NOT_PREGNANT,
    )
    db.add(user)
    await db.commit()
    # Re-fetch with all relationships eagerly loaded.
    # SQLAlchemy async cannot lazy-load; accessing an unloaded relationship
    # outside of greenlet_spawn raises MissingGreenlet.
    stmt = (
        select(User)
        .where(User.id == MOCK_USER_ID)
        .options(
            selectinload(User.user_allergies),
            selectinload(User.user_include_cuisines),
            selectinload(User.user_exclude_cuisines),
            selectinload(User.user_busy_times),
        )
    )
    result = await db.execute(stmt)
    return result.scalar_one()


@pytest_asyncio.fixture
async def client(db: AsyncSession, mock_user: User) -> AsyncGenerator[AsyncClient, None]:
    """AsyncClient with get_db and get_current_user overridden for authenticated endpoints."""

    async def override_get_db():
        yield db

    async def override_get_current_user():
        return mock_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[deps.get_current_user] = override_get_current_user

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def create_user_client(db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """AsyncClient for POST /users — overrides get_auth_payload instead of get_current_user."""

    async def override_get_db():
        yield db

    async def override_get_auth_payload():
        return {"sub": "new_clerk_user_id"}

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[deps.get_auth_payload] = override_get_auth_payload

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
