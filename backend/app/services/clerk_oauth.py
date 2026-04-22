import httpx

from app.core.config import settings


class ClerkOAuthError(Exception):
    """Raised when Clerk cannot provide a provider OAuth token."""


class ClerkOAuthService:
    CLERK_API_BASE_URL = "https://api.clerk.com/v1"
    GOOGLE_PROVIDER = "google"

    async def get_google_access_token(self, user_id: str) -> str:
        """Retrieve a Google OAuth token stored by Clerk for the given user."""
        if not settings.CLERK_SECRET_KEY:
            raise ClerkOAuthError("CLERK_SECRET_KEY is not configured.")

        async with httpx.AsyncClient() as client:
            response = await client.get(
                (
                    f"{self.CLERK_API_BASE_URL}/users/{user_id}"
                    f"/oauth_access_tokens/{self.GOOGLE_PROVIDER}"
                ),
                headers={"Authorization": f"Bearer {settings.CLERK_SECRET_KEY}"},
            )

        if response.status_code in {401, 403, 404}:
            raise ClerkOAuthError("Google account is not connected in Clerk.")

        response.raise_for_status()
        payload = response.json()
        tokens = payload.get("data", [])
        if not tokens or not tokens[0].get("token"):
            raise ClerkOAuthError("Google OAuth token was not returned by Clerk.")

        return tokens[0]["token"]
