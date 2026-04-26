"""Google Calendar integration service.

Handles Google FreeBusy queries and syncing busy blocks into the schedules
table as source_type='google_calendar' rows. OAuth token ownership stays in
Clerk; callers pass in a fresh access token retrieved from Clerk.
"""

import uuid
from datetime import datetime, timedelta

import httpx
from sqlalchemy import delete as sql_delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import ActivityType
from app.models.google_calendar import GoogleCalendarConnection
from app.models.schedule import ScheduleItem

SYNC_WEEKS = 8


class GoogleCalendarService:
    GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
    GOOGLE_FREEBUSY_URL = "https://www.googleapis.com/calendar/v3/freeBusy"
    SCOPES = ["https://www.googleapis.com/auth/calendar.freebusy"]

    async def get_user_email(self, access_token: str) -> str:
        """Fetch the Google account email for the given access token."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                self.GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            return resp.json()["email"]

    # ── FreeBusy ────────────────────────────────────────────────────────────

    async def fetch_freebusy(
        self,
        access_token: str,
        calendar_ids: list[str],
        time_min: datetime,
        time_max: datetime,
    ) -> dict[str, list[dict]]:
        """
        Call the Google FreeBusy API.

        Returns {calendar_id: [{start: str, end: str}, ...]} for each requested
        calendar. Raises ValueError if Google reports a per-calendar error.
        """
        body = {
            "timeMin": time_min.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "timeMax": time_max.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "items": [{"id": cal_id} for cal_id in calendar_ids],
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                self.GOOGLE_FREEBUSY_URL,
                json=body,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            data = resp.json()

        result: dict[str, list[dict]] = {}
        calendars = data.get("calendars", {})
        for cal_id in calendar_ids:
            cal_data = calendars.get(cal_id, {})
            errors = cal_data.get("errors", [])
            if errors:
                raise ValueError(f"Google Calendar error for '{cal_id}': {errors}")
            result[cal_id] = cal_data.get("busy", [])

        return result

    # ── Sync ────────────────────────────────────────────────────────────────

    async def sync_for_user(
        self,
        connection: GoogleCalendarConnection,
        access_token: str,
        db: AsyncSession,
    ) -> tuple[int, str]:
        """
        Sync the rolling 8-week FreeBusy window for the given connection.

        - Deletes existing google_calendar rows in the window.
        - Inserts new busy-block ScheduleItem rows.
        - Updates connection.last_synced_at / sync_status.

        Returns (synced_count, batch_id).
        On Google API error, marks sync_status='failed' and re-raises.
        """
        now = datetime.utcnow()
        time_min = datetime(now.year, now.month, now.day)  # start of today UTC
        time_max = time_min + timedelta(weeks=SYNC_WEEKS)
        batch_id = str(uuid.uuid4())

        try:
            calendar_ids = ["primary"]
            freebusy = await self.fetch_freebusy(
                access_token, calendar_ids, time_min, time_max
            )
        except Exception:
            connection.sync_status = "failed"
            db.add(connection)
            await db.commit()
            raise

        # Replace Google busy rows in the sync window atomically
        await db.execute(
            sql_delete(ScheduleItem).where(
                ScheduleItem.user_id == connection.user_id,
                ScheduleItem.source_type == "google_calendar",
                ScheduleItem.date >= time_min,
                ScheduleItem.date < time_max,
            )
        )

        count = 0
        for cal_id, busy_list in freebusy.items():
            for busy in busy_list:
                start_dt = _parse_google_dt(busy["start"])
                end_dt = _parse_google_dt(busy["end"])
                duration = max(1, int((end_dt - start_dt).total_seconds() / 60))

                db.add(
                    ScheduleItem(
                        user_id=connection.user_id,
                        date=start_dt,
                        activity_type=ActivityType.OTHER,
                        duration_minutes=duration,
                        prep_time_minutes=0,
                        is_completed=False,
                        meal_id=None,
                        source_schedule_item_id=None,
                        source_type="google_calendar",
                        source_calendar_id=cal_id,
                    )
                )
                count += 1

        connection.last_synced_at = now
        connection.sync_status = "synced"
        db.add(connection)

        await db.commit()
        return count, batch_id


# ── Helpers ─────────────────────────────────────────────────────────────────


def _parse_google_dt(value: str) -> datetime:
    """Parse an RFC 3339 datetime string from Google (with or without trailing Z)."""
    value = value.rstrip("Z").replace("+00:00", "")
    # Handle fractional seconds
    if "." in value:
        return datetime.strptime(value, "%Y-%m-%dT%H:%M:%S.%f")
    return datetime.strptime(value, "%Y-%m-%dT%H:%M:%S")
