from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User as DBUser
from app.schemas.meal_plan import DailyMealPlan, Day
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
            status_code=500, detail=f"Failed to generate meal plan: {str(e)}"
        ) from e
