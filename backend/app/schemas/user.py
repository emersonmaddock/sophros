from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any

class UserBase(BaseModel):
    email: str
    is_active: bool = True
    age: Optional[int] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    gender: Optional[str] = None
    activity_level: Optional[str] = None
    goals: Optional[Dict[str, Any]] = None

class UserCreate(UserBase):
    id: str # Clerk ID provided by frontend/webhook

class UserUpdate(BaseModel):
    email: Optional[str] = None
    age: Optional[int] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    gender: Optional[str] = None
    activity_level: Optional[str] = None
    goals: Optional[Dict[str, Any]] = None

class User(UserBase):
    id: str
    model_config = ConfigDict(from_attributes=True)
