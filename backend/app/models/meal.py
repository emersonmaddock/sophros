from sqlalchemy import JSON, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class Meal(Base):
    __tablename__ = "meals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    recipe_id: Mapped[str] = mapped_column(String, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String, nullable=True)
    source_url: Mapped[str | None] = mapped_column(String, nullable=True)
    calories: Mapped[int] = mapped_column(Integer, nullable=False)
    protein: Mapped[int] = mapped_column(Integer, nullable=False)
    carbohydrates: Mapped[int] = mapped_column(Integer, nullable=False)
    fat: Mapped[int] = mapped_column(Integer, nullable=False)
    prep_time_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ingredients: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    tags: Mapped[list] = mapped_column(JSON, nullable=False, default=list)


class ScheduleItemAlternative(Base):
    __tablename__ = "schedule_item_alternatives"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    schedule_item_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("schedules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    meal_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("meals.id"),
        nullable=False,
    )

    meal: Mapped["Meal"] = relationship("Meal")
