from datetime import date, datetime
from datetime import time as timeofday

from pydantic import BaseModel, Field

from app.domain.enums import Day, MealSlot
from app.schemas.recipe import Recipe
from app.services.exercise_service import ExerciseRecommendation


class MealOption(BaseModel):
    main_recipe: Recipe | None = None
    alternatives: list[Recipe] = Field(default_factory=list)


class MealSlotTarget(BaseModel):
    slot_name: MealSlot
    calories: int
    protein: int
    carbohydrates: int
    fat: int
    time: timeofday | None = None
    plan: MealOption | None = None
    is_leftover: bool = False
    leftover_from_day: Day | None = None
    leftover_from_slot: MealSlot | None = None
    prep_time_minutes: int = 0


class MealDistributionConfig(BaseModel):
    name: str = "Standard"
    # Percentage of daily total for each slot. Must sum to 1.0 (approx)
    slots: dict[str, float] = Field(
        default_factory=lambda: {"Breakfast": 0.30, "Lunch": 0.35, "Dinner": 0.35}
    )


class DailyMealPlan(BaseModel):
    day: Day
    slots: list[MealSlotTarget]
    exercise: ExerciseRecommendation | None = None
    total_calories: int
    total_protein: int
    total_carbs: int
    total_fat: int


class WeeklyMealPlan(BaseModel):
    daily_plans: list[DailyMealPlan]
    total_weekly_calories: int


class SaveMealPlanRequest(BaseModel):
    week_start_date: date
    plan_data: WeeklyMealPlan


class SavedMealPlanResponse(BaseModel):
    id: int
    week_start_date: date
    plan_data: WeeklyMealPlan
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
