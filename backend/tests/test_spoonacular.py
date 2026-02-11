from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.dietary import Allergy, Cuisine, DietaryConstraints
from app.services.spoonacular import MealType, SpoonacularClient


@pytest.fixture
def mock_settings_key():
    with patch("app.services.spoonacular.settings") as mock_settings:
        mock_settings.SPOONACULAR_API_KEY = "test_key"
        yield


@pytest.fixture
def client(mock_settings_key):
    return SpoonacularClient()


@pytest.mark.asyncio
async def test_init_no_key():
    with patch("app.services.spoonacular.settings") as mock_settings:
        mock_settings.SPOONACULAR_API_KEY = None
        client = SpoonacularClient()
        assert client.api_key is None


@pytest.mark.asyncio
async def test_request_no_key_raises(client):
    client.api_key = None
    with pytest.raises(ValueError, match="Spoonacular API key is not set"):
        await client._request("GET", "/test")


@pytest.mark.asyncio
async def test_search_recipes_success(client):
    mock_response_data = {
        "results": [
            {"id": 101, "title": "Chicken Soup"},
            {"id": 102, "title": "Veggie Stir Fry"},
        ]
    }

    with patch("httpx.AsyncClient.request", new_callable=AsyncMock) as mock_request:
        mock_response = MagicMock()
        mock_response.json.return_value = mock_response_data
        mock_response.raise_for_status.return_value = None

        mock_request.return_value = mock_response

        # Test with various parameters
        results = await client.search_recipes(
            query="soup",
            number=2,
            min_calories=100,
            max_calories=500,
            diet="vegetarian",
            intolerances=["gluten", "dairy"],
        )

        assert len(results) == 2
        assert results[0]["title"] == "Chicken Soup"

        mock_request.assert_awaited_once()
        call_args = mock_request.call_args
        assert call_args[0] == (
            "GET",
            "https://api.spoonacular.com/recipes/complexSearch",
        )
        params = call_args[1]["params"]
        assert params["query"] == "soup"
        assert params["number"] == 2
        assert params["minCalories"] == 100
        assert params["maxCalories"] == 500
        assert params["diet"] == "vegetarian"
        assert params["intolerances"] == "gluten,dairy"
        assert params["addRecipeInformation"] is True
        assert params["addRecipeNutrition"] is True
        assert params["instructionsRequired"] is True
        assert params["fillIngredients"] is True
        assert call_args[1]["headers"]["x-api-key"] == "test_key"
        assert params["fillIngredients"] is True
        assert call_args[1]["headers"]["x-api-key"] == "test_key"


@pytest.mark.asyncio
async def test_search_recipes_with_constraints_and_enums(client):
    mock_response_data = {"results": []}

    with patch("httpx.AsyncClient.request", new_callable=AsyncMock) as mock_request:
        mock_response = MagicMock()
        mock_response.json.return_value = mock_response_data
        mock_response.raise_for_status.return_value = None
        mock_request.return_value = mock_response

        constraints = DietaryConstraints(
            allergies=[Allergy.PEANUT, Allergy.DAIRY],
            include_cuisine=[Cuisine.ITALIAN],
            exclude_cuisine=[Cuisine.MEXICAN],
            is_vegan=True,
            is_gluten_free=True,
        )

        await client.search_recipes(
            constraints=constraints,
            type=MealType.MAIN_COURSE,
            cuisine="Chinese",  # Explicit override/add
        )

        mock_request.assert_awaited_once()
        call_args = mock_request.call_args
        params = call_args[1]["params"]

        # Check Diets
        assert "vegan" in params["diet"]
        assert "gluten free" in params["diet"]

        # Check Intolerances (Allergies)
        assert "peanut" in params["intolerances"]
        assert "dairy" in params["intolerances"]

        # Check Cuisines
        assert "Italian" in params["cuisine"]
        assert "Chinese" in params["cuisine"]  # Explicit added
        assert "Mexican" in params["excludeCuisine"]

        # Check Type
        assert params["type"] == "main course"


@pytest.mark.asyncio
async def test_search_recipes_personalized_live():
    """
    Live test using a Mock User and Nutrient Calculator.
    Calculates daily needs, allocates 30% for dinner, and searches Spoonacular.
    Run with 'pytest -s' to see output.
    """
    from app.core.config import settings
    from app.services.nutrient_calculator import NutrientCalculator
    from tests.generate_mock_user import create_mock_user

    if not settings.SPOONACULAR_API_KEY:
        pytest.skip("SPOONACULAR_API_KEY not set")

    # 1. Create Mock User (Male, 30yo, 80kg, 180cm, Mod Active, Gluten-Free, Italian)
    user = create_mock_user(
        is_gluten_free=True,
        include_cuisine=[Cuisine.ITALIAN],
        allergies=[Allergy.PEANUT],
    )

    print("\n\n--- PERSONALIZED LIVE API TEST ---")
    print(f"User: {user.age}yo {user.gender}, {user.weight}kg, {user.height}cm")
    print(f"Activity: {user.activity_level}")
    print(
        f"Dietary: Gluten-Free={user.is_gluten_free}, "
        f"Cuisine={user.include_cuisine}, "
        f"Allergies={user.allergies}"
    )

    # 2. Calculate Daily Targets
    daily_targets = NutrientCalculator.calculate_targets(
        age=user.age,
        gender=user.gender,
        weight_kg=user.weight,
        height_cm=user.height,
        activity_level=user.activity_level,
    )

    tdee = daily_targets.calories.target
    print(f"\nDaily TDEE: {tdee} kcal")

    # 3. Allocation (Assumed 30% for Dinner)
    meal_ratio = 0.30
    meal_calories = int(tdee * meal_ratio)
    # Range +/- 100kcal
    min_cal = meal_calories - 100
    max_cal = meal_calories + 100

    print(f"Dinner Target (30%): {meal_calories} kcal ({min_cal}-{max_cal})")

    # 4. Search API
    client = SpoonacularClient(api_key=settings.SPOONACULAR_API_KEY)

    # Construct constraints from flat user
    constraints = DietaryConstraints(
        is_gluten_free=user.is_gluten_free,
        is_ketogenic=user.is_ketogenic,
        is_vegetarian=user.is_vegetarian,
        is_vegan=user.is_vegan,
        is_pescatarian=user.is_pescatarian,
        allergies=user.allergies,
        include_cuisine=user.include_cuisine,
        exclude_cuisine=user.exclude_cuisine,
    )

    results = await client.search_recipes(
        query="pasta",  # Search for user's preferred cuisine dish
        number=1,
        min_calories=min_cal,
        max_calories=max_cal,
        constraints=constraints,
        type=MealType.MAIN_COURSE,
        add_recipe_information=True,
        add_recipe_nutrition=True,
        add_recipe_instructions=True,
    )

    if not results:
        print("No results found matching criteria.")
        return

    recipe = results[0]

    # 5. Output
    print(f"\nMatch: {recipe.get('title')} (ID: {recipe.get('id')})")

    # Verify Constraints were respected (Visual check)
    print(f"Diets: {recipe.get('diets', [])}")
    print(f"Cuisines: {recipe.get('cuisines', [])}")

    if "nutrition" in recipe:
        nut = recipe["nutrition"]
        cal_obj = next(
            (n for n in nut.get("nutrients", []) if n["name"] == "Calories"), None
        )
        if cal_obj:
            print(f"Calories: {cal_obj['amount']} {cal_obj['unit']}")

    print("\n--- TEST END ---\n")
