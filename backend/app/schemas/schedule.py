from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.domain.enums import ActivityType, ExerciseCategory
from app.schemas.meal import MealRead


class ScheduleItemBase(BaseModel):
    date: datetime
    activity_type: ActivityType
    duration_minutes: int
    is_completed: bool = False
    exercise_category: ExerciseCategory | None = None
    exercise_calorie_burn: int = 0
    exercise_muscle_gain: float = 0.0


class CustomMealInput(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    calories: int = Field(ge=0)
    protein: int = Field(ge=0)
    carbohydrates: int = Field(ge=0)
    fat: int = Field(ge=0)


class ScheduleItemCreate(ScheduleItemBase):
    meal_id: int | None = None
    custom_meal: CustomMealInput | None = None

    @model_validator(mode="after")
    def _validate_meal_payload(self) -> "ScheduleItemCreate":
        is_meal = self.activity_type == ActivityType.MEAL
        provided = sum(x is not None for x in (self.meal_id, self.custom_meal))
        if is_meal and provided != 1:
            raise ValueError("meal items require exactly one of meal_id or custom_meal")
        if not is_meal and provided != 0:
            raise ValueError("meal_id and custom_meal are only valid for meal items")
        return self


class ScheduleItemUpdate(BaseModel):
    date: datetime | None = None
    activity_type: ActivityType | None = None
    duration_minutes: int | None = None
    is_completed: bool | None = None
    exercise_category: ExerciseCategory | None = None


class SwapMealRequest(BaseModel):
    meal_id: int


class ScheduleItemRead(ScheduleItemBase):
    id: int
    user_id: str
    meal_id: int | None = None
    source_schedule_item_id: int | None = None
    meal: MealRead | None = None
    alternatives: list[MealRead] = []

    model_config = ConfigDict(from_attributes=True)

    @field_validator("alternatives", mode="before")
    @classmethod
    def extract_meals_from_alternatives(cls, v: list) -> list:
        """ScheduleItemAlternative ORM objects expose .meal; extract it here."""
        result = []
        for item in v:
            if hasattr(item, "meal") and item.meal is not None:
                result.append(item.meal)
        return result
