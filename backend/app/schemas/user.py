from datetime import date, time
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.domain.enums import ActivityLevel, Day, PregnancyStatus, Sex
from app.schemas.dietary import Allergy, Cuisine


# Kept for use by MealAllocator (schedule-based meal timing logic)
class BusyTime(BaseModel):
    day: Day = Day.MONDAY
    start: time = time(9, 0)
    end: time = time(17, 0)

    @model_validator(mode="after")
    def check_start_before_end(self) -> "BusyTime":
        if self.start >= self.end:
            raise ValueError("start must be before end")
        return self


class UserSchedule(BaseModel):
    busy_times: list[BusyTime] = Field(default_factory=list)
    wake_up_time: time = time(7, 0)
    sleep_time: time = time(23, 0)


# TODO: Use enums for other attrs
class UserBase(BaseModel):
    email: str
    age: int
    weight: float  # kg
    height: float  # cm
    show_imperial: bool
    gender: Sex
    activity_level: ActivityLevel
    pregnancy_status: PregnancyStatus = PregnancyStatus.NOT_PREGNANT

    # Goals
    target_weight: float | None = None
    target_body_fat: float | None = None  # Percentage
    target_date: date | None = None  # Enrollment date or goal deadline

    # Scheduling Anchors
    wake_up_time: time = time(7, 0)
    sleep_time: time = time(23, 0)
    busy_times: list[BusyTime] = []

    # Dietary Preferences: Allergies & Intolerances
    allergies: list[Allergy] = []

    # Dietary Preferences: Cuisines
    include_cuisine: list[Cuisine] = []
    exclude_cuisine: list[Cuisine] = []

    # Dietary Preferences: Diets
    is_gluten_free: bool = False
    is_ketogenic: bool = False
    is_vegetarian: bool = False
    is_vegan: bool = False
    is_pescatarian: bool = False


class UserCreate(UserBase):
    # User ID is provided by the Clerk JWT payload
    pass


class UserUpdate(BaseModel):
    email: str | None = None
    age: int | None = None
    weight: float | None = None  # kg
    height: float | None = None  # cm
    show_imperial: bool | None = None
    gender: Sex | None = None
    activity_level: ActivityLevel | None = None
    pregnancy_status: PregnancyStatus | None = None

    target_weight: float | None = None
    target_body_fat: float | None = None
    target_date: date | None = None
    wake_up_time: time | None = None
    sleep_time: time | None = None
    busy_times: list[BusyTime] | None = None

    # Dietary Preferences
    allergies: list[Allergy] | None = None
    include_cuisine: list[Cuisine] | None = None
    exclude_cuisine: list[Cuisine] | None = None
    is_gluten_free: bool | None = None
    is_ketogenic: bool | None = None
    is_vegetarian: bool | None = None
    is_vegan: bool | None = None
    is_pescatarian: bool | None = None


# User model for reading from DB - "UserRead" avoids name collision with "User" model
class UserRead(UserBase):
    id: str
    schedules: list[Any] = []
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def flatten_relationships(cls, data: Any) -> Any:
        """
        When constructing from an ORM User object, flatten the dietary
        relationship lists (list[UserAllergy] etc.) into plain enum value lists.
        Dict inputs (e.g. direct construction in tests) pass through unchanged.
        """
        if isinstance(data, dict):
            return data
        
        # If it's already a Pydantic model (UserRead or UserBase), return it
        if hasattr(data, "model_dump"):
            return data
        return {
            "id": data.id,
            "email": data.email,
            "age": data.age,
            "weight": data.weight,
            "height": data.height,
            "show_imperial": data.show_imperial,
            "gender": data.gender,
            "activity_level": data.activity_level,
            "pregnancy_status": data.pregnancy_status,
            "allergies": [item.value for item in (data.user_allergies or [])],
            "include_cuisine": [
                item.value for item in (data.user_include_cuisines or [])
            ],
            "exclude_cuisine": [
                item.value for item in (data.user_exclude_cuisines or [])
            ],
            "is_gluten_free": data.is_gluten_free,
            "is_ketogenic": data.is_ketogenic,
            "is_vegetarian": data.is_vegetarian,
            "is_vegan": data.is_vegan,
            "is_pescatarian": data.is_pescatarian,
            "target_weight": data.target_weight,
            "target_body_fat": data.target_body_fat,
            "target_date": data.target_date,
            "wake_up_time": data.wake_up_time or time(7, 0),
            "sleep_time": data.sleep_time or time(23, 0),
            "busy_times": [
                {"day": bt.day, "start": bt.start_time, "end": bt.end_time}
                for bt in (data.user_busy_times or [])
            ],
        }


# Alias for backward compatibility
User = UserRead
