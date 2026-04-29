from datetime import datetime, time
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from app.domain.enums import (
    ActivityType,
    Allergy,
    Cuisine,
    Day,
    ExerciseCategory,
    MealSlot,
)
from app.services.exercise_service import ExerciseRecommendation
from app.services.google_calendar import _parse_google_dt
from app.services.meal_allocator import MealAllocator
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

    # Collect non-leftover primary recipe IDs, split by meal type.
    # Breakfasts rotate from a dedicated 3-recipe pool by design (Mon→0, Tue→1,
    # Wed→2, Thu→0, ...), so duplicates among breakfast primaries are expected.
    # Lunch/dinner primaries should still be globally unique.
    breakfast_primary_ids: list[str] = []
    main_primary_ids: list[str] = []
    for plan in weekly_plan.daily_plans:
        for slot in plan.slots:
            if slot.is_leftover:
                continue
            recipe_id = slot.plan.main_recipe.id
            if slot.slot_name == MealSlot.BREAKFAST:
                breakfast_primary_ids.append(recipe_id)
            else:
                main_primary_ids.append(recipe_id)

    # Lunch/dinner primaries: all unique
    assert len(set(main_primary_ids)) == len(main_primary_ids), (
        f"Expected all lunch/dinner primaries unique, got {len(set(main_primary_ids))} "
        f"unique out of {len(main_primary_ids)}"
    )

    # Breakfasts are never marked leftover, so all 7 days contribute a primary
    assert len(breakfast_primary_ids) == 7
    # Rotation pool is capped at 3 primaries
    assert len(set(breakfast_primary_ids)) <= 3, (
        f"Breakfast primaries should rotate from at most 3 recipes, got "
        f"{len(set(breakfast_primary_ids))} unique"
    )


def test_google_calendar_busy_blocks_are_merged_into_user_schedule():
    # generate_and_persist converts google_calendar ScheduleItems via
    # _google_blocks_to_busy_times and merges them into user.busy_times
    # before calling _get_user_schedule.  Simulate that here.
    service = MealPlanService()
    blocks = [
        SimpleNamespace(
            source_type="google_calendar",
            date=datetime(2026, 4, 27, 6, 0),  # Monday
            duration_minutes=210,
            activity_type=ActivityType.OTHER,
        )
    ]
    converted = MealPlanService._google_blocks_to_busy_times(blocks)
    assert len(converted) == 1
    assert converted[0].start == time(6, 0)
    assert converted[0].end == time(9, 30)

    user = create_mock_user()
    user.busy_times = converted

    monday_schedule = service._get_user_schedule(user, Day.MONDAY)

    assert len(monday_schedule.busy_times) == 1
    assert monday_schedule.busy_times[0].start == time(6, 0)
    assert monday_schedule.busy_times[0].end == time(9, 30)

    breakfast_time = MealAllocator._find_time_for_slot(
        MealSlot.BREAKFAST, monday_schedule, Day.MONDAY
    )
    exercise_time = MealAllocator.allocate_exercise_time(
        recommendation=ExerciseRecommendation(
            category=ExerciseCategory.CARDIO,
            duration_minutes=30,
        ),
        user_schedule=monday_schedule,
        day=Day.MONDAY,
        meal_times=[],
    )

    assert breakfast_time == time(9, 30)
    assert exercise_time == time(9, 30)


def test_parse_google_dt_preserves_wall_clock_time_from_offset():
    parsed = _parse_google_dt("2026-04-27T09:30:00-04:00")

    assert parsed == datetime(2026, 4, 27, 9, 30)
