from sqlalchemy import Boolean, Float, Integer, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.domain.enums import ActivityLevel


# TODO: Use enums for other attrs
# TODO: Make profile data not nullable
class User(Base):
    id: Mapped[str] = mapped_column(String, primary_key=True)  # Clerk ID
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Profile Data
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    weight: Mapped[float | None] = mapped_column(Float, nullable=True)  # kg
    height: Mapped[float | None] = mapped_column(Float, nullable=True)  # cm
    gender: Mapped[str | None] = mapped_column(String, nullable=True)
    activity_level: Mapped[ActivityLevel | None] = mapped_column(
        SAEnum(ActivityLevel, name="activity_level_enum"), nullable=True
    )
    pregnancy_status: Mapped[str | None] = mapped_column(String, nullable=True)
