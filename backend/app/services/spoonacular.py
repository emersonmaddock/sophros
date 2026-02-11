from enum import StrEnum
from typing import Any

import httpx

from app.core.config import settings
from app.schemas.dietary import DietaryConstraints


class MealType(StrEnum):
    MAIN_COURSE = "main course"
    SIDE_DISH = "side dish"
    DESSERT = "dessert"
    APPETIZER = "appetizer"
    SALAD = "salad"
    BREAD = "bread"
    BREAKFAST = "breakfast"
    SOUP = "soup"
    BEVERAGE = "beverage"
    SAUCE = "sauce"
    MARINADE = "marinade"
    FINGERFOOD = "fingerfood"
    SNACK = "snack"
    DRINK = "drink"


class SpoonacularClient:
    BASE_URL = "https://api.spoonacular.com"

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or settings.SPOONACULAR_API_KEY
        if not self.api_key:
            # We might want to log a warning here/raise an error depending on strictness
            pass

    async def _request(
        self, method: str, endpoint: str, params: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        if not self.api_key:
            raise ValueError("Spoonacular API key is not set")

        url = f"{self.BASE_URL}{endpoint}"
        headers = {"Content-Type": "application/json"}

        headers["x-api-key"] = self.api_key

        async with httpx.AsyncClient() as client:
            response = await client.request(method, url, headers=headers, params=params)
            response.raise_for_status()
            return response.json()

    async def search_recipes(
        self,
        query: str | None = None,
        min_calories: int | None = None,
        max_calories: int | None = None,
        min_protein: int | None = None,
        max_protein: int | None = None,
        min_fat: int | None = None,
        max_fat: int | None = None,
        min_carbs: int | None = None,
        max_carbs: int | None = None,
        constraints: DietaryConstraints | None = None,
        diet: str | None = None,
        intolerances: list[str] | None = None,
        type: MealType | str | None = None,
        cuisine: str | None = None,
        exclude_cuisine: str | None = None,
        number: int = 1,
        add_recipe_information: bool = True,
        add_recipe_nutrition: bool = True,
        add_recipe_instructions: bool = True,
    ) -> list[dict[str, Any]]:
        """
        Search for recipes using the complexSearch endpoint.

        Spoonacular Parameter Notes:
        - addRecipeInformation=True: Returns basic info + instructions (if available).
        - addRecipeNutrition=True: Explicitly adds detailed nutritional information.

        FUTURE TODOs:
        - confirm if we need to include recipe instructions (if
        all recipes have a sourceURL then that will suffice)
        - Meal Types: Configure the 'type' endpoint to specify meal types
          (breakfast, main course, etc.) according to Spoonacular.

        Updated notes:
        - For simplicity, we're following spoonacular's defined diets for now
        (no halal, kosher, etc.) can implement later
        - will include spoonacular defined cuisines for now (include & exclude)
        - Final endpoint list: cuisine, excludeCuisine, diet, intolerances,
        type, instructions required, recipeinfo/instructions/nutrition,
        macronutrients, number
        """
        endpoint = "/recipes/complexSearch"
        params: dict[str, Any] = {
            "number": number,
            "addRecipeInformation": add_recipe_information,
            "addRecipeNutrition": add_recipe_nutrition,
            "addRecipeInstructions": add_recipe_instructions,
            "instructionsRequired": True,  # displays the instructions
            "fillIngredients": True,
        }

        if query:
            params["query"] = query

        # Nutrients
        if min_calories is not None:
            params["minCalories"] = min_calories
        if max_calories is not None:
            params["maxCalories"] = max_calories
        if min_protein is not None:
            params["minProtein"] = min_protein
        if max_protein is not None:
            params["maxProtein"] = max_protein
        if min_fat is not None:
            params["minFat"] = min_fat
        if max_fat is not None:
            params["maxFat"] = max_fat
        if min_carbs is not None:
            params["minCarbs"] = min_carbs
        if max_carbs is not None:
            params["maxCarbs"] = max_carbs

        # Diets & Intolerances
        # Diets & Intolerances
        diets = []
        if constraints:
            if constraints.is_gluten_free:
                diets.append("gluten free")
            if constraints.is_ketogenic:
                diets.append("ketogenic")
            if constraints.is_vegetarian:
                diets.append("vegetarian")
            if constraints.is_vegan:
                diets.append("vegan")
            if constraints.is_pescatarian:
                diets.append("pescetarian")

            # Allergies as intolerances
            if constraints.allergies:
                intolerances_list = [a.value.lower() for a in constraints.allergies]
                if intolerances:
                    intolerances_list.extend([i.lower() for i in intolerances])
                params["intolerances"] = ",".join(list(set(intolerances_list)))

            # Cuisines
            if constraints.include_cuisine:
                cuisines_list = [c.value for c in constraints.include_cuisine]
                # If explicit cuisine passed, add it too
                if cuisine:
                    cuisines_list.extend([c.strip() for c in cuisine.split(",")])
                params["cuisine"] = ",".join(list(set(cuisines_list)))

            if constraints.exclude_cuisine:
                exclude_cuisines_list = [c.value for c in constraints.exclude_cuisine]
                # If explicit exclude_cuisine passed, add it too
                if exclude_cuisine:
                    exclude_cuisines_list.extend(
                        [c.strip() for c in exclude_cuisine.split(",")]
                    )
                params["excludeCuisine"] = ",".join(list(set(exclude_cuisines_list)))

        # Fallback for direct params if constraints object not used for these fields
        if diet:
            diets.extend([d.strip() for d in diet.split(",")])

        if diets:
            params["diet"] = ",".join(list(set(diets)))

        if "intolerances" not in params and intolerances:
            params["intolerances"] = ",".join(intolerances)

        if "cuisine" not in params and cuisine:
            params["cuisine"] = cuisine

        if "excludeCuisine" not in params and exclude_cuisine:
            params["excludeCuisine"] = exclude_cuisine

        # Meal Type
        if type:
            params["type"] = type.value if isinstance(type, MealType) else type

        data = await self._request("GET", endpoint, params=params)
        return data.get("results", [])
