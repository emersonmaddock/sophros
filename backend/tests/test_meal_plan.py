from unittest.mock import AsyncMock

import pytest

from app.domain.enums import Allergy, Cuisine, Day, MealSlot
from app.services.meal_plan import MealPlanService
from tests.generate_mock_user import create_mock_user


def _make_spoonacular_response(
    recipe_id: int,
    title: str,
    calories: int = 500,
    protein: int = 30,
    carbs: int = 60,
    fat: int = 20,
) -> dict:
    """Helper to create a Spoonacular-shaped response dict."""
    return {
        "id": recipe_id,
        "title": title,
        "summary": f"A delicious {title}",
        "readyInMinutes": 30,
        "sourceUrl": f"https://example.com/{recipe_id}",
        "image": f"https://example.com/{recipe_id}.jpg",
        "nutrition": {
            "nutrients": [
                {"name": "Calories", "amount": calories},
                {"name": "Protein", "amount": protein},
                {"name": "Carbohydrates", "amount": carbs},
                {"name": "Fat", "amount": fat},
            ]
        },
        "extendedIngredients": [
            {"original": "1 cup ingredient A"},
            {"original": "2 tbsp ingredient B"},
        ],
        "diets": ["gluten free"],
        "dishTypes": ["main course"],
        "cuisines": ["Italian"],
    }


@pytest.mark.asyncio
async def test_generate_daily_plan_integration():
    """
    Integration test for the full meal plan generation pipeline.
    Mocks Spoonacular API responses.
    Asserts that recipes and alternatives are populated in slots.
    """
    user = create_mock_user(
        age=30,
        weight=80.0,
        height=180.0,
        gender="male",
        activity_level="moderate",
        allergies=[Allergy.PEANUT],
        include_cuisine=[Cuisine.ITALIAN],
        is_gluten_free=True,
    )

    mock_client = AsyncMock()

    # Each call returns 3 recipes (primary + 2 alternatives)
    breakfast_response = [
        _make_spoonacular_response(1, "Oatmeal with Berries", 600, 20, 80, 15),
        _make_spoonacular_response(2, "Yogurt Parfait", 550, 18, 75, 12),
        _make_spoonacular_response(3, "Smoothie Bowl", 520, 22, 70, 10),
    ]

    lunch_response = [
        _make_spoonacular_response(4, "Grilled Chicken Salad", 700, 50, 40, 25),
        _make_spoonacular_response(5, "Turkey Wrap", 650, 45, 45, 20),
        _make_spoonacular_response(6, "Buddha Bowl", 680, 35, 55, 22),
    ]

    dinner_response = [
        _make_spoonacular_response(7, "Pasta Primavera", 700, 25, 90, 20),
        _make_spoonacular_response(8, "Grilled Salmon", 720, 40, 50, 30),
        _make_spoonacular_response(9, "Veggie Stir Fry", 650, 28, 80, 18),
    ]

    def search_recipes_side_effect(**kwargs):
        meal_type = kwargs.get("type")
        if meal_type and "breakfast" in str(meal_type).lower():
            return breakfast_response
        else:
            if not hasattr(search_recipes_side_effect, "call_count"):
                search_recipes_side_effect.call_count = 0
            search_recipes_side_effect.call_count += 1
            return (
                lunch_response
                if search_recipes_side_effect.call_count == 1
                else dinner_response
            )

    mock_client.search_recipes = AsyncMock(side_effect=search_recipes_side_effect)

    service = MealPlanService(spoonacular_client=mock_client)

    plan = await service.generate_daily_plan(user, day=Day.MONDAY)

    # Verify plan structure
    assert plan is not None
    assert len(plan.slots) == 3

    # Verify slots are Breakfast, Lunch, Dinner
    slot_names = [slot.slot_name for slot in plan.slots]
    assert MealSlot.BREAKFAST in slot_names
    assert MealSlot.LUNCH in slot_names
    assert MealSlot.DINNER in slot_names

    # Verify each slot has a recipe populated
    for slot in plan.slots:
        assert slot.recipe is not None, f"Slot {slot.slot_name} should have a recipe"
        assert slot.recipe.title, f"Slot {slot.slot_name} recipe should have a title"
        assert slot.recipe.nutrients.calories > 0
        assert slot.recipe.nutrients.protein > 0
        assert slot.recipe.source_url is not None
        assert slot.recipe.image_url is not None
        assert slot.recipe.preparation_time_minutes is not None
        assert len(slot.recipe.ingredients) > 0

    # Verify alternatives
    for slot in plan.slots:
        assert len(slot.alternatives) == 2, (
            f"Slot {slot.slot_name} should have 2 alternatives"
        )
        for alt in slot.alternatives:
            assert alt.title
            assert alt.nutrients.calories > 0

    # Verify each slot has a time assigned (defaults)
    for slot in plan.slots:
        assert slot.time is not None, (
            f"Slot {slot.slot_name} should have a default time"
        )

    # Verify API was called 3 times (once per meal, number=3)
    assert mock_client.search_recipes.await_count == 3

    for call in mock_client.search_recipes.await_args_list:
        kwargs = call.kwargs
        assert kwargs["number"] == 3
        assert "min_calories" in kwargs
        assert "max_calories" in kwargs
        # Individual macro constraints should NOT be sent (relaxed search)
        assert "min_protein" not in kwargs
        assert "min_carbs" not in kwargs
        assert "min_fat" not in kwargs
        assert kwargs["constraints"] is not None


@pytest.mark.asyncio
async def test_generate_daily_plan_fails_on_empty_results():
    """
    Verify that the service raises ValueError when Spoonacular returns
    no recipes, instead of silently returning empty slots.
    """
    user = create_mock_user(
        age=30,
        weight=80.0,
        height=180.0,
        gender="male",
        activity_level="moderate",
    )

    mock_client = AsyncMock()
    mock_client.search_recipes = AsyncMock(return_value=[])

    service = MealPlanService(spoonacular_client=mock_client)

    with pytest.raises(ValueError, match="Spoonacular returned no recipes"):
        await service.generate_daily_plan(user, day=Day.MONDAY)


@pytest.mark.asyncio
async def test_generate_weekly_plan():
    """
    Test that generate_weekly_plan produces plans for all 7 days.
    """
    user = create_mock_user(
        age=25,
        weight=70.0,
        height=170.0,
        gender="female",
        activity_level="active",
    )

    mock_client = AsyncMock()

    # Return 3 recipes for every call
    mock_client.search_recipes = AsyncMock(
        return_value=[
            _make_spoonacular_response(1, "Recipe A"),
            _make_spoonacular_response(2, "Recipe B"),
            _make_spoonacular_response(3, "Recipe C"),
        ]
    )

    service = MealPlanService(spoonacular_client=mock_client)

    weekly_plan = await service.generate_weekly_plan(user)

    # Should have all 7 days
    assert len(weekly_plan.days) == 7

    for day_name in Day:
        assert day_name in weekly_plan.days
        day_plan = weekly_plan.days[day_name]
        assert len(day_plan.slots) == 3

        for slot in day_plan.slots:
            assert slot.recipe is not None
            assert len(slot.alternatives) == 2

    # 7 days * 3 slots = 21 API calls
    assert mock_client.search_recipes.await_count == 21
