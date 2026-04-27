from pydantic import BaseModel, ConfigDict


class MealRead(BaseModel):
    id: int
    recipe_id: str | None = None
    title: str
    image_url: str | None = None
    source_url: str | None = None
    calories: int
    protein: int
    carbohydrates: int
    fat: int
    prep_time_minutes: int | None = None
    ingredients: list[str] = []
    tags: list[str] = []
    is_custom: bool = False

    model_config = ConfigDict(from_attributes=True)
