from datetime import date

from sqlalchemy import Date, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class UserWeightLog(Base):
    __tablename__ = "user_weight_log"
    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_weight_log_user_date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    # 'prompt' | 'manual' | 'baseline'
    source: Mapped[str] = mapped_column(String(16), nullable=False, default="manual")

    user: Mapped["User"] = relationship("User", back_populates="weight_logs")  # type: ignore[name-defined] # noqa: F821


class UserArchivedGoal(Base):
    """Stores a summary of each completed goal period so it survives goal resets."""

    __tablename__ = "user_archived_goal"

    # Stable goal ID derived from start_date + target_date (see frontend goalId())
    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True
    )

    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    target_date: Mapped[date] = mapped_column(Date, nullable=False)
    start_weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    target_weight_kg: Mapped[float] = mapped_column(Float, nullable=False)

    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    final_weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    weight_change_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    archived_at: Mapped[date] = mapped_column(Date, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="archived_goals")  # type: ignore[name-defined] # noqa: F821
