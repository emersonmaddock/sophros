from typing import Any

from sqlalchemy.orm import DeclarativeBase, declared_attr


class Base(DeclarativeBase):
    id: Any

    # Generate __tablename__ automatically
    @declared_attr  # type: ignore[arg-type]
    def __tablename__(cls) -> str:  # noqa: N805
        return cls.__name__.lower()
