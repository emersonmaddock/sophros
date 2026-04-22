from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, UniqueConstraint
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

    # Which calendars to include; defaults to ["primary"]
    selected_calendar_ids: Mapped[list] = mapped_column(
        JSON, nullable=False, default=lambda: ["primary"]
    )

    # Sync state
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    # "pending" | "synced" | "failed" | "disconnected"
    sync_status: Mapped[str] = mapped_column(String, nullable=False, default="pending")

    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    disconnected_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User")  # type: ignore[name-defined] # noqa: F821
