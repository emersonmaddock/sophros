from app.schemas.meal_plan import MealSlot, MealSlotTarget
from app.schemas.recipe import Recipe, RecipeNutrients
from app.services.meal_optimizer import MealOptimizer


def test_optimize_day_basic():
    # Setup
    nutrients_500 = RecipeNutrients(calories=500, protein=30, carbohydrates=50, fat=20)

    # 1. Breakfast Only Recipe
    r_breakfast = Recipe(
        id="brkfst",
        title="Oatmeal",
        ingredients=["oats"],
        tags=["breakfast"],
        nutrients=nutrients_500,
    )

    # 2. Lunch Only Recipe
    r_lunch = Recipe(
        id="lunch",
        title="Sandwich",
        ingredients=["bread", "ham"],
        tags=["lunch"],
        nutrients=nutrients_500,
    )

    available_recipes = [r_breakfast, r_lunch]

    slots = [
        MealSlotTarget(
            slot_name=MealSlot.BREAKFAST,
            calories=500,
            protein=30,
            carbohydrates=50,
            fat=20,
        ),
        MealSlotTarget(
            slot_name=MealSlot.LUNCH,
            calories=500,
            protein=30,
            carbohydrates=50,
            fat=20,
        ),
    ]

    result = MealOptimizer.optimize_day(slots, available_recipes)

    assert len(result) == 2
    assert result[0] is not None
    assert result[0].id == "brkfst"
    assert result[1] is not None
    assert result[1].id == "lunch"


def test_optimize_day_no_solution():
    # Setup with NO compatible recipes for Lunch
    nutrients_500 = RecipeNutrients(calories=500, protein=30, carbohydrates=50, fat=20)

    r_breakfast = Recipe(
        id="brkfst",
        title="Oatmeal",
        ingredients=["oats"],
        tags=["breakfast"],
        nutrients=nutrients_500,
    )

    available_recipes = [r_breakfast]

    slots = [
        MealSlotTarget(
            slot_name=MealSlot.BREAKFAST,
            calories=500,
            protein=30,
            carbohydrates=50,
            fat=20,
        ),
        MealSlotTarget(
            slot_name=MealSlot.LUNCH,
            calories=500,
            protein=30,
            carbohydrates=50,
            fat=20,
        ),
    ]

    result = MealOptimizer.optimize_day(slots, available_recipes)

    # Should return empty list if no feasible solution
    assert result == []


def test_optimize_day_min_penalty():
    # Test penalty logic (warnings)
    # Target 500 cal
    nutrients_500 = RecipeNutrients(calories=500, protein=30, carbohydrates=50, fat=20)
    nutrients_400 = RecipeNutrients(calories=400, protein=30, carbohydrates=50, fat=20)

    # 1. Perfect Match but Warning (Dislike)
    r_warning = Recipe(
        id="warn",
        title="Mushrooms",
        ingredients=["mushrooms"],
        tags=["breakfast"],
        nutrients=nutrients_500,
        warnings=["Contains disliked ingredient"],
    )

    # 2. Imperfect Match (100 cal diff) but Clean
    r_clean = Recipe(
        id="clean",
        title="Oatmeal",
        ingredients=["oats"],
        tags=["breakfast"],
        nutrients=nutrients_400,
    )

    available_recipes = [r_warning, r_clean]

    slots = [
        MealSlotTarget(
            slot_name=MealSlot.BREAKFAST,
            calories=500,
            protein=30,
            carbohydrates=50,
            fat=20,
        ),
    ]

    # Optimizer should pick r_clean because penalty (1000) > deviation (100)
    result = MealOptimizer.optimize_day(slots, available_recipes)

    assert len(result) == 1
    assert result[0] is not None
    assert result[0].id == "clean"


def test_excludes_invalid_slots():
    # Try to put a Dinner item in Breakfast slot
    slots = [
        MealSlotTarget(
            slot_name=MealSlot.BREAKFAST,
            calories=500,
            protein=30,
            carbohydrates=50,
            fat=20,
        )
    ]

    r1 = Recipe(
        id="1",
        title="Steak",
        nutrients=RecipeNutrients(calories=500, protein=30, carbohydrates=50, fat=20),
        ingredients=["steak"],
        tags=["lunch", "dinner"],
    )  # NOT breakfast

    # Should find NO solution or empty list
    results = MealOptimizer.optimize_day(slots, [r1])

    assert results == []


def test_multiple_slots_swapping():
    # If we have a Breakfast and a Snack slot
    # And two items: one only breakfast, one only snack
    # Logic should place them correctly even if list order is mixed

    slots = [
        MealSlotTarget(
            slot_name=MealSlot.BREAKFAST,
            calories=300,
            protein=10,
            carbohydrates=10,
            fat=10,
        ),
        MealSlotTarget(
            slot_name=MealSlot.SNACK,
            calories=100,
            protein=5,
            carbohydrates=5,
            fat=5,
        ),
    ]

    r1 = Recipe(
        id="1",
        title="Snack Item",
        nutrients=RecipeNutrients(calories=100, protein=5, carbohydrates=5, fat=5),
        ingredients=["nuts"],
        tags=["snack"],
    )
    r2 = Recipe(
        id="2",
        title="Breakfast Item",
        nutrients=RecipeNutrients(calories=300, protein=10, carbohydrates=10, fat=10),
        ingredients=["cereal"],
        tags=["breakfast"],
    )

    results = MealOptimizer.optimize_day(slots, [r1, r2])

    assert len(results) == 2
    # Result order corresponds to slots: [Breakfast, Snack]
    assert results[0] is not None
    assert results[0].id == "2"  # Breakfast Item
    assert results[1] is not None
    assert results[1].id == "1"  # Snack Item
