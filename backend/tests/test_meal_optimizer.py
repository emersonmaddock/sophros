from app.schemas.meal_plan import MealSlotTarget
from app.schemas.recipe import Recipe, RecipeNutrients
from app.services.meal_optimizer import MealOptimizer


def test_optimize_simple_exact_match():
    # 2 Slots, 2 Perfect Matches
    slots = [
        MealSlotTarget(
            slot_name="Breakfast", calories=500, protein=30, carbohydrates=50, fat=20
        ),
        MealSlotTarget(
            slot_name="Lunch", calories=700, protein=40, carbohydrates=60, fat=30
        ),
    ]

    r1 = Recipe(
        id="1",
        title="Perfect Breakfast",
        nutrients=RecipeNutrients(calories=500, protein=30, carbohydrates=50, fat=20),
        ingredients=["eggs"],
        tags=["breakfast"],
    )
    r2 = Recipe(
        id="2",
        title="Perfect Lunch",
        nutrients=RecipeNutrients(calories=700, protein=40, carbohydrates=60, fat=30),
        ingredients=["chicken"],
        tags=["lunch"],
    )
    r3 = Recipe(
        id="3",
        title="Bad Breakfast",
        nutrients=RecipeNutrients(calories=1000, protein=10, carbohydrates=10, fat=90),
        ingredients=["lard"],
        tags=["breakfast"],
    )

    results = MealOptimizer.optimize_day(slots, [r1, r2, r3])

    assert len(results) == 2
    assert results[0].id == "1"  # Breakfast
    assert results[1].id == "2"  # Lunch


def test_optimize_minimizes_deviation():
    # Target: 500 cal.
    # Options:
    # A: 450 cal (diff 50)
    # B: 600 cal (diff 100)
    # C: 500 cal but wrong macros

    slots = [
        MealSlotTarget(
            slot_name="Breakfast", calories=500, protein=30, carbohydrates=50, fat=20
        )
    ]

    # Perfect Cals, Bad Macros (Prot diff 20, Carbs diff 20 - Weighted 200+200=400 cost)
    r1 = Recipe(
        id="1",
        title="Macro Mismatch",
        nutrients=RecipeNutrients(calories=500, protein=10, carbohydrates=30, fat=20),
        ingredients=["sugar"],
        tags=["breakfast"],
    )

    # Slight Cal diff, Perfect Macros (Cal diff 10, Macros diff 0 -> Cost 10)
    # Wait, simple math:
    # R1 Cost: Cal(0) + Prot(|10-30|*10=200) + Carbs(|30-50|*10=200) + Fat(0) = 400
    # R2 Cost: Cal(|490-500|=10) + Prot(0) + ... = 10
    # R2 should win

    r2 = Recipe(
        id="2",
        title="Good Fit",
        nutrients=RecipeNutrients(calories=490, protein=30, carbohydrates=50, fat=20),
        ingredients=["oats"],
        tags=["breakfast"],
    )

    results = MealOptimizer.optimize_day(slots, [r1, r2])

    assert len(results) == 1
    assert results[0].id == "2"


def test_excludes_invalid_slots():
    # Try to put a Dinner item in Breakfast slot
    slots = [
        MealSlotTarget(
            slot_name="Breakfast", calories=500, protein=30, carbohydrates=50, fat=20
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
            slot_name="Breakfast", calories=300, protein=10, carbohydrates=10, fat=10
        ),
        MealSlotTarget(
            slot_name="Snack", calories=100, protein=5, carbohydrates=5, fat=5
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
    assert results[0].id == "2"  # Breakfast Item
    assert results[1].id == "1"  # Snack Item
