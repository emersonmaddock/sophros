from datetime import time
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api import deps
from app.domain.enums import Day
from app.models.dietary import (
    UserAllergy,
    UserBusyTime,
    UserExcludeCuisine,
    UserIncludeCuisine,
)
from app.models.user import User
from app.schemas.nutrient import DRIOutput
from app.schemas.user import (
    BusyTime,
    BusyTimeValidationResult,
    UserCreate,
    UserRead,
    UserUpdate,
    UserSchedule,
)
from app.services.nutrient_calculator import NutrientCalculator
from app.services.meal_allocator import MealAllocator

router = APIRouter()


async def _load_user_with_dietary(db: AsyncSession, user_id: str) -> User:
    """Fetch a user with all dietary relationships eagerly loaded."""
    stmt = (
        select(User)
        .where(User.id == user_id)
        .options(
            selectinload(User.user_allergies),
            selectinload(User.user_include_cuisines),
            selectinload(User.user_exclude_cuisines),
            selectinload(User.user_busy_times),
        )
    )
    result = await db.execute(stmt)
    return result.scalar_one()


@router.post("", response_model=UserRead)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(deps.get_db),
    payload: dict = Depends(deps.get_auth_payload),
):
    """
    Create new user.
    Called by frontend after Clerk signup, or via Webhook (secure).
    """
    user_id = payload.get("sub")
    if not user_id or not isinstance(user_id, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user ID in token"
        )

    existing = await db.get(User, user_id)
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    # Create the User row (excludes relational fields — those go in separate tables)
    user_data = user_in.model_dump(
        exclude={"allergies", "include_cuisine", "exclude_cuisine", "busy_times"}
    )
    user = User(**user_data, id=user_id)
    db.add(user)

    # Insert dietary relationship rows
    for allergy in user_in.allergies:
        db.add(UserAllergy(user_id=user_id, value=allergy))
    for cuisine in user_in.include_cuisine:
        db.add(UserIncludeCuisine(user_id=user_id, value=cuisine))
    for cuisine in user_in.exclude_cuisine:
        db.add(UserExcludeCuisine(user_id=user_id, value=cuisine))
    for bt in user_in.busy_times:
        db.add(
            UserBusyTime(
                user_id=user_id, day=bt.day, start_time=bt.start, end_time=bt.end
            )
        )

    await db.commit()

    # Re-fetch with relationships loaded for serialization
    return await _load_user_with_dietary(db, user_id)


@router.get(
    "/me",
    response_model=UserRead,
    responses={
        status.HTTP_401_UNAUTHORIZED: {"description": "Unauthorized"},
        status.HTTP_404_NOT_FOUND: {"description": "User not found"},
    },
)
async def read_user_me(current_user: User = Depends(deps.get_current_user)):
    """
    Get current user profile.
    """
    return current_user


@router.post("/me/validate-busy-times", response_model=BusyTimeValidationResult)
async def validate_busy_times(
    busy_times: list[BusyTime],
    wake_up_time: time,
    sleep_time: time,
    current_user: User = Depends(deps.get_current_user),
):
    """
    Validate that busy times don't prevent meal scheduling.
    Returns list of conflicting meals or success.
    
    Call this before updating the user profile to give feedback.
    """
    try:
        # Create a user schedule - all times are already time objects (auto-deserialized by Pydantic)
        schedule = UserSchedule(
            busy_times=busy_times,
            wake_up_time=wake_up_time,
            sleep_time=sleep_time,
        )
        
        # Check availability for all days
        conflicting_meals = set()
        for day in Day:
            availability = MealAllocator.check_meal_window_availability(schedule, day)
            for meal, is_available in availability.items():
                if not is_available:
                    conflicting_meals.add(meal)
        
        if conflicting_meals:
            meal_list = list(conflicting_meals)
            return BusyTimeValidationResult(
                is_valid=False,
                conflicting_meals=meal_list,
                message=f"Busy times prevent scheduling of: {', '.join(meal_list)}. Please adjust your schedule.",
            )
        
        return BusyTimeValidationResult(
            is_valid=True,
            conflicting_meals=[],
            message="Your schedule looks good!",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid schedule data: {str(e)}",
        )


@router.put("/me", response_model=UserRead)
async def update_user_me(
    user_in: UserUpdate,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
):
    """
    Update current user profile.
    Dietary list fields (allergies, include_cuisine, exclude_cuisine) are
    replaced wholesale — existing rows are deleted and new ones inserted.
    Validates busy times against meal windows before saving.
    """
    update_data = user_in.model_dump(exclude_unset=True)

    # Validate busy times if they are being updated
    if "busy_times" in update_data and update_data.get("busy_times"):
        new_busy_times = update_data.get("busy_times") or []
        
        # Get wake/sleep times - use updated values or current values (already time objects)
        wake_time = update_data.get("wake_up_time") or current_user.wake_up_time
        sleep_time_obj = update_data.get("sleep_time") or current_user.sleep_time
        
        # Create schedule for validation (busy_times are already BusyTime objects)
        schedule = UserSchedule(
            busy_times=new_busy_times,
            wake_up_time=wake_time,
            sleep_time=sleep_time_obj,
        )
        
        # Check availability
        conflicting_meals = set()
        for day in Day:
            availability = MealAllocator.check_meal_window_availability(schedule, day)
            for meal, is_available in availability.items():
                if not is_available:
                    conflicting_meals.add(meal)
        
        if conflicting_meals:
            meal_list = list(conflicting_meals)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Busy times prevent scheduling of: {', '.join(meal_list)}. Please adjust your schedule.",
            )

    # Handle busy_times (relational table, collection assignment)
    if "busy_times" in update_data:
        new_busy_times = update_data.pop("busy_times")
        current_user.user_busy_times = [
            UserBusyTime(
                day=bt.day,
                start_time=bt.start,
                end_time=bt.end,
            )
            for bt in (new_busy_times or [])
        ]

    # Handle dietary relationship fields (collection assignment)
    if "allergies" in update_data:
        new_allergies = update_data.pop("allergies")
        current_user.user_allergies = [
            UserAllergy(value=a) for a in (new_allergies or [])
        ]

    if "include_cuisine" in update_data:
        new_include = update_data.pop("include_cuisine")
        current_user.user_include_cuisines = [
            UserIncludeCuisine(value=c) for c in (new_include or [])
        ]

    if "exclude_cuisine" in update_data:
        new_exclude = update_data.pop("exclude_cuisine")
        current_user.user_exclude_cuisines = [
            UserExcludeCuisine(value=c) for c in (new_exclude or [])
        ]

    # Update scalar fields directly on the ORM object
    for field, value in update_data.items():
        setattr(current_user, field, value)

    db.add(current_user)
    await db.commit()

    # Re-fetch with relationships loaded for serialization
    return await _load_user_with_dietary(db, current_user.id)


@router.get("/me/targets", response_model=DRIOutput)
async def read_user_targets(current_user: User = Depends(deps.get_current_user)):
    """
    Get nutrient targets based on user profile.
    """

    # Calculate targets
    return NutrientCalculator.calculate_targets(
        age=current_user.age,
        gender=current_user.gender,
        weight_kg=current_user.weight,
        height_cm=current_user.height,
        activity_level=current_user.activity_level,
    )
