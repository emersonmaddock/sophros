from unittest.mock import AsyncMock, patch

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
    Mocks Spoonacular API responses as batch pools.
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

    # Breakfast pool: 5 recipes
    breakfast_pool = [
        _make_spoonacular_response(i, f"Breakfast {i}", 550 + i * 10, 20, 75, 12)
        for i in range(1, 6)
    ]

    # Main course pool: 10 recipes
    main_pool = [
        _make_spoonacular_response(100 + i, f"Main Course {i}", 700 + i * 5, 40, 50, 25)
        for i in range(1, 11)
    ]

    def search_recipes_side_effect(**kwargs):
        meal_type = kwargs.get("type")
        if meal_type and "breakfast" in str(meal_type).lower():
            return breakfast_pool
        else:
            return main_pool

    mock_client.search_recipes = AsyncMock(side_effect=search_recipes_side_effect)

    service = MealPlanService(spoonacular_client=mock_client)

    plan = await service.generate_daily_plan(user, day=Day.MONDAY)

    # Verify plan structure
    assert plan is not None
    assert plan.day == Day.MONDAY
    assert len(plan.slots) == 3

    # Verify slots are Breakfast, Lunch, Dinner
    slot_names = [slot.slot_name for slot in plan.slots]
    assert MealSlot.BREAKFAST in slot_names
    assert MealSlot.LUNCH in slot_names
    assert MealSlot.DINNER in slot_names

    # Verify each slot has a MealOption with a main recipe
    for slot in plan.slots:
        assert slot.plan is not None, f"Slot {slot.slot_name} should have a plan"
        assert slot.plan.main_recipe is not None, (
            f"Slot {slot.slot_name} should have a main recipe"
        )
        recipe = slot.plan.main_recipe
        assert recipe.title, f"Slot {slot.slot_name} recipe should have a title"
        assert recipe.nutrients.calories > 0
        assert recipe.nutrients.protein > 0
        assert len(recipe.ingredients) > 0

    # Verify alternatives
    for slot in plan.slots:
        assert len(slot.plan.alternatives) == 2, (
            f"Slot {slot.slot_name} should have 2 alternatives"
        )
        for alt in slot.plan.alternatives:
            assert alt.title
            assert alt.nutrients.calories > 0

    # Verify only 2 API calls (batch: 1 breakfast + 1 main course)
    assert mock_client.search_recipes.await_count == 2

    # Verify all 3 primary recipe IDs are unique
    primary_ids = {slot.plan.main_recipe.id for slot in plan.slots}
    assert len(primary_ids) == 3

    for call in mock_client.search_recipes.await_args_list:
        kwargs = call.kwargs
        assert "min_calories" in kwargs
        assert "max_calories" in kwargs
        # No sort="random" — shuffling is done locally
        assert "sort" not in kwargs
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

    with pytest.raises(ValueError, match="[Nn]o unused recipes"):
        await service.generate_daily_plan(user, day=Day.MONDAY)


@pytest.mark.asyncio
@patch(
    "app.services.meal_plan.ExercisePlanService.generate_weekly_plan",
    return_value={day: None for day in Day},
)
async def test_generate_weekly_plan(mock_exercise):
    """
    Test that generate_weekly_plan produces plans for all 7 days
    using only 2 API calls (batch pools) with unique primaries.
    """
    user = create_mock_user(
        age=25,
        weight=70.0,
        height=170.0,
        gender="female",
        activity_level="active",
    )

    mock_client = AsyncMock()

    # Breakfast pool: 25 unique recipes
    breakfast_pool = [
        _make_spoonacular_response(i, f"Breakfast {i}", 500 + i * 5, 20, 70, 12)
        for i in range(1, 26)
    ]

    # Main course pool: 50 unique recipes
    main_pool = [
        _make_spoonacular_response(1000 + i, f"Main {i}", 700 + i * 3, 40, 55, 22)
        for i in range(1, 51)
    ]

    def search_recipes_side_effect(**kwargs):
        meal_type = kwargs.get("type")
        if meal_type and "breakfast" in str(meal_type).lower():
            return list(breakfast_pool)  # Return copy to avoid shuffle mutation
        else:
            return list(main_pool)

    mock_client.search_recipes = AsyncMock(side_effect=search_recipes_side_effect)

    service = MealPlanService(spoonacular_client=mock_client)

    weekly_plan = await service.generate_weekly_plan(user)

    # Should have all 7 days
    assert len(weekly_plan.daily_plans) == 7

    for plan in weekly_plan.daily_plans:
        assert plan.day in list(Day)
        assert len(plan.slots) == 3

        for slot in plan.slots:
            assert slot.plan is not None
            assert slot.plan.main_recipe is not None

    # Only 2 API calls for the entire week (was 21)
    assert mock_client.search_recipes.await_count == 2

    # Collect all primary recipe IDs (excluding leftover slots which reuse IDs)
    non_leftover_ids = []
    for plan in weekly_plan.daily_plans:
        for slot in plan.slots:
            if not slot.is_leftover:
                non_leftover_ids.append(slot.plan.main_recipe.id)

    # All non-leftover primaries should be unique
    assert len(set(non_leftover_ids)) == len(non_leftover_ids), (
        f"Expected all non-leftover primaries unique, got {len(set(non_leftover_ids))} "
        f"unique out of {len(non_leftover_ids)}"
    )
