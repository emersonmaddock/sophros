from pydantic import BaseModel, Field


class RecipeNutrients(BaseModel):
    calories: int
    protein: int
    carbohydrates: int
    fat: int


class Recipe(BaseModel):
    id: str
    title: str
    description: str | None = None
    nutrients: RecipeNutrients
    tags: list[str] = Field(default_factory=list)
    ingredients: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(
        default_factory=list
    )  # Soft restrictions (e.g. dislikes)

    # Metadata for classification
    preparation_time_minutes: int | None = None
