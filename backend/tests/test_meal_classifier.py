from app.schemas.recipe import Recipe, RecipeNutrients
from app.services.meal_classifier import MealClassifier


def test_classify_heavy_prep_dinner():
    # Long prep time + heavy calories -> Dinner
    recipe = Recipe(
        id="1",
        title="Slow Roast Beef",
        nutrients=RecipeNutrients(calories=800, protein=60, carbohydrates=10, fat=40),
        ingredients=["beef", "potatoes"],
        tags=[],
        preparation_time_minutes=120,  # 2 hours
    )

    slots = MealClassifier.classify(recipe)
    assert "dinner" in slots
    assert "lunch" not in slots  # Should score low
    assert "snack" not in slots


def test_classify_quick_lunch():
    # Quick + Sandwich keywords -> Lunch
    recipe = Recipe(
        id="2",
        title="Turkey Sandwich",
        nutrients=RecipeNutrients(calories=450, protein=30, carbohydrates=40, fat=15),
        ingredients=["turkey", "bread", "mayo"],
        tags=[],
        preparation_time_minutes=10,
    )

    slots = MealClassifier.classify(recipe)
    assert "lunch" in slots
    # Might also trigger breakfast depending on score, but Sandwich is a strong
    # Lunch keyword (+5)
    # Prep time < 15 adds to Bf/Lunch/Snack.
    # Breakfast score: 2 (time) = 2
    # Lunch score: 5 (keyword) + 2 (time) + 2 (cals) = 9
    # Dinner score: -5 (cals) -2 (time) = -7

    assert "dinner" not in slots


def test_classify_breakfast_override():
    # Even if it looks like dinner, if tagged Breakfast, it should count
    recipe = Recipe(
        id="3",
        title="Steak and Eggs",
        nutrients=RecipeNutrients(calories=700, protein=50, carbohydrates=0, fat=50),
        ingredients=["steak", "egg"],
        tags=["breakfast"],
        preparation_time_minutes=20,
    )

    slots = MealClassifier.classify(recipe)
    assert "breakfast" in slots


def test_classify_snack_by_calories_and_time():
    recipe = Recipe(
        id="4",
        title="Cheese Stick",
        nutrients=RecipeNutrients(calories=80, protein=5, carbohydrates=0, fat=5),
        ingredients=["cheese"],
        tags=[],
        preparation_time_minutes=1,
    )

    slots = MealClassifier.classify(recipe)
    assert "snack" in slots
    assert "dinner" not in slots
