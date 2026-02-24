from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.domain.enums import Day
from app.models.user import User as DBUser
from app.schemas.meal_plan import DailyMealPlan, WeeklyMealPlan
from app.schemas.user import UserRead
from app.services.meal_plan import MealPlanService

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
