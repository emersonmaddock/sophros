from pydantic import BaseModel


class NutrientRange(BaseModel):
    min: int
    target: int
    max: int
    unit: str = "g"

class DRIOutput(BaseModel):
    calories: NutrientRange
    protein: NutrientRange
    carbohydrates: NutrientRange
    fat: NutrientRange
