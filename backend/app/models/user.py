from sqlalchemy import JSON, Boolean, Float, Integer, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.domain.enums import ActivityLevel, PregnancyStatus, Sex


# Database user class - maps to Clerk users
# Created only after onboarding, therefore will include biological data
# TODO: Use enums for other attrs
class User(Base):
    id: Mapped[str] = mapped_column(String, primary_key=True)  # Clerk ID
    email: Mapped[str] = mapped_column(String, unique=True, index=True)  # from Clerk

    # Profile Data
    age: Mapped[int] = mapped_column(Integer)
    weight: Mapped[float] = mapped_column(Float)  # kg
    height: Mapped[float] = mapped_column(Float)  # cm
    gender: Mapped[Sex] = mapped_column(SAEnum(Sex, name="sex_enum"))
    activity_level: Mapped[ActivityLevel] = mapped_column(
        SAEnum(ActivityLevel, name="activity_level_enum")
    )
    pregnancy_status: Mapped[PregnancyStatus] = mapped_column(
        SAEnum(PregnancyStatus, name="pregnancy_status_enum"),
        default=PregnancyStatus.NOT_PREGNANT,
    )

    # Schedule
    schedule: Mapped[dict] = mapped_column(JSON, default=dict)

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
