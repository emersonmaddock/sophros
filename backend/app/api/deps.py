from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User

security = HTTPBearer()


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    """
    Validates the Bearer token and returns the current user.
    Integrates with Clerk to verify the JWT signature using the public key.
    """
    try:
        if settings.CLERK_JWT_PUBLIC_KEY:
            # Verify the signature using the public key
            payload = jwt.decode(
                token.credentials,
                settings.CLERK_JWT_PUBLIC_KEY,
                algorithms=["RS256"],
                options={"verify_aud": False},  # Usually fine for Clerk
            )
        else:
            # Fallback for local development if key is not yet set
            # WARNING: This does NOT verify the signature.
            import warnings
            warnings.warn("CLERK_JWT_PUBLIC_KEY is not set. Token signature is UNVERIFIED.", UserWarning)
            payload = jwt.get_unverified_claims(token.credentials)

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=403, detail="Invalid token payload")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Could not validate credentials: {str(e)}",
        ) from e

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


async def verify_webhook_secret(
    x_webhook_secret: str | None = Header(None, alias="X-Webhook-Secret"),
) -> None:
    """
    Validates the webhook secret header for Clerk webhook requests.
    Raises 403 if the secret is missing or invalid.
    """
    if not x_webhook_secret:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Webhook secret required",
        )

    if not settings.CLERK_WEBHOOK_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook secret not configured",
        )

    if x_webhook_secret != settings.CLERK_WEBHOOK_SECRET:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid webhook secret",
        )
