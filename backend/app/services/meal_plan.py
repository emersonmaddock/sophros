from typing import Any

from app.domain.enums import Day, MealSlot
from app.schemas.dietary import DietaryConstraints
from app.schemas.meal_plan import (
    DailyMealPlan,
    MealOption,
    MealSlotTarget,
    WeeklyMealPlan,
)
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
        1. Generates a weekly exercise plan once.
        2. Calculates daily nutrient targets factoring in exercise calories.
        3. Allocates slots and applies adaptive leftover logic.
        """
        daily_plans = []

        # Pre-calculate schedules for the whole week
        weekly_schedules = {day: self._get_user_schedule(user, day) for day in Day}

        # Step 1: Generate Weekly Exercise Plan (One-time call)
        exercise_plan = ExercisePlanService.generate_weekly_plan(user, weekly_schedules)

        # Step 2: Initial allocation for 7 days
        for day in Day:
            # Get exercise for this specific day
            exercise_rec = exercise_plan.get(day)
            exercise_cals = exercise_rec.calories_burned if exercise_rec else 0

            # Calculate targets factoring in exercise burn & goals
            daily_targets = NutrientCalculator.calculate_targets(
                age=user.age,
                gender=user.gender,
                weight_kg=user.weight,
                height_cm=user.height,
                activity_level=user.activity_level,
                target_weight=user.target_weight,
                target_date=user.target_date,
                exercise_calories=exercise_cals,
                target_body_fat=user.target_body_fat,
            )

            user_schedule = weekly_schedules[day]

            plan = MealAllocator.allocate_targets(
                daily_targets=daily_targets,
                user_schedule=user_schedule,
                day=day,
            )

            # Step 2b: Schedule the Exercise time if it exists
            if exercise_rec:
                meal_times = [s.time for s in plan.slots if s.time]
                exercise_rec.time = MealAllocator.allocate_exercise_time(
                    recommendation=exercise_rec,
                    user_schedule=user_schedule,
                    day=day,
                    meal_times=meal_times,
                )
                if exercise_rec.time:
                    plan.exercise = exercise_rec

            daily_plans.append(plan)

        # Step 3: Adaptive Leftover Logic
        self._apply_adaptive_leftovers(daily_plans, user)

        # Step 4: Batch Fetch Recipes
        # Fetch a pool of recipes for the whole week to save tokens
        recipe_pool = await self._fetch_recipe_pool(user)

        # Step 5: Assign from Pool
        self._assign_recipes_from_pool(daily_plans, recipe_pool)

        total_weekly_cals = sum(p.total_calories for p in daily_plans)
        return WeeklyMealPlan(
            daily_plans=daily_plans, total_weekly_calories=total_weekly_cals
        )

    def _apply_adaptive_leftovers(self, daily_plans: list[DailyMealPlan], user: User):
        """
        Refined Leftover Logic:
        1. Categories: Breakfasts stay separate. Lunch/Dinner are interchangeable.
        2. Maximized Efficiency: Every 'Cook' event creates exactly 2 portions.
        3. Priority: Pairs 'Free' cook windows with 'Busy' (time is None) slots first.
        """
        # Linear list of all slots for the week
        all_slots: list[dict[str, Any]] = []
        for plan in daily_plans:
            for slot in plan.slots:
                # Add metadata to help pairing
                all_slots.append(
                    {
                        "day": plan.day,
                        "slot": slot,
                        "is_breakfast": slot.slot_name == MealSlot.BREAKFAST,
                        "is_assigned": False,
                    }
                )

        for i, item in enumerate(all_slots):
            if item["is_assigned"]:
                continue

            current_slot: MealSlotTarget = item["slot"]
            # If this slot is already BUSY, we have a problem (nothing to cook).
            # We'll treat the first available slot as a "Cook" slot,
            # unless a prior loop already claimed it as a leftover.
            if current_slot.time is None:
                # Fallback: If we couldn't find a prior meal to leftover from,
                # we have to "Cook" even if busy (perhaps a quick 5 min meal)
                # but better logic is to avoid this. For now, mark it assigned.
                item["is_assigned"] = True
                continue

            # This is a "COOK" slot. Now find a "LEFTOVER" partner.
            # 1. Search for a BUSY slot of the same category in the future.
            found_partner = False
            for j in range(i + 1, len(all_slots)):
                partner = all_slots[j]
                if partner["is_assigned"]:
                    continue
                if partner["is_breakfast"] != item["is_breakfast"]:
                    continue

                # Priority 1: Busy slots
                if partner["slot"].time is None:
                    self._pair_slots(item, partner)
                    found_partner = True
                    break

            # 2. If no busy slot found, just take the next available of same category
            if not found_partner:
                for j in range(i + 1, len(all_slots)):
                    partner = all_slots[j]
                    if partner["is_assigned"]:
                        continue
                    if partner["is_breakfast"] != item["is_breakfast"]:
                        continue

                    self._pair_slots(item, partner)
                    found_partner = True
                    break

            # Mark the current cook slot as assigned
            item["is_assigned"] = True

    def _pair_slots(self, cook_item, leftover_item):
        """Helper to link two portions."""
        leftover_slot = leftover_item["slot"]
        cook_slot = cook_item["slot"]

        leftover_slot.is_leftover = True
        leftover_slot.leftover_from_day = cook_item["day"]
        leftover_slot.leftover_from_slot = cook_slot.slot_name
        leftover_item["is_assigned"] = True

    async def _fetch_recipe_pool(self, user: User) -> dict[MealSlot, list[Recipe]]:
        """
        Fetches recipes from Spoonacular efficiently by grouping by type.
        """
        pool: dict[MealSlot, list[Recipe]] = {slot: [] for slot in MealSlot}
        dietary_constraints = self._get_dietary_constraints(user)

        # 1. Identity unique MealTypes needed
        # Breakfast separated from main course (lunch/dinner)
        type_to_slots: dict[MealType, list[MealSlot]] = {}
        for slot, m_type in self.MEAL_TYPE_MAP.items():
            if m_type not in type_to_slots:
                type_to_slots[m_type] = []
            type_to_slots[m_type].append(slot)

        # 2. Call Spoonacular once per unique type
        for m_type, slots in type_to_slots.items():
            # If multiple slots share a type (like Lunch/Dinner), fetch more recipes
            num_to_fetch = 15 * len(slots)

            results = await self.spoonacular_client.search_recipes(
                type=m_type,
                number=num_to_fetch,
                constraints=dietary_constraints,
            )
            recipes = [self._convert_to_recipe(r) for r in results]

            # Distribute recipes among the requesting slots
            # (Note: In _assign_recipes_from_pool we handle variety by using a set)
            for slot in slots:
                pool[slot] = recipes

        return pool

    def _assign_recipes_from_pool(
        self, daily_plans: list[DailyMealPlan], pool: dict[MealSlot, list[Recipe]]
    ):
        """
        Assigns recipes from the pool to the plans, handling leftovers and variety.
        """
        used_recipe_ids = set()
        # Map to track planned leftovers: (Day, MealSlot) -> Recipe
        recipe_manifest: dict[tuple[Day, MealSlot], Recipe] = {}

        for plan in daily_plans:
            for slot in plan.slots:
                if slot.is_leftover:
                    # Look up the source recipe using the manifest
                    source_day = slot.leftover_from_day
                    source_slot = slot.leftover_from_slot
                    if source_day and source_slot:
                        source_recipe = recipe_manifest.get((source_day, source_slot))
                        if source_recipe:
                            slot.plan = MealOption(main_recipe=source_recipe)
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

                    # Store in manifest just in case it's used as a source later
                    recipe_manifest[(plan.day, slot.slot_name)] = main

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
