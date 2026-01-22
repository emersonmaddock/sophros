from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt  # type: ignore
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User

security = HTTPBearer()


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    """
    Validates the Bearer token and returns the current user.
    Note: Signature verification is currently skipped for prototype speed.
    In production, use Clerk's JWKS to verify signature.
    """
    try:
        # WARNING: This does NOT verify the signature.
        # TODO: Implement JWKS verification with CLERK_PEM_PUBLIC_KEY
        payload = jwt.get_unverified_claims(token.credentials)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=403, detail="Invalid token payload")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        ) from e

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
