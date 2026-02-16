from pydantic import BaseModel, ConfigDict

from app.domain.enums import ActivityLevel, PregnancyStatus, Sex
from app.schemas.dietary import Allergy, Cuisine


# TODO: Use enums for other attrs
class UserBase(BaseModel):
    email: str
    age: int
    weight: float  # kg
    height: float  # cm
    gender: Sex
    activity_level: ActivityLevel
    pregnancy_status: PregnancyStatus = (
        PregnancyStatus.NOT_PREGNANT
    )  # Default for males

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
    gender: Sex | None = None
    activity_level: ActivityLevel | None = None
    pregnancy_status: PregnancyStatus | None = None

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
    model_config = ConfigDict(from_attributes=True)
