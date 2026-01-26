from typing import Any

from pydantic import BaseModel, ConfigDict

from app.schemas.goal import Goal


class UserBase(BaseModel):
    email: str
    is_active: bool = True
    age: int | None = None
    weight: float | None = None
    height: float | None = None
    gender: str | None = None
    activity_level: str | None = None
    pregnancy_status: str | None = None
    goals: list[Goal] = []


class UserCreate(UserBase):
    id: str  # Clerk ID provided by frontend/webhook


class UserUpdate(BaseModel):
    email: str | None = None
    age: int | None = None
    weight: float | None = None
    height: float | None = None
    gender: str | None = None
    activity_level: str | None = None
    pregnancy_status: str | None = None
    goals: dict[str, Any] | None = None


class User(UserBase):
    id: str
    model_config = ConfigDict(from_attributes=True)
