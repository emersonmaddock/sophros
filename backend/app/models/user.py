from app.db.base_class import Base
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer, Float, Boolean, JSON

class User(Base):
    id: Mapped[str] = mapped_column(String, primary_key=True) # Clerk ID
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Profile Data
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    weight: Mapped[float | None] = mapped_column(Float, nullable=True) # kg
    height: Mapped[float | None] = mapped_column(Float, nullable=True) # cm
    gender: Mapped[str | None] = mapped_column(String, nullable=True)
    activity_level: Mapped[str | None] = mapped_column(String, nullable=True)
    
    # Preferences / Metadata
    goals: Mapped[dict | None] = mapped_column(JSON, nullable=True)
