from pydantic import BaseModel, Field


# Includes all dietery constraints (allergies, dislikes, religious restrictions, etc.)
class DietaryConstraints(BaseModel):
    allergies: list[str] = Field(
        default_factory=list
    )  # e.g. "peanuts", "gluten", also religious/other restrictions
    dislikes: list[str] = Field(default_factory=list)  # e.g. "mushrooms"

    # Diets
    is_vegetarian: bool = False
    is_vegan: bool = False
    is_gluten_free: bool = False
    is_dairy_free: bool = False
    is_pescatarian: bool = False
    is_halal: bool = False
    is_kosher: bool = False
