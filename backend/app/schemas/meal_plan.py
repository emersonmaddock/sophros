from datetime import time as timeofday

from pydantic import BaseModel, Field

from app.domain.enums import MealSlot


class MealSlotTarget(BaseModel):
    slot_name: MealSlot
    calories: int
    protein: int
    carbohydrates: int
    fat: int
    time: timeofday | None = None


class MealDistributionConfig(BaseModel):
    name: str = "Standard"
    # Percentage of daily total for each slot. Must sum to 1.0 (approx)
    slots: dict[str, float] = Field(
        default_factory=lambda: {"Breakfast": 0.30, "Lunch": 0.35, "Dinner": 0.35}
    )


class DailyMealPlan(BaseModel):
    slots: list[MealSlotTarget]
    total_calories: int
    total_protein: int
    total_carbs: int
    total_fat: int
