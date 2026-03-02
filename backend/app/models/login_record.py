from sqlalchemy import Date, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class LoginRecord(Base):
    __tablename__ = "login_records"
    __table_args__ = (
        UniqueConstraint("user_id", "login_date", name="uq_user_login_date"),
    )

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True, autoincrement=True
    )
    user_id: Mapped[str] = mapped_column(String, ForeignKey("user.id"), nullable=False)
    login_date: Mapped["date"] = mapped_column(Date, nullable=False)  # noqa: F821

    # Relationships
    user: Mapped["User"] = relationship("User")  # type: ignore[name-defined]  # noqa: F821
