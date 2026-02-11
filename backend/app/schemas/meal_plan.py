from enum import StrEnum

from pydantic import BaseModel, Field


class MealSlot(StrEnum):
    BREAKFAST = "Breakfast"
    LUNCH = "Lunch"
    DINNER = "Dinner"


class MealSlotTarget(BaseModel):
    slot_name: MealSlot
    calories: int
    protein: int
    carbohydrates: int
    calories: int
    protein: int
    carbohydrates: int
    fat: int
    time: str | None = None  # "HH:MM" 24h format


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
