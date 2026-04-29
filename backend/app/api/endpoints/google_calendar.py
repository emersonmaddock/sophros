from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete as sql_delete
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.google_calendar import GoogleCalendarConnection
from app.models.schedule import ScheduleItem
from app.models.user import User
from app.schemas.google_calendar import (
    GoogleCalendarDisconnectResult,
    GoogleCalendarStatus,
    GoogleCalendarSyncResult,
)
from app.services.clerk_oauth import ClerkOAuthError, ClerkOAuthService
from app.services.google_calendar import GoogleCalendarService

router = APIRouter()


def _get_service() -> GoogleCalendarService:
    return GoogleCalendarService()


def _get_clerk_oauth_service() -> ClerkOAuthService:
    return ClerkOAuthService()


@router.post("/connect", response_model=GoogleCalendarStatus)
async def connect_calendar(
    utc_offset_minutes: int = Query(
        0,
        description=(
            "User's UTC offset in minutes, e.g. -240 for EDT. "
            "Pass -new Date().getTimezoneOffset() from the client."
        ),
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GoogleCalendarStatus:
    """
    Create or refresh local Google Calendar connection metadata.

    Google OAuth tokens are owned by Clerk. This endpoint verifies that Clerk
    can provide a Google token for the current user, stores only app-specific
    metadata, and runs an initial sync.
    """
    service = _get_service()
    clerk_oauth = _get_clerk_oauth_service()

    try:
        access_token = await clerk_oauth.get_google_access_token(current_user.id)
    except ClerkOAuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to retrieve Google token from Clerk: {exc}",
        ) from exc

    try:
        email = await service.get_user_email(access_token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to retrieve Google account email: {exc}",
        ) from exc

    # Upsert the connection record
    stmt = select(GoogleCalendarConnection).where(
        GoogleCalendarConnection.user_id == current_user.id
    )
    result = await db.execute(stmt)
    connection = result.scalar_one_or_none()

    if connection is None:
        connection = GoogleCalendarConnection(
            user_id=current_user.id,
            google_account_email=email,
            sync_status="pending",
        )
    else:
        connection.google_account_email = email
        connection.sync_status = "pending"

    db.add(connection)
    await db.flush()

    # Run initial sync
    try:
        await service.sync_for_user(connection, access_token, db, utc_offset_minutes)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Connected to Clerk but initial calendar sync failed: {exc}",
        ) from exc

    return GoogleCalendarStatus(
        connected=True,
        email=connection.google_account_email,
        last_synced_at=connection.last_synced_at,
        sync_status=connection.sync_status,
    )


# ── Status ───────────────────────────────────────────────────────────────────


@router.get("/status", response_model=GoogleCalendarStatus)
async def get_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GoogleCalendarStatus:
    """Return the current Google Calendar connection status for the user."""
    clerk_oauth = _get_clerk_oauth_service()
    stmt = select(GoogleCalendarConnection).where(
        GoogleCalendarConnection.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    connection = result.scalar_one_or_none()

    if connection is None:
        return GoogleCalendarStatus(connected=False)

    try:
        await clerk_oauth.get_google_access_token(current_user.id)
    except ClerkOAuthError:
        return GoogleCalendarStatus(
            connected=False,
            email=connection.google_account_email,
            last_synced_at=connection.last_synced_at,
            sync_status=connection.sync_status,
            needs_reconnect=True,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to verify Google Calendar connection with Clerk: {exc}",
        ) from exc

    return GoogleCalendarStatus(
        connected=True,
        email=connection.google_account_email,
        last_synced_at=connection.last_synced_at,
        sync_status=connection.sync_status,
    )


# ── Manual Sync ──────────────────────────────────────────────────────────────


@router.post("/sync", response_model=GoogleCalendarSyncResult)
async def sync_calendar(
    utc_offset_minutes: int = Query(
        0,
        description=(
            "User's UTC offset in minutes. "
            "Pass -new Date().getTimezoneOffset() from the client."
        ),
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GoogleCalendarSyncResult:
    """Manually trigger a FreeBusy sync for the rolling 8-week window."""
    stmt = select(GoogleCalendarConnection).where(
        GoogleCalendarConnection.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    connection = result.scalar_one_or_none()

    if connection is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active Google Calendar connection found for this user.",
        )

    service = _get_service()
    clerk_oauth = _get_clerk_oauth_service()
    try:
        access_token = await clerk_oauth.get_google_access_token(current_user.id)
        count, batch_id = await service.sync_for_user(
            connection, access_token, db, utc_offset_minutes
        )
    except ClerkOAuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Sync failed: {exc}",
        ) from exc

    return GoogleCalendarSyncResult(synced_count=count, sync_batch_id=batch_id)


# ── Disconnect ───────────────────────────────────────────────────────────────


@router.delete("/disconnect", response_model=GoogleCalendarDisconnectResult)
async def disconnect_calendar(
    remove_busy_blocks: bool = Query(
        True, description="Also delete imported Google busy blocks from the schedule"
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GoogleCalendarDisconnectResult:
    """
    Disconnect the Google Calendar integration.

    Marks the local connection as disconnected and optionally removes all
    imported Google busy blocks from the schedule. Google OAuth account
    unlinking is handled by Clerk, not by this endpoint.
    """
    stmt = select(GoogleCalendarConnection).where(
        GoogleCalendarConnection.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    connection = result.scalar_one_or_none()

    if connection is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active Google Calendar connection found for this user.",
        )

    removed_count = 0

    if remove_busy_blocks:
        count_stmt = (
            select(func.count())
            .select_from(ScheduleItem)
            .where(
                ScheduleItem.user_id == current_user.id,
                ScheduleItem.source_type == "google_calendar",
            )
        )
        count_result = await db.execute(count_stmt)
        removed_count = count_result.scalar_one()

        await db.execute(
            sql_delete(ScheduleItem).where(
                ScheduleItem.user_id == current_user.id,
                ScheduleItem.source_type == "google_calendar",
            )
        )

    await db.delete(connection)
    await db.commit()

    return GoogleCalendarDisconnectResult(removed_busy_blocks=removed_count)
