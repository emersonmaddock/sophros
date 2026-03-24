from datetime import time

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Time
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.domain.enums import ActivityLevel, PregnancyStatus, Sex


# Database user class - maps to Clerk users
# Created only after onboarding, therefore will include biological data
# TODO: Use enums for other attrs
class User(Base):
    __tablename__ = "user"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # Clerk ID
    email: Mapped[str] = mapped_column(String, unique=True, index=True)  # from Clerk

    # Profile Data
    age: Mapped[int] = mapped_column(Integer)
    weight: Mapped[float] = mapped_column(Float)  # kg
    height: Mapped[float] = mapped_column(Float)  # cm
    show_imperial: Mapped[bool] = mapped_column(Boolean, default=False)

    # Goals
    target_weight: Mapped[float | None] = mapped_column(Float, nullable=True)  # kg
    target_body_fat: Mapped[float | None] = mapped_column(Float, nullable=True)  # %
    target_date: Mapped[DateTime | None] = mapped_column(DateTime, nullable=True)

    # Scheduling Anchors
    wake_up_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    sleep_time: Mapped[time | None] = mapped_column(Time, nullable=True)

    gender: Mapped[Sex] = mapped_column(SAEnum(Sex, name="sex_enum"))
    activity_level: Mapped[ActivityLevel] = mapped_column(
        SAEnum(ActivityLevel, name="activity_level_enum")
    )
    pregnancy_status: Mapped[PregnancyStatus] = mapped_column(
        SAEnum(PregnancyStatus, name="pregnancy_status_enum"),
        default=PregnancyStatus.NOT_PREGNANT,
    )

    # Dietary Preferences: Diets
    is_gluten_free: Mapped[bool] = mapped_column(Boolean, default=False)
    is_ketogenic: Mapped[bool] = mapped_column(Boolean, default=False)
    is_vegetarian: Mapped[bool] = mapped_column(Boolean, default=False)
    is_vegan: Mapped[bool] = mapped_column(Boolean, default=False)
    is_pescatarian: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    # Use string of class name
    # https://sqlmodel.tiangolo.com/tutorial/relationship-attributes/type-annotation-strings/
    schedules: Mapped[list["ScheduleItem"]] = relationship(  # type: ignore[name-defined] # noqa: F821
        "ScheduleItem", back_populates="user"
    )
    user_allergies: Mapped[list["UserAllergy"]] = relationship(  # type: ignore[name-defined] # noqa: F821
        "UserAllergy", back_populates="user", cascade="all, delete-orphan"
    )
    user_include_cuisines: Mapped[list["UserIncludeCuisine"]] = relationship(  # type: ignore[name-defined] # noqa: F821
        "UserIncludeCuisine", back_populates="user", cascade="all, delete-orphan"
    )
    user_exclude_cuisines: Mapped[list["UserExcludeCuisine"]] = relationship(  # type: ignore[name-defined] # noqa: F821
        "UserExcludeCuisine", back_populates="user", cascade="all, delete-orphan"
    )
    user_busy_times: Mapped[list["UserBusyTime"]] = relationship(  # type: ignore[name-defined] # noqa: F821
        "UserBusyTime", back_populates="user", cascade="all, delete-orphan"
    )
    saved_meal_plans: Mapped[list["SavedMealPlan"]] = relationship(  # type: ignore[name-defined] # noqa: F821
        "SavedMealPlan", back_populates="user"
    )
