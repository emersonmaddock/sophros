from typing import Any

import httpx

from app.core.config import settings


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
        diet: str | None = None,
        intolerances: list[str] | None = None,
        number: int = 1,
    ) -> list[dict[str, Any]]:
        """
        Search for recipes using the complexSearch endpoint.

        Spoonacular Parameter Notes:
        - addRecipeInformation=True: Returns basic info + instructions (if available).
        - addRecipeNutrition=True: Explicitly adds detailed nutritional information.

        FUTURE TODOs:
        - Custom Diets: We need to configure functionality for custom diets
          (Halal, Kosher, etc.) that aren't strictly supported by Spoonacular's
          'diet' param. We can use 'excludeIngredients' or 'tags' for these, and
          use the 'diet' param for supported ones (Vegan, Vegetarian, etc.).
        - Cuisine: We should include cuisine filtering later.
        - Meal Types: Configure the 'type' endpoint to specify meal types
          (breakfast, main course, etc.) according to Spoonacular.
        """
        endpoint = "/recipes/complexSearch"
        params: dict[str, Any] = {
            "number": number,
            "addRecipeInformation": True,  # Gives instructions and detailed info
            "addRecipeNutrition": True,  # Ensures full nutrition data is present
            "addRecipeInstructions": True,
            "instructionsRequired": True,  # We typically want recipes with instructions
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
        if diet:
            params["diet"] = diet

        if intolerances:
            params["intolerances"] = ",".join(intolerances)

        data = await self._request("GET", endpoint, params=params)
        return data.get("results", [])

    async def get_random_recipes(
        self, number: int = 1, tags: list[str] | None = None
    ) -> list[dict[str, Any]]:
        endpoint = "/recipes/random"
        params: dict[str, Any] = {"number": number}
        if tags:
            params["tags"] = ",".join(tags)

        data = await self._request("GET", endpoint, params=params)
        return data.get("recipes", [])
