from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db
from app.domain.enums import Day
from app.models.planned_event import MealDetail, PlannedEvent, WorkoutDetail, SleepDetail
from app.models.saved_meal_plan import SavedMealPlan
from app.models.user import User as DBUser
from app.schemas.meal_plan import (
    DailyMealPlan,
    SavedMealPlanResponse,
    SaveMealPlanRequest,
    WeeklyMealPlan,
)
from app.schemas.user import UserRead
from app.services.meal_plan import MealPlanService
from app.services.meal_plan_crud import assemble_week_response, decompose_weekly_plan

router = APIRouter()


@router.post("/generate", response_model=DailyMealPlan)
async def generate_meal_plan(
    day: Day = Day.MONDAY,
    current_user: DBUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DailyMealPlan:
    """
    Generate a complete daily meal plan for the current user.

    Uses:
    - NutrientCalculator to determine daily targets
    - MealAllocator to split targets into timed meal slots
    - SpoonacularClient to fetch suitable recipes

    Returns a populated DailyMealPlan with recipes for Breakfast, Lunch, Dinner.
    """
    service = MealPlanService()

    # Convert DB user to schema model for the service
    user_schema = UserRead.model_validate(current_user)

    try:
        plan = await service.generate_daily_plan(user_schema, day=day)
        return plan
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate meal plan: {str(e)}",
        ) from e


@router.post("/generate-week", response_model=WeeklyMealPlan)
async def generate_week_plan(
    current_user: DBUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WeeklyMealPlan:
    """
    Generate a complete weekly meal plan for the current user.

    Runs all 7 days in parallel via asyncio.gather.
    Returns a WeeklyMealPlan with recipes for every slot of every day.
    """
    service = MealPlanService()

    user_schema = UserRead.model_validate(current_user)

    try:
        plan = await service.generate_weekly_plan(user_schema)
        return plan
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate weekly meal plan: {str(e)}",
        ) from e


@router.post("/save", response_model=SavedMealPlanResponse)
async def save_meal_plan(
    body: SaveMealPlanRequest,
    current_user: DBUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upsert a confirmed weekly meal plan. week_start_date must be a Monday."""
    if body.week_start_date.weekday() != 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="week_start_date must be a Monday",
        )

    stmt = select(SavedMealPlan).where(
        SavedMealPlan.user_id == current_user.id,
        SavedMealPlan.week_start_date == body.week_start_date,
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        existing.plan_data = body.plan_data.model_dump(mode="json")
        # Remove old relational events before re-decomposing
        await db.execute(
            delete(PlannedEvent).where(PlannedEvent.meal_plan_id == existing.id)
        )
        db.add(existing)
    else:
        existing = SavedMealPlan(
            user_id=current_user.id,
            week_start_date=body.week_start_date,
            plan_data=body.plan_data.model_dump(mode="json"),
        )
        db.add(existing)
        await db.flush()  # assign existing.id so we can reference it

    # Decompose the weekly plan into normalised event + detail rows
    events = decompose_weekly_plan(body.plan_data, existing.id)
    db.add_all(events)

    await db.commit()

    # Re-fetch with eager-loaded events for the response
    stmt = (
        select(SavedMealPlan)
        .where(SavedMealPlan.id == existing.id)
        .options(
            selectinload(SavedMealPlan.events).selectinload(PlannedEvent.meal_detail),
            selectinload(SavedMealPlan.events).selectinload(PlannedEvent.workout_detail),
            selectinload(SavedMealPlan.events).selectinload(PlannedEvent.sleep_detail),
        )
    )
    result = await db.execute(stmt)
    refreshed = result.scalar_one()
    return assemble_week_response(refreshed)


@router.get("/week", response_model=SavedMealPlanResponse | None)
async def get_week_plan(
    week_start_date: date = Query(..., description="Monday of the week to fetch"),
    current_user: DBUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a saved meal plan for a specific week, or null if none exists."""
    stmt = (
        select(SavedMealPlan)
        .where(
            SavedMealPlan.user_id == current_user.id,
            SavedMealPlan.week_start_date == week_start_date,
        )
        .options(
            selectinload(SavedMealPlan.events).selectinload(PlannedEvent.meal_detail),
            selectinload(SavedMealPlan.events).selectinload(PlannedEvent.workout_detail),
            selectinload(SavedMealPlan.events).selectinload(PlannedEvent.sleep_detail),
        )
    )
    result = await db.execute(stmt)
    plan = result.scalar_one_or_none()
    if plan is None:
        return None
    return assemble_week_response(plan)


@router.get("/planned-weeks", response_model=list[date])
async def get_planned_weeks(
    current_user: DBUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all week_start_dates the user has planned."""
    stmt = (
        select(SavedMealPlan.week_start_date)
        .where(SavedMealPlan.user_id == current_user.id)
        .order_by(SavedMealPlan.week_start_date)
    )
    result = await db.execute(stmt)
    return result.scalars().all()
