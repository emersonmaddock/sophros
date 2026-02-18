from datetime import time as timeofday
from enum import Enum, StrEnum

from pydantic import BaseModel, Field


class MealSlot(StrEnum):
    BREAKFAST = "Breakfast"
    LUNCH = "Lunch"
    DINNER = "Dinner"


class Day(str, Enum):
    MONDAY = "Monday"
    TUESDAY = "Tuesday"
    WEDNESDAY = "Wednesday"
    THURSDAY = "Thursday"
    FRIDAY = "Friday"
    SATURDAY = "Saturday"
    SUNDAY = "Sunday"


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
