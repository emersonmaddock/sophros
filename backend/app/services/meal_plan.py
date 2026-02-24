import asyncio
import logging

from app.domain.enums import Day, MealSlot
from app.schemas.dietary import DietaryConstraints
from app.schemas.meal_plan import DailyMealPlan, MealSlotTarget, WeeklyMealPlan
from app.schemas.recipe import Recipe, RecipeNutrients
from app.schemas.user import User
from app.services.meal_allocator import MealAllocator
from app.services.nutrient_calculator import NutrientCalculator
from app.services.spoonacular import MealType, SpoonacularClient

logger = logging.getLogger(__name__)


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
        3. Fetch recipes per slot from Spoonacular (primary + 2 alternatives)
        4. Return populated meal plan with recipes
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
            user_schedule=None,
            day=day,
        )

        # Step 3: Build dietary constraints from user profile
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

        # Step 4: Fetch recipes for all slots in parallel
        async def fetch_for_slot(slot: MealSlotTarget) -> MealSlotTarget:
            return await self._fetch_slot_recipes(slot, dietary_constraints)

        populated_slots = await asyncio.gather(
            *[fetch_for_slot(slot) for slot in meal_plan.slots]
        )

        meal_plan.slots = list(populated_slots)
        return meal_plan

    async def generate_weekly_plan(self, user: User) -> WeeklyMealPlan:
        """
        Generates a complete weekly meal plan by running all 7 days in parallel.
        """
        all_days = list(Day)

        daily_plans = await asyncio.gather(
            *[self.generate_daily_plan(user, day=day) for day in all_days]
        )

        return WeeklyMealPlan(
            days={day: plan for day, plan in zip(all_days, daily_plans, strict=True)}
        )

    async def _fetch_slot_recipes(
        self, slot: MealSlotTarget, constraints: DietaryConstraints
    ) -> MealSlotTarget:
        """
        Fetches primary recipe + 2 alternatives for a single slot.
        Uses a single API call with number=3.

        Strategy: search by calorie range + meal type only.
        Individual macro constraints (protein/carbs/fat) are too restrictive
        and cause Spoonacular to return 0 results. We use a wide ±30%
        calorie tolerance to maximize the chance of getting results.

        Raises ValueError if Spoonacular returns no recipes.
        """
        meal_type = self.MEAL_TYPE_MAP.get(slot.slot_name)

        # Wide calorie range only — individual macro filters dropped
        tolerance = 0.30
        min_cals = int(slot.calories * (1 - tolerance))
        max_cals = int(slot.calories * (1 + tolerance))

        logger.info(
            "Fetching recipes for %s: %d-%d cal, type=%s",
            slot.slot_name,
            min_cals,
            max_cals,
            meal_type,
        )

        results = await self.spoonacular_client.search_recipes(
            type=meal_type,
            min_calories=min_cals,
            max_calories=max_cals,
            constraints=constraints,
            number=3,
            sort="random",
        )

        if not results:
            raise ValueError(
                f"Spoonacular returned no recipes for {slot.slot_name} "
                f"({min_cals}-{max_cals} cal, type={meal_type}). "
                f"Check API key and dietary constraints."
            )

        slot.recipe = self._convert_to_recipe(results[0])
        slot.alternatives = [self._convert_to_recipe(r) for r in results[1:]]

        logger.info(
            "Got %d recipes for %s: primary=%s",
            len(results),
            slot.slot_name,
            slot.recipe.title,
        )

        return slot

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
            preparation_time_minutes=spoon_data.get("readyInMinutes"),
            source_url=spoon_data.get("sourceUrl"),
            image_url=spoon_data.get("image"),
        )
