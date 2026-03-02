from unittest.mock import AsyncMock

import pytest

from app.domain.enums import Allergy, Cuisine, Day, MealSlot
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
        activity_level="moderate",
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
    # Now that we group Lunch/Dinner, there's 1 call for Breakfast, 1 for Main Course
    def search_recipes_side_effect(**kwargs):
        meal_type = kwargs.get("type")
        if meal_type and "breakfast" in str(meal_type).lower():
            return breakfast_response
        else:
            # Main Course call (for both Lunch and Dinner)
            return lunch_response + dinner_response

    mock_client.search_recipes = AsyncMock(side_effect=search_recipes_side_effect)

    # Create service with mocked client
    service = MealPlanService(spoonacular_client=mock_client)

    # Generate plan
    plan = await service.generate_daily_plan(user, day=Day.MONDAY)

    # Verify plan structure
    assert plan is not None
    assert len(plan.slots) == 3

    # Verify slots are Breakfast, Lunch, Dinner
    slot_names = [slot.slot_name for slot in plan.slots]
    assert MealSlot.BREAKFAST in slot_names
    assert MealSlot.LUNCH in slot_names
    assert MealSlot.DINNER in slot_names

    # Verify API was called 2 times (once for Breakfast, once for Main Course)
    assert mock_client.search_recipes.await_count == 2

    # Verify each call had proper parameters (optimized for pools)
    calls = mock_client.search_recipes.await_args_list

    # Breakfast call (15 recipes)
    assert calls[0].kwargs["number"] == 15
    # Main Course call (30 recipes for Lunch + Dinner)
    assert calls[1].kwargs["number"] == 30

    for call in calls:
        kwargs = call.kwargs
        assert "constraints" in kwargs
        assert kwargs["constraints"] is not None
