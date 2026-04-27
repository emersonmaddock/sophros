from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict

# ---------------------------------------------------------------------------
# Weight log
# ---------------------------------------------------------------------------

WeightSource = Literal["prompt", "manual", "baseline"]


class WeightLogEntryCreate(BaseModel):
    date: date
    weight_kg: float
    source: WeightSource = "manual"


class WeightLogEntryRead(BaseModel):
    date: date
    weight_kg: float
    source: str

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Body fat log
# ---------------------------------------------------------------------------

BodyFatSource = Literal["manual"]


class BodyFatLogEntryCreate(BaseModel):
    date: date
    body_fat_percent: float
    source: BodyFatSource = "manual"


class BodyFatLogEntryRead(BaseModel):
    date: date
    body_fat_percent: float
    source: str

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Archived goals
# ---------------------------------------------------------------------------


class ArchivedGoalCreate(BaseModel):
    """
    Matches the ArchivedGoalSummary type in the frontend.
    The id is a stable string derived from startDate_targetDate.
    """

    id: str
    start_date: date
    target_date: date
    start_weight_kg: float
    target_weight_kg: float
    target_body_fat: float | None = None
    end_date: date
    final_weight_kg: float | None = None
    final_body_fat_percent: float | None = None
    weight_change_kg: float | None = None
    archived_at: date


class ArchivedGoalRead(ArchivedGoalCreate):
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Goal snapshot fields (stored on User, updated via /users/me)
# ---------------------------------------------------------------------------


class GoalSnapshotUpdate(BaseModel):
    goal_start_date: date | None = None
    goal_start_weight_kg: float | None = None
