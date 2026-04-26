from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class GoogleCalendarConnection(Base):
    __tablename__ = "google_calendar_connections"
    __table_args__ = (UniqueConstraint("user_id", name="uq_google_calendar_user"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True
    )

    google_account_email: Mapped[str] = mapped_column(String, nullable=False)

    # Sync state
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # "pending" | "synced" | "failed"
    sync_status: Mapped[str] = mapped_column(String, nullable=False, default="pending")

    # Relationships
    user: Mapped["User"] = relationship("User")  # type: ignore[name-defined] # noqa: F821
