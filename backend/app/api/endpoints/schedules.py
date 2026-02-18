from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.schedule import Schedule_Item
from app.models.user import User
from app.schemas.schedule import ScheduleItemCreate, ScheduleItemRead, ScheduleItemUpdate

router = APIRouter()


@router.post("", response_model=ScheduleItemRead)
async def create_schedule_item(
    item_in: ScheduleItemCreate,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
):
    """
    Create a new schedule item for the current user.
    """
    item = Schedule_Item(**item_in.model_dump(), user_id=current_user.id)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.get("", response_model=list[ScheduleItemRead])
async def get_schedule_items(
    start_date: datetime = Query(..., description="Start of the date range (inclusive)"),
    end_date: datetime = Query(..., description="End of the date range (inclusive)"),
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
):
    """
    Fetch schedule items for the current user within a date range.
    """
    stmt = (
        select(Schedule_Item)
        .where(
            Schedule_Item.user_id == current_user.id,
            Schedule_Item.date >= start_date,
            Schedule_Item.date <= end_date,
        )
        .order_by(Schedule_Item.date)
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
    item = await db.get(Schedule_Item, item_id)
    if not item or item.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule item not found")

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
    item = await db.get(Schedule_Item, item_id)
    if not item or item.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule item not found")

    await db.delete(item)
    await db.commit()
