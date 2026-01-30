from app.schemas.dietary import DietaryConstraints
from app.schemas.recipe import Recipe, RecipeNutrients
from app.services.recipe_filter import RecipeFilter


def test_filter_allergies():
    r1 = Recipe(
        id="1",
        title="PBJ",
        nutrients=RecipeNutrients(calories=1, protein=1, carbohydrates=1, fat=1),
        ingredients=["peanut butter", "jelly", "bread"],
    )
    r2 = Recipe(
        id="2",
        title="Ham Sandwich",
        nutrients=RecipeNutrients(calories=1, protein=1, carbohydrates=1, fat=1),
        ingredients=["ham", "cheese", "bread"],
    )

    constraints = DietaryConstraints(allergies=["peanut"])

    results = RecipeFilter.filter_recipes([r1, r2], constraints)

    assert len(results) == 1
    assert results[0].id == "2"


def test_filter_vegan():
    r1 = Recipe(
        id="1",
        title="Steak",
        nutrients=RecipeNutrients(calories=1, protein=1, carbohydrates=1, fat=1),
        ingredients=["steak"],
        tags=[],
    )
    r2 = Recipe(
        id="2",
        title="Tofu Stir Fry",
        nutrients=RecipeNutrients(calories=1, protein=1, carbohydrates=1, fat=1),
        ingredients=["tofu", "veggies"],
        tags=["vegan"],
    )

    constraints = DietaryConstraints(is_vegan=True)

    results = RecipeFilter.filter_recipes([r1, r2], constraints)

    assert len(results) == 1
    assert results[0].id == "2"


def test_filter_vegetarian_includes_vegan():
    # A vegan recipe should pass a vegetarian check
    r1 = Recipe(
        id="1",
        title="Tofu",
        nutrients=RecipeNutrients(calories=1, protein=1, carbohydrates=1, fat=1),
        ingredients=["tofu"],
        tags=["vegan"],
    )

    constraints = DietaryConstraints(is_vegetarian=True)

    results = RecipeFilter.filter_recipes([r1], constraints)
    assert len(results) == 1


def test_multiple_constraints():
    # Vegan AND allergy to nuts
    r1 = Recipe(
        id="1",
        title="Nutty Vegan Bar",
        nutrients=RecipeNutrients(calories=1, protein=1, carbohydrates=1, fat=1),
        ingredients=["almonds", "dates"],
        tags=["vegan"],
    )  # Fails allergy
    r2 = Recipe(
        id="2",
        title="Fruit Salad",
        nutrients=RecipeNutrients(calories=1, protein=1, carbohydrates=1, fat=1),
        ingredients=["apple", "banana"],
        tags=["vegan"],
    )  # Pass
    r3 = Recipe(
        id="3",
        title="Cheese Pizza",
        nutrients=RecipeNutrients(calories=1, protein=1, carbohydrates=1, fat=1),
        ingredients=["cheese", "dough"],
        tags=["vegetarian"],
    )  # Fails vegan diet

    constraints = DietaryConstraints(is_vegan=True, allergies=["almond"])

    results = RecipeFilter.filter_recipes([r1, r2, r3], constraints)

    assert len(results) == 1
    assert results[0].id == "2"
