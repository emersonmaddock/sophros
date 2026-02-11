from sqlalchemy import JSON, Boolean, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class User(Base):
    id: Mapped[str] = mapped_column(String, primary_key=True)  # Clerk ID
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Profile Data
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    weight: Mapped[float | None] = mapped_column(Float, nullable=True)  # kg
    height: Mapped[float | None] = mapped_column(Float, nullable=True)  # cm
    gender: Mapped[str | None] = mapped_column(String, nullable=True)
    activity_level: Mapped[str | None] = mapped_column(String, nullable=True)
    pregnancy_status: Mapped[str | None] = mapped_column(String, nullable=True)

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
