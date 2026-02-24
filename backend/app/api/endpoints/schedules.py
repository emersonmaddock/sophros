from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.schedule import ScheduleItem
from app.models.user import User
from app.schemas.google_calendar import SyncResult
from app.schemas.schedule import (
    ScheduleItemCreate,
    ScheduleItemRead,
    ScheduleItemUpdate,
)
from app.services.google_calendar import GoogleCalendarService

router = APIRouter()


@router.post("/sync/google", response_model=SyncResult)
async def sync_google_calendar(
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
):
    """
    Sync the current user's Google Calendar events to their Sophros schedule.
    """
    service = GoogleCalendarService()
    try:
        result = await service.sync_calendar(db, current_user.id)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync Google Calendar: {str(e)}",
        ) from e


@router.post("", response_model=ScheduleItemRead)
async def create_schedule_item(
    item_in: ScheduleItemCreate,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
):
    """
    Create a new schedule item for the current user.
    """
    item = ScheduleItem(**item_in.model_dump(), user_id=current_user.id)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.get("", response_model=list[ScheduleItemRead])
async def get_schedule_items(
    start_date: datetime = Query(
        ..., description="Start of the date range (inclusive)"
    ),
    end_date: datetime = Query(..., description="End of the date range (inclusive)"),
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
):
    """
    Fetch schedule items for the current user within a date range.
    """
    stmt = (
        select(ScheduleItem)
        .where(
            ScheduleItem.user_id == current_user.id,
            ScheduleItem.date >= start_date,
            ScheduleItem.date <= end_date,
        )
        .order_by(ScheduleItem.date)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.put("/{item_id}", response_model=ScheduleItemRead)
async def update_schedule_item(
    item_id: int,
    item_in: ScheduleItemUpdate,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
):
    """
    Update a schedule item by ID (must belong to the current user).
    """
    item = await db.get(ScheduleItem, item_id)
    if not item or item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Schedule item not found"
        )

    update_data = item_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
async def delete_schedule_item(
    item_id: int,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
):
    """
    Delete a schedule item by ID (must belong to the current user).
    """
    item = await db.get(ScheduleItem, item_id)
    if not item or item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Schedule item not found"
        )

    await db.delete(item)
    await db.commit()
