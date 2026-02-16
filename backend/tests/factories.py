from app.schemas.dietary import Allergy, Cuisine
from app.schemas.user import UserRead


def create_mock_user(
    id: str = "mock_user_id",
    email: str = "mock@example.com",
    age: int = 30,
    weight: float = 80.0,
    height: float = 180.0,
    gender: str = "male",
    activity_level: str = "moderately_active",
    allergies: list[Allergy] | None = None,
    include_cuisine: list[Cuisine] | None = None,
    exclude_cuisine: list[Cuisine] | None = None,
    is_gluten_free: bool = False,
    is_ketogenic: bool = False,
    is_vegetarian: bool = False,
    is_vegan: bool = False,
    is_pescatarian: bool = False,
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
    )
