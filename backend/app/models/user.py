from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base

if TYPE_CHECKING:
    from app.models.goal import UserGoal


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

    # Relationships
    goals: Mapped[list["UserGoal"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
