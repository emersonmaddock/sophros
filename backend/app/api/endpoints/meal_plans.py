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
    DayTotalsResponse,
    PlannedEventCreate,
    PlannedEventResponse,
    PlannedEventUpdate,
    SavedMealPlanResponse,
    SaveMealPlanRequest,
    WeeklyMealPlan,
)
from app.schemas.user import UserRead
from app.services.meal_plan import MealPlanService
from app.services.meal_plan_crud import (
    assemble_week_response,
    build_day_totals,
    decompose_weekly_plan,
    event_to_response,
)

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


# ---------------------------------------------------------------------------
# Helper functions for CRUD endpoints
# ---------------------------------------------------------------------------


async def _get_user_plan(db: AsyncSession, plan_id: int, user_id: str) -> SavedMealPlan:
    """Get a meal plan, verifying it belongs to the user."""
    stmt = select(SavedMealPlan).where(
        SavedMealPlan.id == plan_id,
        SavedMealPlan.user_id == user_id,
    )
    result = await db.execute(stmt)
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    return plan


async def _get_user_event(db: AsyncSession, event_id: int, user_id: str) -> PlannedEvent:
    """Get an event, verifying it belongs to the user's plan."""
    stmt = (
        select(PlannedEvent)
        .join(SavedMealPlan)
        .where(PlannedEvent.id == event_id, SavedMealPlan.user_id == user_id)
        .options(
            selectinload(PlannedEvent.meal_detail),
            selectinload(PlannedEvent.workout_detail),
            selectinload(PlannedEvent.sleep_detail),
        )
    )
    result = await db.execute(stmt)
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


async def _get_day_totals(db: AsyncSession, plan_id: int, day: str, user_id: str) -> dict:
    """Get all events for a day with computed totals."""
    stmt = (
        select(PlannedEvent)
        .join(SavedMealPlan)
        .where(
            PlannedEvent.meal_plan_id == plan_id,
            PlannedEvent.day == day,
            SavedMealPlan.user_id == user_id,
        )
        .options(
            selectinload(PlannedEvent.meal_detail),
            selectinload(PlannedEvent.workout_detail),
            selectinload(PlannedEvent.sleep_detail),
        )
    )
    result = await db.execute(stmt)
    events = list(result.scalars().all())
    return build_day_totals(events, day)


# ---------------------------------------------------------------------------
# CRUD endpoints for individual planned events
# ---------------------------------------------------------------------------


@router.post("/{plan_id}/events", response_model=DayTotalsResponse)
async def add_event(
    plan_id: int,
    body: PlannedEventCreate,
    current_user: DBUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a new event to a saved meal plan."""
    await _get_user_plan(db, plan_id, current_user.id)

    event = PlannedEvent(
        meal_plan_id=plan_id,
        day=body.day,
        event_type=body.event_type,
        time=body.time,
        title=body.title,
        duration_minutes=body.duration_minutes,
    )

    if body.event_type == "meal":
        event.meal_detail = MealDetail(
            slot_name=body.slot_name or "Lunch",
            calories=body.calories,
            protein=body.protein,
            carbohydrates=body.carbohydrates,
            fat=body.fat,
            prep_time_minutes=body.prep_time_minutes,
            recipe_id=body.recipe_id,
            recipe_description=body.recipe_description,
            recipe_ingredients=body.recipe_ingredients,
            recipe_tags=body.recipe_tags,
            recipe_warnings=body.recipe_warnings,
            recipe_source_url=body.recipe_source_url,
            recipe_image_url=body.recipe_image_url,
        )
    elif body.event_type == "workout":
        event.workout_detail = WorkoutDetail(
            exercise_category=body.exercise_category or "Cardio",
            calories_burned=body.calories_burned,
            muscle_gain_estimate_kg=body.muscle_gain_estimate_kg,
        )
    elif body.event_type == "sleep":
        event.sleep_detail = SleepDetail(target_hours=body.target_hours)

    db.add(event)
    await db.commit()

    return await _get_day_totals(db, plan_id, body.day, current_user.id)


@router.put("/events/{event_id}", response_model=DayTotalsResponse)
async def update_event(
    event_id: int,
    body: PlannedEventUpdate,
    current_user: DBUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing planned event."""
    event = await _get_user_event(db, event_id, current_user.id)

    # Update base fields
    if body.title is not None:
        event.title = body.title
    if body.time is not None:
        event.time = body.time
    if body.duration_minutes is not None:
        event.duration_minutes = body.duration_minutes
    if body.completed is not None:
        event.completed = body.completed

    # Update meal detail fields
    if event.meal_detail and event.event_type == "meal":
        md = event.meal_detail
        if body.calories is not None:
            md.calories = body.calories
        if body.protein is not None:
            md.protein = body.protein
        if body.carbohydrates is not None:
            md.carbohydrates = body.carbohydrates
        if body.fat is not None:
            md.fat = body.fat
        if body.slot_name is not None:
            md.slot_name = body.slot_name

    # Update workout detail fields
    if event.workout_detail and event.event_type == "workout":
        if body.exercise_category is not None:
            event.workout_detail.exercise_category = body.exercise_category
        if body.calories_burned is not None:
            event.workout_detail.calories_burned = body.calories_burned

    # Update sleep detail fields
    if event.sleep_detail and event.event_type == "sleep":
        if body.target_hours is not None:
            event.sleep_detail.target_hours = body.target_hours

    db.add(event)
    await db.commit()

    return await _get_day_totals(db, event.meal_plan_id, event.day, current_user.id)


@router.delete("/events/{event_id}", response_model=DayTotalsResponse)
async def delete_event(
    event_id: int,
    current_user: DBUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a planned event."""
    event = await _get_user_event(db, event_id, current_user.id)
    plan_id = event.meal_plan_id
    day = event.day

    await db.delete(event)
    await db.commit()

    return await _get_day_totals(db, plan_id, day, current_user.id)


@router.post("/events/{event_id}/complete", response_model=PlannedEventResponse)
async def complete_event(
    event_id: int,
    current_user: DBUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark an event as completed."""
    event = await _get_user_event(db, event_id, current_user.id)
    event.completed = True
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event_to_response(event)
