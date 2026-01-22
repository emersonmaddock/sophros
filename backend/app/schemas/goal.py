from pydantic import BaseModel, ConfigDict
from typing import Optional

class GoalBase(BaseModel):
    goal_type: str
    target_value: Optional[str] = None
    description: Optional[str] = None

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    goal_type: Optional[str] = None
    target_value: Optional[str] = None
    description: Optional[str] = None

class Goal(GoalBase):
    id: int
    user_id: str
    model_config = ConfigDict(from_attributes=True)
