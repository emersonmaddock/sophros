from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.domain.enums import ActivityType, ExerciseCategory


class ScheduleItem(Base):
    __tablename__ = "schedules"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True, autoincrement=True
    )
    user_id: Mapped[str] = mapped_column(String, ForeignKey("user.id"), nullable=False)
    date: Mapped[DateTime] = mapped_column(DateTime, nullable=False)
    activity_type: Mapped[ActivityType] = mapped_column(
        SAEnum(ActivityType, name="activity_type_enum"), nullable=False
    )
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    prep_time_minutes: Mapped[int] = mapped_column(Integer, default=0)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    exercise_category: Mapped[ExerciseCategory | None] = mapped_column(
        SAEnum(ExerciseCategory, name="exercise_category_enum"), nullable=True
    )

    # Meal link (nullable — non-meal items leave these null)
    meal_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("meals.id", ondelete="SET NULL"), nullable=True
    )
    # Self-referential FK: set when this slot is a leftover from another slot
    source_schedule_item_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("schedules.id", ondelete="SET NULL"), nullable=True
    )

    # Source metadata — identifies where this row came from
    # "sophros" for app-generated rows; "google_calendar" for imported busy blocks
    source_type: Mapped[str] = mapped_column(String, nullable=False, default="sophros")
    source_calendar_id: Mapped[str | None] = mapped_column(String, nullable=True)
    source_external_id: Mapped[str | None] = mapped_column(String, nullable=True)
    source_sync_batch_id: Mapped[str | None] = mapped_column(String, nullable=True)
    imported_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="schedules")  # type: ignore[name-defined] # noqa: F821
    meal: Mapped["Meal | None"] = relationship("Meal")  # type: ignore[name-defined] # noqa: F821
    alternatives: Mapped[list["ScheduleItemAlternative"]] = relationship(  # type: ignore[name-defined] # noqa: F821
        "ScheduleItemAlternative",
        foreign_keys="ScheduleItemAlternative.schedule_item_id",
        cascade="all, delete-orphan",
    )
