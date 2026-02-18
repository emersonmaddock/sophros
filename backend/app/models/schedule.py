from sqlalchemy import Boolean, Integer, String, DateTime, ForeignKey
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base_class import Base
from app.domain.enums import ActivityType


class Schedule_Item(Base):
    __tablename__ = "schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("user.id"), nullable=False)
    date: Mapped[DateTime] = mapped_column(DateTime, nullable=False)
    activity_type: Mapped[ActivityType] = mapped_column(SAEnum(ActivityType, name="activity_type_enum"), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped["User"] = relationship("User", back_populates="schedules")