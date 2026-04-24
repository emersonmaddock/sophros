import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class ClerkOAuthError(Exception):
    """Raised when Clerk cannot provide a provider OAuth token."""


class ClerkOAuthService:
    CLERK_API_BASE_URL = "https://api.clerk.com/v1"
    GOOGLE_PROVIDER = "google"

    async def get_google_access_token(self, user_id: str) -> str:
        """Retrieve a Google OAuth token stored by Clerk for the given user."""
        if not settings.CLERK_SECRET_KEY:
            raise ClerkOAuthError("CLERK_SECRET_KEY is not configured.")

        url = (
            f"{self.CLERK_API_BASE_URL}/users/{user_id}"
            f"/oauth_access_tokens/{self.GOOGLE_PROVIDER}"
        )
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers={"Authorization": f"Bearer {settings.CLERK_SECRET_KEY}"},
            )

        print(
            f"[clerk_oauth] status={response.status_code} body={response.text[:500]}",
            flush=True,
        )

        if response.status_code in {401, 403, 404}:
            raise ClerkOAuthError(
                f"Google account is not connected in Clerk (HTTP {response.status_code})."
            )

        response.raise_for_status()
        payload = response.json()
        # Clerk returns a bare JSON array for this endpoint
        tokens = payload if isinstance(payload, list) else payload.get("data", [])
        if not tokens or not tokens[0].get("token"):
            raise ClerkOAuthError(
                "Google OAuth token was not returned by Clerk (token array is empty)."
            )

        return tokens[0]["token"]
