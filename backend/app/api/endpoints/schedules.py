# backend/app/api/endpoints/schedules.py
from datetime import datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api import deps
from app.models.meal import ScheduleItemAlternative
from app.models.schedule import ScheduleItem
from app.models.user import User
from app.schemas.schedule import (
    ScheduleItemCreate,
    ScheduleItemRead,
    ScheduleItemUpdate,
    SwapMealRequest,
)

router = APIRouter()


def _meal_load() -> list:
    return [
        selectinload(ScheduleItem.meal),
        selectinload(ScheduleItem.alternatives).selectinload(ScheduleItemAlternative.meal),
    ]


@router.get("/week", response_model=list[ScheduleItemRead])
async def get_week_schedule(
    week_start_date: str = Query(..., description="Monday of the week (YYYY-MM-DD)"),
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
):
    """
    Return all schedule items for the 7-day week starting on week_start_date (Monday).
    Includes meal and alternatives for meal-type items.
    """
    try:
        monday = datetime.strptime(week_start_date, "%Y-%m-%d").date()
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="week_start_date must be YYYY-MM-DD",
        ) from e
    if monday.weekday() != 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="week_start_date must be a Monday",
        )

    week_start_dt = datetime.combine(monday, time(0, 0, 0))
    week_end_dt = datetime.combine(monday + timedelta(days=6), time(23, 59, 59))

    stmt = (
        select(ScheduleItem)
        .where(
            ScheduleItem.user_id == current_user.id,
            ScheduleItem.date >= week_start_dt,
            ScheduleItem.date <= week_end_dt,
        )
        .order_by(ScheduleItem.date)
        .options(*_meal_load())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=ScheduleItemRead)
async def create_schedule_item(
    item_in: ScheduleItemCreate,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
):
    item = ScheduleItem(**item_in.model_dump(), user_id=current_user.id)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    # Re-fetch with meal loaded
    stmt = select(ScheduleItem).where(ScheduleItem.id == item.id).options(*_meal_load())
    result = await db.execute(stmt)
    return result.scalar_one()


@router.get("", response_model=list[ScheduleItemRead])
async def get_schedule_items(
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
):
    stmt = (
        select(ScheduleItem)
        .where(
            ScheduleItem.user_id == current_user.id,
            ScheduleItem.date >= start_date,
            ScheduleItem.date <= end_date,
        )
        .order_by(ScheduleItem.date)
        .options(*_meal_load())
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
    item = await db.get(ScheduleItem, item_id)
    if not item or item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Schedule item not found"
        )

    for field, value in item_in.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    db.add(item)
    await db.commit()

    stmt = select(ScheduleItem).where(ScheduleItem.id == item_id).options(*_meal_load())
    result = await db.execute(stmt)
    return result.scalar_one()


@router.post("/{item_id}/swap", response_model=ScheduleItemRead)
async def swap_schedule_item_meal(
    item_id: int,
    body: SwapMealRequest,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
):
    """Swap the active meal on a slot. meal_id must be in the item's alternatives."""
    stmt = (
        select(ScheduleItem)
        .where(ScheduleItem.id == item_id)
        .options(*_meal_load())
    )
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()

    if not item or item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Schedule item not found"
        )

    valid_ids = {alt.meal_id for alt in item.alternatives}
    if body.meal_id not in valid_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="meal_id is not an alternative for this schedule item",
        )

    item.meal_id = body.meal_id
    db.add(item)
    await db.commit()
    db.expire(item)

    fresh_stmt = (
        select(ScheduleItem)
        .where(ScheduleItem.id == item_id)
        .options(*_meal_load())
    )
    result = await db.execute(fresh_stmt)
    return result.scalar_one()


@router.delete("/{item_id}", status_code=204)
async def delete_schedule_item(
    item_id: int,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
):
    item = await db.get(ScheduleItem, item_id)
    if not item or item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Schedule item not found"
        )

    await db.delete(item)
    await db.commit()
