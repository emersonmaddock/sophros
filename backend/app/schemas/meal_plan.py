from pydantic import BaseModel, Field


class MealSlotTarget(BaseModel):
    slot_name: str  # e.g. "Breakfast", "Lunch", "Dinner", "Snack"
    calories: int
    protein: int
    carbohydrates: int
    fat: int


class MealDistributionConfig(BaseModel):
    name: str = "Standard"
    # Percentage of daily total for each slot. Must sum to 1.0 (approx)
    slots: dict[str, float] = Field(
        default_factory=lambda: {"breakfast": 0.30, "lunch": 0.35, "dinner": 0.35}
    )


class DailyMealPlan(BaseModel):
    slots: list[MealSlotTarget]
    total_calories: int
    total_protein: int
    total_carbs: int
    total_fat: int
