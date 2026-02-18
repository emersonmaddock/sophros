from app.schemas.dietary import DietaryConstraints
from app.schemas.meal_plan import DailyMealPlan, Day, MealSlot
from app.schemas.recipe import Recipe, RecipeNutrients
from app.schemas.user import User
from app.services.meal_allocator import MealAllocator
from app.services.nutrient_calculator import NutrientCalculator
from app.services.spoonacular import MealType, SpoonacularClient


class MealPlanService:
    """
    Orchestrates the full meal plan generation pipeline.
    """

    # Mapping from our MealSlot enum to Spoonacular meal types
    MEAL_TYPE_MAP = {
        MealSlot.BREAKFAST: MealType.BREAKFAST,
        MealSlot.LUNCH: MealType.MAIN_COURSE,
        MealSlot.DINNER: MealType.MAIN_COURSE,
    }

    def __init__(self, spoonacular_client: SpoonacularClient | None = None):
        self.spoonacular_client = spoonacular_client or SpoonacularClient()

    async def generate_daily_plan(
        self, user: User, day: Day = Day.MONDAY
    ) -> DailyMealPlan:
        """
        Generates a complete daily meal plan for the user.

        Steps:
        1. Calculate daily nutrient targets
        2. Allocate targets to meal slots with times
        3. Fetch 1 recipe per slot from Spoonacular
        4. Return populated meal plan
        """

        # Step 1: Calculate Daily Targets
        daily_targets = NutrientCalculator.calculate_targets(
            age=user.age,
            gender=user.gender,
            weight_kg=user.weight,
            height_cm=user.height,
            activity_level=user.activity_level,
        )

        # Step 2: Allocate to Slots
        meal_plan = MealAllocator.allocate_targets(
            daily_targets=daily_targets,
            user_schedule=user.schedule,
            day=day,
        )

        # Step 3: Fetch Recipes for Each Slot
        # Build dietary constraints from user profile
        dietary_constraints = DietaryConstraints(
            allergies=user.allergies,
            include_cuisine=user.include_cuisine,
            exclude_cuisine=user.exclude_cuisine,
            is_gluten_free=user.is_gluten_free,
            is_ketogenic=user.is_ketogenic,
            is_vegetarian=user.is_vegetarian,
            is_vegan=user.is_vegan,
            is_pescatarian=user.is_pescatarian,
        )

        recipes: list[Recipe | None] = []

        for slot in meal_plan.slots:
            # Map slot to Spoonacular meal type
            meal_type = self.MEAL_TYPE_MAP.get(slot.slot_name)

            # Calculate calorie/macro ranges (±10% tolerance)
            tolerance = 0.10
            min_cals = int(slot.calories * (1 - tolerance))
            max_cals = int(slot.calories * (1 + tolerance))
            min_protein = int(slot.protein * (1 - tolerance))
            max_protein = int(slot.protein * (1 + tolerance))
            min_carbs = int(slot.carbohydrates * (1 - tolerance))
            max_carbs = int(slot.carbohydrates * (1 + tolerance))
            min_fat = int(slot.fat * (1 - tolerance))
            max_fat = int(slot.fat * (1 + tolerance))

            # Fetch 1 recipe
            results = await self.spoonacular_client.search_recipes(
                type=meal_type,
                min_calories=min_cals,
                max_calories=max_cals,
                min_protein=min_protein,
                max_protein=max_protein,
                min_carbs=min_carbs,
                max_carbs=max_carbs,
                min_fat=min_fat,
                max_fat=max_fat,
                constraints=dietary_constraints,
                number=1,
            )

            # Convert to Recipe model
            if results:
                recipe = self._convert_to_recipe(results[0])
                recipes.append(recipe)
            else:
                recipes.append(None)  # No recipe found for this slot

        # Step 4: Populate plan with recipes (for now, just store in a new field)
        # We'll need to update DailyMealPlan schema to include recipes
        # For now, returning the plan as-is
        return meal_plan

    def _convert_to_recipe(self, spoon_data: dict) -> Recipe:
        """
        Converts Spoonacular API response to Recipe Pydantic model.
        """
        # Extract nutrients from nutrition.nutrients array
        nutrition = spoon_data.get("nutrition", {})
        nutrients_list = nutrition.get("nutrients", [])

        # Find specific nutrients
        calories = 0
        protein = 0
        carbs = 0
        fat = 0

        for nutrient in nutrients_list:
            name = nutrient.get("name", "").lower()
            amount = int(nutrient.get("amount", 0))

            if "calorie" in name:
                calories = amount
            elif "protein" in name:
                protein = amount
            elif "carbohydrate" in name:
                carbs = amount
            elif "fat" in name:
                fat = amount

        # Extract ingredients
        ingredients = []
        extended_ingredients = spoon_data.get("extendedIngredients", [])
        for ing in extended_ingredients:
            ingredients.append(ing.get("original", ""))

        # Extract tags (diets, dish types, cuisines)
        tags = []
        tags.extend(spoon_data.get("diets", []))
        tags.extend(spoon_data.get("dishTypes", []))
        tags.extend(spoon_data.get("cuisines", []))

        return Recipe(
            id=str(spoon_data.get("id", "")),
            title=spoon_data.get("title", "Unknown Recipe"),
            description=spoon_data.get("summary", ""),
            nutrients=RecipeNutrients(
                calories=calories,
                protein=protein,
                carbohydrates=carbs,
                fat=fat,
            ),
            tags=tags,
            ingredients=ingredients,
        )
