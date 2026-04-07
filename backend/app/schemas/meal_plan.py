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


class PlannedEventCreate(BaseModel):
    day: Day
    event_type: str  # 'meal' | 'workout' | 'sleep'
    time: timeofday | None = None
    title: str
    duration_minutes: int | None = None
    # Meal fields
    slot_name: MealSlot | None = None
    calories: int = 0
    protein: int = 0
    carbohydrates: int = 0
    fat: int = 0
    prep_time_minutes: int = 0
    recipe_id: str | None = None
    recipe_description: str | None = None
    recipe_ingredients: list[str] | None = None
    recipe_tags: list[str] | None = None
    recipe_warnings: list[str] | None = None
    recipe_source_url: str | None = None
    recipe_image_url: str | None = None
    # Workout fields
    exercise_category: str | None = None
    calories_burned: int | None = None
    muscle_gain_estimate_kg: float | None = None
    # Sleep fields
    target_hours: float | None = None


class PlannedEventUpdate(BaseModel):
    title: str | None = None
    time: timeofday | None = None
    duration_minutes: int | None = None
    completed: bool | None = None
    # Meal fields
    calories: int | None = None
    protein: int | None = None
    carbohydrates: int | None = None
    fat: int | None = None
    slot_name: MealSlot | None = None
    # Workout fields
    exercise_category: str | None = None
    calories_burned: int | None = None
    # Sleep fields
    target_hours: float | None = None


class PlannedEventResponse(BaseModel):
    id: int
    meal_plan_id: int
    day: Day
    event_type: str
    time: timeofday | None = None
    title: str
    duration_minutes: int | None = None
    completed: bool = False
    # Meal detail (if type='meal')
    slot_name: MealSlot | None = None
    calories: int | None = None
    protein: int | None = None
    carbohydrates: int | None = None
    fat: int | None = None
    recipe_id: str | None = None
    # Workout detail (if type='workout')
    exercise_category: str | None = None
    calories_burned: int | None = None
    muscle_gain_estimate_kg: float | None = None
    # Sleep detail (if type='sleep')
    target_hours: float | None = None

    model_config = {"from_attributes": True}


class DayTotalsResponse(BaseModel):
    day: Day
    events: list[PlannedEventResponse]
    total_calories: int
    total_protein: int
    total_carbs: int
    total_fat: int
