
from pydantic import BaseModel, ConfigDict


class GoalBase(BaseModel):
    goal_type: str
    target_value: str | None = None
    description: str | None = None


class GoalCreate(GoalBase):
    pass


class GoalUpdate(BaseModel):
    goal_type: str | None = None
    target_value: str | None = None
    description: str | None = None


class Goal(GoalBase):
    id: int
    user_id: str
    model_config = ConfigDict(from_attributes=True)
