from app.db.base_class import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, ForeignKey, Text

class UserGoal(Base):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("user.id"), index=True)
    
    # Goal details
    goal_type: Mapped[str] = mapped_column(String) # e.g., "weight_loss", "muscle_gain"
    target_value: Mapped[str | None] = mapped_column(String, nullable=True) # e.g. "70kg", "run_5k"
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Relationship
    user: Mapped["User"] = relationship(back_populates="goals")
