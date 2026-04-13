from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Date, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.domain.enums import ActivityType
from app.models.schedule import ScheduleItem
from app.models.user import User as DBUser
from app.schemas.schedule import ScheduleItemRead
from app.schemas.user import UserRead
from app.services.meal_plan import MealPlanService

router = APIRouter()


@router.post("/generate-week", response_model=list[ScheduleItemRead])
async def generate_week_plan(
    week_start_date: date = Query(
        ..., description="Monday of the week to generate (YYYY-MM-DD)"
    ),
    current_user: DBUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a full weekly meal plan and persist it as ScheduleItem rows.

    Replaces any existing meal-type schedule items for the given week.
    week_start_date must be a Monday.
    """
    if week_start_date.weekday() != 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="week_start_date must be a Monday",
        )

    service = MealPlanService()
    user_schema = UserRead.model_validate(current_user)

    try:
        items = await service.generate_and_persist(user_schema, week_start_date, db)
        return items
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate meal plan: {str(e)}",
        ) from e


@router.get("/planned-weeks", response_model=list[date])
async def get_planned_weeks(
    current_user: DBUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Return the Monday start date for every week that has meal-type schedule items.
    """
    stmt = (
        select(
            func.date_trunc("week", ScheduleItem.date).cast(Date)
        )
        .where(
            ScheduleItem.user_id == current_user.id,
            ScheduleItem.activity_type == ActivityType.MEAL,
        )
        .distinct()
        .order_by(func.date_trunc("week", ScheduleItem.date))
    )
    result = await db.execute(stmt)
    return [row[0] for row in result.all()]
