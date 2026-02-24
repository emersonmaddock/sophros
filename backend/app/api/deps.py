from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User

bearer = HTTPBearer()


async def get_auth_payload(
    token: HTTPAuthorizationCredentials = Depends(bearer),
) -> dict:
    try:
        payload = jwt.decode(
            token.credentials, key=settings.CLERK_PEM_PUBLIC_KEY, algorithms=["RS256"]
        )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        ) from e
    return payload


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(get_auth_payload),
) -> User:
    """
    Validates the Bearer token and returns the current user with
    dietary relationships eagerly loaded.
    Note: Signature verification is currently skipped for prototype speed.
    In production, use Clerk's JWKS to verify signature.
    """
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload"
        )

    stmt = (
        select(User)
        .where(User.id == user_id)
        .options(
            selectinload(User.user_allergies),
            selectinload(User.user_include_cuisines),
            selectinload(User.user_exclude_cuisines),
        )
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return user
