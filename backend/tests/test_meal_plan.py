from unittest.mock import AsyncMock

import pytest

from app.schemas.dietary import Allergy, Cuisine
from app.schemas.meal_plan import MealSlot
from app.schemas.user import UserSchedule
from app.services.meal_plan import MealPlanService
from tests.generate_mock_user import create_mock_user


@pytest.mark.asyncio
async def test_generate_daily_plan_integration():
    """
    Integration test for the full meal plan generation pipeline.
    Mocks Spoonacular API responses.
    """
    # Setup mock user using factory
    user = create_mock_user(
        age=30,
        weight=80.0,
        height=180.0,
        gender="male",
        activity_level="moderately_active",
        schedule=UserSchedule().model_dump(),
        allergies=[Allergy.PEANUT],
        include_cuisine=[Cuisine.ITALIAN],
        is_gluten_free=True,
    )

    # Mock Spoonacular client
    mock_client = AsyncMock()

    # Mock responses for 3 meals
    breakfast_response = [
        {
            "id": 1,
            "title": "Oatmeal with Berries",
            "summary": "Healthy breakfast",
            "nutrition": {
                "nutrients": [
                    {"name": "Calories", "amount": 600},
                    {"name": "Protein", "amount": 20},
                    {"name": "Carbohydrates", "amount": 80},
                    {"name": "Fat", "amount": 15},
                ]
            },
            "extendedIngredients": [
                {"original": "1 cup oats"},
                {"original": "1/2 cup berries"},
            ],
            "diets": ["gluten free"],
            "dishTypes": ["breakfast"],
            "cuisines": [],
        }
    ]

    lunch_response = [
        {
            "id": 2,
            "title": "Grilled Chicken Salad",
            "summary": "Protein-packed lunch",
            "nutrition": {
                "nutrients": [
                    {"name": "Calories", "amount": 700},
                    {"name": "Protein", "amount": 50},
                    {"name": "Carbohydrates", "amount": 40},
                    {"name": "Fat", "amount": 25},
                ]
            },
            "extendedIngredients": [
                {"original": "200g chicken breast"},
                {"original": "Mixed greens"},
            ],
            "diets": ["gluten free"],
            "dishTypes": ["salad", "main course"],
            "cuisines": [],
        }
    ]

    dinner_response = [
        {
            "id": 3,
            "title": "Pasta Primavera",
            "summary": "Italian dinner",
            "nutrition": {
                "nutrients": [
                    {"name": "Calories", "amount": 700},
                    {"name": "Protein", "amount": 25},
                    {"name": "Carbohydrates", "amount": 90},
                    {"name": "Fat", "amount": 20},
                ]
            },
            "extendedIngredients": [
                {"original": "Gluten-free pasta"},
                {"original": "Vegetables"},
            ],
            "diets": ["gluten free"],
            "dishTypes": ["dinner", "main course"],
            "cuisines": ["Italian"],
        }
    ]

    # Configure mock to return different responses based on meal type
    def search_recipes_side_effect(**kwargs):
        meal_type = kwargs.get("type")
        if meal_type and "breakfast" in str(meal_type).lower():
            return breakfast_response
        else:
            # Return lunch first, then dinner
            if not hasattr(search_recipes_side_effect, "call_count"):
                search_recipes_side_effect.call_count = 0
            search_recipes_side_effect.call_count += 1
            return (
                lunch_response
                if search_recipes_side_effect.call_count == 1
                else dinner_response
            )

    mock_client.search_recipes = AsyncMock(side_effect=search_recipes_side_effect)

    # Create service with mocked client
    service = MealPlanService(spoonacular_client=mock_client)

    # Generate plan
    plan = await service.generate_daily_plan(user, day="Monday")

    # Verify plan structure
    assert plan is not None
    assert len(plan.slots) == 3

    # Verify slots are Breakfast, Lunch, Dinner
    slot_names = [slot.slot_name for slot in plan.slots]
    assert MealSlot.BREAKFAST in slot_names
    assert MealSlot.LUNCH in slot_names
    assert MealSlot.DINNER in slot_names

    # Verify API was called 3 times (once per meal)
    assert mock_client.search_recipes.await_count == 3

    # Verify each call had proper parameters
    calls = mock_client.search_recipes.await_args_list

    for call in calls:
        kwargs = call.kwargs
        assert kwargs["number"] == 1
        assert "min_calories" in kwargs
        assert "max_calories" in kwargs
        assert "min_protein" in kwargs
        assert "constraints" != None
