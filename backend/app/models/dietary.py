from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.domain.enums import Allergy, Cuisine


class UserAllergy(Base):
    __tablename__ = "user_allergies"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True, autoincrement=True
    )
    user_id: Mapped[str] = mapped_column(String, ForeignKey("user.id"), nullable=False)
    value: Mapped[Allergy] = mapped_column(
        SAEnum(Allergy, name="allergy_enum"), nullable=False
    )

    # Relationships
    # https://sqlmodel.tiangolo.com/tutorial/relationship-attributes/type-annotation-strings/
    user: Mapped["User"] = relationship("User", back_populates="user_allergies")  # type: ignore[name-defined] # noqa: F821


class UserIncludeCuisine(Base):
    __tablename__ = "user_include_cuisines"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True, autoincrement=True
    )
    user_id: Mapped[str] = mapped_column(String, ForeignKey("user.id"), nullable=False)
    value: Mapped[Cuisine] = mapped_column(
        SAEnum(Cuisine, name="cuisine_include_enum"), nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="user_include_cuisines")  # type: ignore[name-defined] # noqa: F821


class UserExcludeCuisine(Base):
    __tablename__ = "user_exclude_cuisines"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True, autoincrement=True
    )
    user_id: Mapped[str] = mapped_column(String, ForeignKey("user.id"), nullable=False)
    value: Mapped[Cuisine] = mapped_column(
        SAEnum(Cuisine, name="cuisine_exclude_enum"), nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="user_exclude_cuisines")  # type: ignore[name-defined] # noqa: F821
