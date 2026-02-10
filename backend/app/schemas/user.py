from pydantic import BaseModel, ConfigDict

from app.domain.enums import ActivityLevel, PregnancyStatus, Sex


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


# User model for reading from DB - "UserRead" avoids name collision with "User" model
class UserRead(UserBase):
    id: str
    model_config = ConfigDict(from_attributes=True)
