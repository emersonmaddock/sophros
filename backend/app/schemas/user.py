from pydantic import BaseModel, ConfigDict


class UserBase(BaseModel):
    email: str
    is_active: bool = True
    age: int | None = None
    weight: float | None = None
    height: float | None = None
    gender: str | None = None
    activity_level: str | None = None
    pregnancy_status: str | None = None


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


class User(UserBase):
    id: str
    model_config = ConfigDict(from_attributes=True)
