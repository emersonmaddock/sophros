import typing

from sqlalchemy import JSON, Boolean, Float, Integer, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.domain.enums import ActivityLevel, PregnancyStatus, Sex

if typing.TYPE_CHECKING:
    from app.models.schedule import ScheduleItem


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
    gender: Mapped[Sex] = mapped_column(SAEnum(Sex, name="sex_enum"))
    activity_level: Mapped[ActivityLevel] = mapped_column(
        SAEnum(ActivityLevel, name="activity_level_enum")
    )
    pregnancy_status: Mapped[PregnancyStatus] = mapped_column(
        SAEnum(PregnancyStatus, name="pregnancy_status_enum"),
        default=PregnancyStatus.NOT_PREGNANT,
    )

    # Dietary Preferences: Allergies & Intolerances
    allergies: Mapped[list[str]] = mapped_column(JSON, default=list)

    # Dietary Preferences: Cuisines
    include_cuisine: Mapped[list[str]] = mapped_column(JSON, default=list)
    exclude_cuisine: Mapped[list[str]] = mapped_column(JSON, default=list)

    # Dietary Preferences: Diets
    is_gluten_free: Mapped[bool] = mapped_column(Boolean, default=False)
    is_ketogenic: Mapped[bool] = mapped_column(Boolean, default=False)
    is_vegetarian: Mapped[bool] = mapped_column(Boolean, default=False)
    is_vegan: Mapped[bool] = mapped_column(Boolean, default=False)
    is_pescatarian: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    schedules: Mapped[list[ScheduleItem]] = relationship(
        "ScheduleItem", back_populates="user"
    )
