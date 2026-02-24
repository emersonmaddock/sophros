import datetime

import httpx
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.domain.enums import ActivityType
from app.models.schedule import ScheduleItem
from app.schemas.google_calendar import SyncResult


class GoogleCalendarService:
    @staticmethod
    def classify_activity(title: str, description: str | None = None) -> ActivityType:
        """
        Classify a Google Calendar event into a Sophros ActivityType.
        Uses simple keyword matching.
        """
        text = (title + " " + (description or "")).lower()

        # Keywords for classification
        keywords = {
            ActivityType.EXERCISE: [
                "gym",
                "workout",
                "yoga",
                "run",
                "cycle",
                "training",
                "sport",
                "tennis",
                "basketball",
                "soccer",
                "swimming",
                "fitness",
                "weightlifting",
                "lifting",
                "hiit",
                "cardio",
            ],
            ActivityType.MEAL: [
                "lunch",
                "dinner",
                "breakfast",
                "meal",
                "food",
                "eat",
                "restaurant",
                "brunch",
            ],
            ActivityType.SLEEP: ["sleep", "nap", "bed"],
        }

        for activity_type, word_list in keywords.items():
            if any(word in text for word in word_list):
                return activity_type

        return ActivityType.OTHER

    async def get_google_token_from_clerk(self, user_id: str) -> str | None:
        """
        Fetch the Google OAuth access token for a user from Clerk.
        """
        if not settings.CLERK_SECRET_KEY:
            return None

        url = f"https://api.clerk.com/v1/users/{user_id}/oauth_tokens/google"
        headers = {
            "Authorization": f"Bearer {settings.CLERK_SECRET_KEY}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return None

            data = response.json()
            if not data or len(data) == 0:
                return None

            # Clerk returns a list of tokens; we take the first one
            return data[0].get("token")

    async def sync_calendar(self, db: AsyncSession, user_id: str) -> SyncResult:
        """
        Fetch events from Google Calendar and sync them to the local database.
        Automatically retrieves the token from Clerk.
        """
        access_token = await self.get_google_token_from_clerk(user_id)
        if not access_token:
            return SyncResult(
                items_synced=0,
                items_updated=0,
                items_deleted=0,
                errors=["Could not retrieve Google access token from Clerk."],
            )

        creds = Credentials(token=access_token)
        service = build("calendar", "v3", credentials=creds)

        # Set time range: from 1 week ago to 30 days ahead
        now = datetime.datetime.now(datetime.UTC)
        time_min = (now - datetime.timedelta(days=7)).isoformat()
        time_max = (now + datetime.timedelta(days=30)).isoformat()

        # Fetch events from primary calendar
        events_result = (
            service.events()
            .list(
                calendarId="primary",
                timeMin=time_min,
                timeMax=time_max,
                singleEvents=True,
                orderBy="startTime",
            )
            .execute()
        )

        google_events = events_result.get("items", [])

        synced_count = 0
        updated_count = 0
        errors = []

        for g_event in google_events:
            try:
                g_id = g_event.get("id")
                summary = g_event.get("summary", "Untitled Event")
                description = g_event.get("description", "")

                # Handle start time (could be 'dateTime' or 'date' for all-day events)
                start = g_event.get("start", {})
                start_dt_str = start.get("dateTime") or start.get("date")
                if not start_dt_str:
                    continue

                # Parse datetime
                if "T" in start_dt_str:
                    # 2024-02-23T15:00:00Z or 2024-02-23T15:00:00-05:00
                    # For simplicity, we remove TZ info for now
                    start_dt = datetime.datetime.fromisoformat(
                        start_dt_str.replace("Z", "+00:00")
                    )
                else:
                    # All-day event: 2024-02-23
                    start_dt = datetime.datetime.strptime(start_dt_str, "%Y-%m-%d")

                # Handle end time to calculate duration
                end = g_event.get("end", {})
                end_dt_str = end.get("dateTime") or end.get("date")
                if end_dt_str:
                    if "T" in end_dt_str:
                        end_dt = datetime.datetime.fromisoformat(
                            end_dt_str.replace("Z", "+00:00")
                        )
                    else:
                        end_dt = datetime.datetime.strptime(end_dt_str, "%Y-%m-%d")
                    duration = int((end_dt - start_dt).total_seconds() / 60)
                else:
                    duration = 30  # Default

                activity_type = self.classify_activity(summary, description)

                # Check if event already exists
                stmt = select(ScheduleItem).where(ScheduleItem.google_event_id == g_id)
                result = await db.execute(stmt)
                existing_item = result.scalar_one_or_none()

                if existing_item:
                    # Update existing
                    existing_item.date = start_dt
                    existing_item.activity_type = activity_type
                    existing_item.duration_minutes = duration
                    updated_count += 1
                else:
                    # Create new
                    new_item = ScheduleItem(
                        user_id=user_id,
                        date=start_dt,
                        activity_type=activity_type,
                        duration_minutes=duration,
                        google_event_id=g_id,
                        is_completed=False,
                    )
                    db.add(new_item)
                    synced_count += 1

            except Exception as e:
                errors.append(f"Error syncing event {g_event.get('id')}: {str(e)}")

        await db.commit()

        return SyncResult(
            items_synced=synced_count,
            items_updated=updated_count,
            items_deleted=0,  # Deletion logic not implemented yet
            errors=errors,
        )
