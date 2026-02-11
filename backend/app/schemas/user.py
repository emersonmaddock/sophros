from pydantic import BaseModel, ConfigDict

from app.schemas.dietary import Allergy, Cuisine


class UserBase(BaseModel):
    email: str
    is_active: bool = True
    age: int | None = None
    weight: float | None = None
    height: float | None = None
    gender: str | None = None
    activity_level: str | None = None
    pregnancy_status: str | None = None

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
    weight: float | None = None
    height: float | None = None
    gender: str | None = None
    activity_level: str | None = None
    pregnancy_status: str | None = None

    # Dietary Preferences
    allergies: list[Allergy] | None = None
    include_cuisine: list[Cuisine] | None = None
    exclude_cuisine: list[Cuisine] | None = None
    is_gluten_free: bool | None = None
    is_ketogenic: bool | None = None
    is_vegetarian: bool | None = None
    is_vegan: bool | None = None
    is_pescatarian: bool | None = None


class User(UserBase):
    id: str
    model_config = ConfigDict(from_attributes=True)
