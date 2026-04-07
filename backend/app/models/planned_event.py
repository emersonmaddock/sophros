from datetime import datetime
from datetime import time as timeofday

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Time,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class PlannedEvent(Base):
    __tablename__ = "planned_events"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True, autoincrement=True
    )
    meal_plan_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("saved_meal_plans.id", ondelete="CASCADE"),
        nullable=False,
    )
    day: Mapped[str] = mapped_column(String, nullable=False)  # Day enum value
    event_type: Mapped[str] = mapped_column(
        String, nullable=False
    )  # 'meal', 'workout', 'sleep'
    time: Mapped[timeofday | None] = mapped_column(Time, nullable=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    completed: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    meal_plan: Mapped["SavedMealPlan"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "SavedMealPlan", back_populates="events"
    )
    meal_detail: Mapped["MealDetail | None"] = relationship(
        "MealDetail",
        back_populates="event",
        uselist=False,
        cascade="all, delete-orphan",
    )
    workout_detail: Mapped["WorkoutDetail | None"] = relationship(
        "WorkoutDetail",
        back_populates="event",
        uselist=False,
        cascade="all, delete-orphan",
    )
    sleep_detail: Mapped["SleepDetail | None"] = relationship(
        "SleepDetail",
        back_populates="event",
        uselist=False,
        cascade="all, delete-orphan",
    )


class MealDetail(Base):
    __tablename__ = "meal_details"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True, autoincrement=True
    )
    event_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("planned_events.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    slot_name: Mapped[str] = mapped_column(
        String, nullable=False
    )  # MealSlot enum value
    calories: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    protein: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    carbohydrates: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    fat: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    prep_time_minutes: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0"
    )
    is_leftover: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )
    leftover_from_day: Mapped[str | None] = mapped_column(String, nullable=True)
    leftover_from_slot: Mapped[str | None] = mapped_column(String, nullable=True)
    # Recipe fields (denormalized from Spoonacular)
    recipe_id: Mapped[str | None] = mapped_column(String, nullable=True)
    recipe_description: Mapped[str | None] = mapped_column(String, nullable=True)
    recipe_ingredients: Mapped[list | None] = mapped_column(
        JSON, nullable=True
    )  # string[]
    recipe_tags: Mapped[list | None] = mapped_column(JSON, nullable=True)  # string[]
    recipe_warnings: Mapped[list | None] = mapped_column(
        JSON, nullable=True
    )  # string[]
    recipe_source_url: Mapped[str | None] = mapped_column(String, nullable=True)
    recipe_image_url: Mapped[str | None] = mapped_column(String, nullable=True)
    alternatives: Mapped[list | None] = mapped_column(
        JSON, nullable=True
    )  # Recipe[] for draft/swap

    event: Mapped["PlannedEvent"] = relationship(
        "PlannedEvent", back_populates="meal_detail"
    )


class WorkoutDetail(Base):
    __tablename__ = "workout_details"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True, autoincrement=True
    )
    event_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("planned_events.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    exercise_category: Mapped[str] = mapped_column(String, nullable=False)
    calories_burned: Mapped[int | None] = mapped_column(Integer, nullable=True)
    muscle_gain_estimate_kg: Mapped[float | None] = mapped_column(Float, nullable=True)

    event: Mapped["PlannedEvent"] = relationship(
        "PlannedEvent", back_populates="workout_detail"
    )


class SleepDetail(Base):
    __tablename__ = "sleep_details"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True, autoincrement=True
    )
    event_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("planned_events.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    target_hours: Mapped[float | None] = mapped_column(Float, nullable=True)

    event: Mapped["PlannedEvent"] = relationship(
        "PlannedEvent", back_populates="sleep_detail"
    )
