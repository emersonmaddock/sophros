from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

from app.domain.enums import ActivityType
from app.schemas.meal import MealRead


class ScheduleItemBase(BaseModel):
    date: datetime
    activity_type: ActivityType
    duration_minutes: int
    is_completed: bool = False


class ScheduleItemCreate(ScheduleItemBase):
    meal_id: int | None = None


class ScheduleItemUpdate(BaseModel):
    date: datetime | None = None
    activity_type: ActivityType | None = None
    duration_minutes: int | None = None
    is_completed: bool | None = None


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
