"""Google Calendar integration service.

Handles Google FreeBusy queries and syncing busy blocks into the schedules
table as source_type='google_calendar' rows. OAuth token ownership stays in
Clerk; callers pass in a fresh access token retrieved from Clerk.
"""

import uuid
from datetime import UTC, datetime, timedelta

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
        utc_offset_minutes: int = 0,
    ) -> tuple[int, str]:
        """
        Sync the rolling 8-week FreeBusy window for the given connection.

        - Deletes existing google_calendar rows in the window.
        - Inserts new busy-block ScheduleItem rows stored as local wall-clock times.
        - Updates connection.last_synced_at / sync_status.

        utc_offset_minutes: the user's UTC offset in minutes, e.g. -240 for EDT.
        Pass -new Date().getTimezoneOffset() from the frontend.

        Returns (synced_count, batch_id).
        On Google API error, marks sync_status='failed' and re-raises.
        """
        now = datetime.now(UTC)

        # Compute the user's local "today" date by applying their UTC offset.
        local_now = now + timedelta(minutes=utc_offset_minutes)
        local_date = local_now.date()

        # Local midnight as a naive datetime — this is how we store times in DB.
        time_min_local = datetime(local_date.year, local_date.month, local_date.day)
        time_max_local = time_min_local + timedelta(weeks=SYNC_WEEKS)

        # UTC equivalents for the FreeBusy API (which requires UTC).
        time_min_utc = time_min_local - timedelta(minutes=utc_offset_minutes)
        time_max_utc = time_max_local - timedelta(minutes=utc_offset_minutes)

        batch_id = str(uuid.uuid4())

        try:
            calendar_ids = ["primary"]
            freebusy = await self.fetch_freebusy(
                access_token, calendar_ids, time_min_utc, time_max_utc
            )
        except Exception:
            connection.sync_status = "failed"
            db.add(connection)
            await db.commit()
            raise

        # Replace Google busy rows in the sync window atomically.
        # Compare against local-time bounds since we now store local times.
        await db.execute(
            sql_delete(ScheduleItem).where(
                ScheduleItem.user_id == connection.user_id,
                ScheduleItem.source_type == "google_calendar",
                ScheduleItem.date >= time_min_local,
                ScheduleItem.date < time_max_local,
            )
        )

        count = 0
        for cal_id, busy_list in freebusy.items():
            for busy in busy_list:
                start_dt = _parse_google_dt(busy["start"], utc_offset_minutes)
                end_dt = _parse_google_dt(busy["end"], utc_offset_minutes)
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


def _parse_google_dt(value: str, utc_offset_minutes: int = 0) -> datetime:
    """
    Parse an RFC 3339 datetime string from Google and convert it to the user's
    local wall-clock time as a naive datetime.

    Google always returns UTC (e.g. "2026-04-27T11:30:00Z" for 7:30 AM EDT).
    We apply the caller-supplied utc_offset_minutes to convert to local time
    before stripping the timezone, so the stored value matches the wall-clock
    time the planner expects (e.g. 07:30:00 for an EDT event).

    utc_offset_minutes: -new Date().getTimezoneOffset() from the frontend,
    e.g. -240 for EDT (UTC-4).
    """
    normalized = value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    local = parsed + timedelta(minutes=utc_offset_minutes)
    return local.replace(tzinfo=None)
