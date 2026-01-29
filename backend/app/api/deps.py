from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User

bearer = HTTPBearer()

async def get_auth_payload(
    token: HTTPAuthorizationCredentials = Depends(bearer)
) -> dict:
    try:
        payload = jwt.decode(
            token.credentials,
            key=settings.CLERK_PEM_PUBLIC_KEY,
            algorithms=['RS256']
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
    Validates the Bearer token and returns the current user.
    Note: Signature verification is currently skipped for prototype speed.
    In production, use Clerk's JWKS to verify signature.
    """
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=403, detail="Invalid token payload")

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
