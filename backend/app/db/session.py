from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings

# Create Async Engine
# echo=True enables SQL logging for debugging
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True,
    future=True
)

# Async Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

# Dependency for API endpoints
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
