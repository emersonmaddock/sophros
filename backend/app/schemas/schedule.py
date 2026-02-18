from datetime import datetime

from pydantic import BaseModel, ConfigDict
from app.domain.enums import ActivityType


class ScheduleItemBase(BaseModel):
    date: datetime
    activity_type: ActivityType
    duration_minutes: int
    is_completed: bool = False


class ScheduleItemCreate(ScheduleItemBase):
    pass


class ScheduleItemUpdate(BaseModel):
    date: datetime | None = None
    activity_type: ActivityType | None = None
    duration_minutes: int | None = None
    is_completed: bool | None = None


class ScheduleItemRead(ScheduleItemBase):
    id: int
    user_id: str
    model_config = ConfigDict(from_attributes=True)
