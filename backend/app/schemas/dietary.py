from pydantic import BaseModel, Field

from app.domain.enums import Allergy, Cuisine


# Includes all dietery constraints (allergies, cuisines, etc.)
class DietaryConstraints(BaseModel):
    allergies: list[Allergy] = Field(default_factory=list)

    # Cuisine preferences
    include_cuisine: list[Cuisine] = Field(default_factory=list)
    exclude_cuisine: list[Cuisine] = Field(default_factory=list)

    # Diets
    is_gluten_free: bool = False
    is_ketogenic: bool = False
    is_vegetarian: bool = False
    is_vegan: bool = False
    is_pescatarian: bool = False
