from pydantic import BaseModel, Field


class DietaryConstraints(BaseModel):
    allergies: list[str] = Field(default_factory=list)  # e.g. "peanuts", "gluten"
    dislikes: list[str] = Field(default_factory=list)  # e.g. "mushrooms"

    # Diets
    is_vegetarian: bool = False
    is_vegan: bool = False
    is_gluten_free: bool = False
