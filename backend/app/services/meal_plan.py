from app.domain.enums import Day, MealSlot
from app.schemas.dietary import DietaryConstraints
from app.schemas.meal_plan import DailyMealPlan, MealOption, WeeklyMealPlan
from app.schemas.recipe import Recipe, RecipeNutrients
from app.schemas.user import BusyTime, User, UserSchedule
from app.services.exercise_service import ExercisePlanService
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
            user_schedule=None,
            day=day,
        )

        # Step 3: Fetch Recipes (Simplified for daily, usually called via weekly)
        # For a single day, we fetch one main and skip alternatives/leftovers for now
        # ... logic moved to _populate_recipes ...
        await self._populate_recipes(meal_plan, user)

        return meal_plan

    async def generate_weekly_plan(self, user: User) -> WeeklyMealPlan:
        """
        Generates a 7-day meal plan.
        1. Calculates daily targets (factoring in goals).
        2. Allocates slots for each day.
        3. Implements "Cook Once, Eat Twice" leftover logic.
        4. Batches Spoonacular requests to save tokens.
        """
        daily_plans = []

        # Step 1 & 2: Initial allocation for 7 days
        for day in Day:
            daily_targets = NutrientCalculator.calculate_targets(
                age=user.age,
                gender=user.gender,
                weight_kg=user.weight,
                height_cm=user.height,
                activity_level=user.activity_level,
                target_weight=user.target_weight,
                target_date=user.target_date,
            )

            user_schedule = self._get_user_schedule(user, day)

            plan = MealAllocator.allocate_targets(
                daily_targets=daily_targets,
                user_schedule=user_schedule,
                day=day,
            )
            # Add Exercise Recommendation
            rec = ExercisePlanService.get_recommendation(
                current_weight=user.weight, target_weight=user.target_weight
            )
            # Find optimal time for exercise
            meal_times = [s.time for s in plan.slots if s.time]
            rec.time = MealAllocator.allocate_exercise_time(
                recommendation=rec,
                user_schedule=user_schedule,
                day=day,
                meal_times=meal_times,
            )
            plan.exercise = rec
            daily_plans.append(plan)

        # Step 3: Leftover Logic
        # Monday Dinner -> Tuesday Lunch
        # Wednesday Dinner -> Thursday Lunch
        # Friday Dinner -> Saturday Lunch
        leftover_map = {
            Day.MONDAY: Day.TUESDAY,
            Day.WEDNESDAY: Day.THURSDAY,
            Day.FRIDAY: Day.SATURDAY,
        }

        for leftover_day in leftover_map.values():
            leftover_plan = next(p for p in daily_plans if p.day == leftover_day)
            lunch_slot = next(
                s for s in leftover_plan.slots if s.slot_name == MealSlot.LUNCH
            )
            lunch_slot.is_leftover = True

        # Step 4: Batch Fetch Recipes
        # Fetch a pool of recipes for the whole week to save tokens
        recipe_pool = await self._fetch_recipe_pool(user)

        # Step 5: Assign from Pool
        self._assign_recipes_from_pool(daily_plans, recipe_pool)

        total_weekly_cals = sum(p.total_calories for p in daily_plans)
        return WeeklyMealPlan(
            daily_plans=daily_plans, total_weekly_calories=total_weekly_cals
        )

    async def _fetch_recipe_pool(self, user: User) -> dict[MealSlot, list[Recipe]]:
        """
        Fetches a pool of recipes for each slot type to satisfy the week's needs.
        """
        pool = {slot: [] for slot in MealSlot}
        dietary_constraints = self._get_dietary_constraints(user)

        for slot in MealSlot:
            meal_type = self.MEAL_TYPE_MAP.get(slot)
            results = await self.spoonacular_client.search_recipes(
                type=meal_type,
                number=15,  # Fetch 15 to have plenty of variety/alternatives
                constraints=dietary_constraints,
            )
            pool[slot] = [self._convert_to_recipe(r) for r in results]

        return pool

    def _assign_recipes_from_pool(
        self, daily_plans: list[DailyMealPlan], pool: dict[MealSlot, list[Recipe]]
    ):
        """
        Assigns recipes from the pool to the plans, handling leftovers and variety.
        """
        used_recipe_ids = set()

        # Map to track planned leftovers
        leftover_recipes: dict[Day, Recipe] = {}

        for plan in daily_plans:
            for slot in plan.slots:
                if slot.is_leftover:
                    # Find which day this leftover comes from
                    # Simple heuristic: Dinner from previous day
                    # (In a real app, this would be more explicit)
                    prev_day_recipe = leftover_recipes.get(plan.day)
                    if prev_day_recipe:
                        slot.plan = MealOption(main_recipe=prev_day_recipe)
                        slot.prep_time_minutes = 5  # Just reheating
                        continue

                # Normal assignment
                available = [
                    r for r in pool[slot.slot_name] if r.id not in used_recipe_ids
                ]
                if not available:
                    available = pool[slot.slot_name]  # Fallback if pool exhausted

                if available:
                    main = available[0]
                    alts = available[1:3]
                    slot.plan = MealOption(main_recipe=main, alternatives=alts)
                    slot.prep_time_minutes = main.preparation_time_minutes or 30
                    used_recipe_ids.add(main.id)

                    # If this is a dinner that will be a leftover, store it
                    if slot.slot_name == MealSlot.DINNER:
                        next_day = self._get_next_day(plan.day)
                        leftover_recipes[next_day] = main

    def _get_next_day(self, day: Day) -> Day:
        days = list(Day)
        idx = days.index(day)
        return days[(idx + 1) % 7]

    def _get_user_schedule(self, user: User, day: Day) -> UserSchedule:
        """
        Converts DB ScheduleItems into a UserSchedule for the allocator.
        """
        busy_times = []
        # In the real app, user.schedules would contain ScheduleItem models.
        # We need to filter by day of week.
        for item in user.schedules or []:
            # Check if item.date falls on the target 'day' (e.g. "Monday")
            if item.date.strftime("%A") == day:
                # Calculate end time
                from datetime import timedelta

                start_time = item.date.time()
                # Dummy end time based on duration
                # (Would be better if ScheduleItem had end_time or we calculated it)
                end_dt = item.date + timedelta(minutes=item.duration_minutes)
                end_time = end_dt.time()

                busy_times.append(BusyTime(day=day, start=start_time, end=end_time))

        return UserSchedule(
            busy_times=busy_times,
            wake_up_time=user.wake_up_time,
            sleep_time=user.sleep_time,
        )

    def _get_dietary_constraints(self, user: User) -> DietaryConstraints:
        return DietaryConstraints(
            allergies=user.allergies,
            include_cuisine=user.include_cuisine,
            exclude_cuisine=user.exclude_cuisine,
            is_gluten_free=user.is_gluten_free,
            is_ketogenic=user.is_ketogenic,
            is_vegetarian=user.is_vegetarian,
            is_vegan=user.is_vegan,
            is_pescatarian=user.is_pescatarian,
        )

    async def _populate_recipes(self, meal_plan: DailyMealPlan, user: User):
        """
        Helper for daily plan recipe population (legacy support).
        """
        pool = await self._fetch_recipe_pool(user)
        self._assign_recipes_from_pool([meal_plan], pool)

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
