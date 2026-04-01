from typing import Any

from app.domain.enums import Allergy, Cuisine
from app.schemas.user import UserRead


def create_mock_user(
    id: str = "mock_user_id",
    email: str = "mock@example.com",
    age: int = 30,
    weight: float = 80.0,
    height: float = 180.0,
    show_imperial: bool = False,
    gender: str = "male",
    activity_level: str = "moderate",
    allergies: list[Allergy] | None = None,
    include_cuisine: list[Cuisine] | None = None,
    exclude_cuisine: list[Cuisine] | None = None,
    is_gluten_free: bool = False,
    is_ketogenic: bool = False,
    is_vegetarian: bool = False,
    is_vegan: bool = False,
    is_pescatarian: bool = False,
    target_weight: float | None = None,
    target_body_fat: float | None = None,
    target_date: Any | None = None,
) -> UserRead:
    """
    Creates a mock UserRead instance for testing.
    """
    return UserRead(
        id=id,
        email=email,
        age=age,
        weight=weight,
        height=height,
        show_imperial=show_imperial,
        gender=gender,
        activity_level=activity_level,
        allergies=allergies or [],
        include_cuisine=include_cuisine or [],
        exclude_cuisine=exclude_cuisine or [],
        is_gluten_free=is_gluten_free,
        is_ketogenic=is_ketogenic,
        is_vegetarian=is_vegetarian,
        is_vegan=is_vegan,
        is_pescatarian=is_pescatarian,
        target_weight=target_weight,
        target_body_fat=target_body_fat,
        target_date=target_date,
    )
