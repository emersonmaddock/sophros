import asyncio
import logging
import random
from datetime import time
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

logger = logging.getLogger(__name__)


class MealPlanService:
    """
    Orchestrates the full meal plan generation pipeline.

    Uses batch recipe fetching: 2 API calls (breakfast pool + main course pool)
    instead of one call per slot, then distributes recipes locally.
    Integrates exercise planning and adaptive leftover logic for weekly plans.
    """

    # Mapping from our MealSlot enum to Spoonacular meal types
    MEAL_TYPE_MAP = {
        MealSlot.BREAKFAST: MealType.BREAKFAST,
        MealSlot.LUNCH: MealType.MAIN_COURSE,
        MealSlot.DINNER: MealType.MAIN_COURSE,
    }

    def __init__(self, spoonacular_client: SpoonacularClient | None = None):
        self.spoonacular_client = spoonacular_client or SpoonacularClient()

    @staticmethod
    def _build_dietary_constraints(user: User) -> DietaryConstraints:
        """Extract DietaryConstraints from a User profile."""
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

    async def _fetch_recipe_pool(
        self,
        meal_type: MealType,
        slot_calories: int,
        constraints: DietaryConstraints,
        count: int,
        max_prep_time: int | None = None,
    ) -> list[dict]:
        """
        Fetch a pool of recipes for a given meal type and calorie target.

        Uses ±30% calorie tolerance. Results are shuffled locally for variety
        instead of using sort="random" on every API call.

        Args:
            meal_type: Type of meal (breakfast, main course, etc.)
            slot_calories: Target calorie count
            constraints: Dietary constraints
            count: Number of recipes to fetch
            max_prep_time: Optional max prep time in minutes (e.g., 20 for breakfast)
        """
        tolerance = 0.30
        min_cals = int(slot_calories * (1 - tolerance))
        max_cals = int(slot_calories * (1 + tolerance))

        logger.info(
            "Fetching recipe pool: type=%s, %d-%d cal, count=%d, max_prep=%s",
            meal_type,
            min_cals,
            max_cals,
            count,
            max_prep_time,
        )

        results = await self.spoonacular_client.search_recipes(
            type=meal_type,
            min_calories=min_cals,
            max_calories=max_cals,
            constraints=constraints,
            number=count,
        )

        # Filter by prep time if specified (for breakfast quick meals)
        if max_prep_time is not None:
            results = [
                r
                for r in results
                if (ready_in := r.get("readyInMinutes")) is None
                or ready_in <= max_prep_time
            ]

        random.shuffle(results)
        return results

    @staticmethod
    def _assign_slot_recipes(
        slot: MealSlotTarget,
        pool: list[dict],
        used_ids: set[int],
    ) -> MealSlotTarget:
        """
        Assign a primary recipe and up to 2 alternatives from the pool.

        - Primary: first unused recipe (added to used_ids globally)
        - Alternatives: next unused-within-slot recipes (NOT added to used_ids)
        - Raises ValueError if no unused primary is available
        - Sets slot.plan as MealOption and slot.prep_time_minutes
        """
        candidates: list[dict] = []
        for item in pool:
            rid = item.get("id")
            if rid not in used_ids and rid not in [c.get("id") for c in candidates]:
                candidates.append(item)
                if len(candidates) >= 3:
                    break

        if not candidates:
            raise ValueError(
                f"No unused recipes available for {slot.slot_name}. "
                f"Pool exhausted ({len(pool)} recipes, {len(used_ids)} used)."
            )

        if len(candidates) < 3:
            logger.warning(
                "Only %d candidate(s) for %s (wanted 3)",
                len(candidates),
                slot.slot_name,
            )

        # First candidate is primary — track globally
        primary = candidates[0]
        used_ids.add(primary["id"])

        main_recipe = MealPlanService._convert_to_recipe(primary)
        alternatives = [MealPlanService._convert_to_recipe(c) for c in candidates[1:]]

        slot.plan = MealOption(main_recipe=main_recipe, alternatives=alternatives)
        slot.prep_time_minutes = main_recipe.preparation_time_minutes or 30

        # Enforce breakfast prep time limit (should never exceed 20 min)
        if slot.slot_name == MealSlot.BREAKFAST and slot.prep_time_minutes > 20:
            slot.prep_time_minutes = 20

        logger.info(
            "Assigned %s: primary=%s, %d alternatives, prep_time=%d min",
            slot.slot_name,
            main_recipe.title,
            len(alternatives),
            slot.prep_time_minutes,
        )

        return slot

    async def generate_daily_plan(
        self, user: User, day: Day = Day.MONDAY
    ) -> DailyMealPlan:
        """
        Generates a complete daily meal plan for the user.

        Uses 2 API calls: one for breakfast pool, one for main course pool.
        Recipes are distributed across slots with uniqueness tracking.
        """
        daily_targets = NutrientCalculator.calculate_targets(
            age=user.age,
            gender=user.gender,
            weight_kg=user.weight,
            height_cm=user.height,
            activity_level=user.activity_level,
        )

        user_schedule = self._get_user_schedule(user, day)
        meal_plan = MealAllocator.allocate_targets(
            daily_targets=daily_targets,
            user_schedule=user_schedule,
            day=day,
        )

        constraints = self._build_dietary_constraints(user)

        # Find representative calorie targets for each pool
        breakfast_slot = next(
            s for s in meal_plan.slots if s.slot_name == MealSlot.BREAKFAST
        )
        main_slot = next(
            s
            for s in meal_plan.slots
            if s.slot_name in (MealSlot.LUNCH, MealSlot.DINNER)
        )

        # 2 parallel API calls
        breakfast_pool, main_pool = await asyncio.gather(
            self._fetch_recipe_pool(
                MealType.BREAKFAST, breakfast_slot.calories, constraints, count=5
            ),
            self._fetch_recipe_pool(
                MealType.MAIN_COURSE, main_slot.calories, constraints, count=10
            ),
        )

        # Distribute recipes across slots
        used_ids: set[int] = set()
        for slot in meal_plan.slots:
            pool = breakfast_pool if slot.slot_name == MealSlot.BREAKFAST else main_pool
            self._assign_slot_recipes(slot, pool, used_ids)

        return meal_plan

    async def generate_weekly_plan(self, user: User) -> WeeklyMealPlan:
        """
        Generates a 7-day meal plan with exercise planning and leftover logic.

        1. Generates a weekly exercise plan once.
        2. Calculates daily nutrient targets factoring in exercise calories.
        3. Allocates slots and applies adaptive leftover logic.
        4. Batch-fetches recipe pools (2 API calls total).
        5. Assigns recipes from pools, respecting leftovers.
        """
        # Pre-calculate schedules for the whole week
        weekly_schedules = {day: self._get_user_schedule(user, day) for day in Day}

        # Step 1: Generate Weekly Exercise Plan (One-time call)
        exercise_plan = ExercisePlanService.generate_weekly_plan(user, weekly_schedules)

        # Step 2: Initial allocation for 7 days
        daily_plans: list[DailyMealPlan] = []
        for day in Day:
            exercise_rec = exercise_plan.get(day)
            exercise_cals = exercise_rec.calories_burned if exercise_rec else 0

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

            # Schedule the exercise time if it exists
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

        # Step 4: Batch Fetch Recipe Pools (2 API calls)
        constraints = self._build_dietary_constraints(user)

        # Use first day's slots for representative calorie targets
        # Fallback to defaults if for some reason slots are missing
        first_plan = daily_plans[0]

        # Helper to find slot with fallback
        def _get_cal_target(slots, target_names, default_ratio):
            found = next((s for s in slots if s.slot_name in target_names), None)
            if found:
                return found.calories
            return int(user.weight * 30 * default_ratio)  # Very crude fallback

        breakfast_cals = _get_cal_target(first_plan.slots, [MealSlot.BREAKFAST], 0.25)
        main_cals = _get_cal_target(
            first_plan.slots, [MealSlot.LUNCH, MealSlot.DINNER], 0.35
        )

        breakfast_pool, main_pool = await asyncio.gather(
            self._fetch_recipe_pool(
                MealType.BREAKFAST,
                breakfast_cals,
                constraints,
                count=15,
                max_prep_time=30,
            ),
            self._fetch_recipe_pool(
                MealType.MAIN_COURSE, main_cals, constraints, count=50
            ),
        )

        if not breakfast_pool:
            raise ValueError(
                "No breakfast recipes found matching your dietary preferences."
            )

        # Breakfast rotates through 3 recipes across all 7 days (allows repeats)
        breakfast_rotation = breakfast_pool[: min(3, len(breakfast_pool))]
        breakfast_idx = 0

        # Step 5: Assign recipes from pools, respecting leftovers
        used_ids: set[int] = set()
        recipe_manifest: dict[tuple[Day, MealSlot], Recipe] = {}

        for plan in daily_plans:
            for slot in plan.slots:
                if slot.is_leftover:
                    # Look up the source recipe from the manifest
                    source_day = slot.leftover_from_day
                    source_slot = slot.leftover_from_slot
                    if source_day and source_slot:
                        source_recipe = recipe_manifest.get((source_day, source_slot))
                        if source_recipe:
                            slot.plan = MealOption(main_recipe=source_recipe)
                            slot.prep_time_minutes = 5  # Just reheating
                            continue

                if slot.slot_name == MealSlot.BREAKFAST:
                    # Cycle through the 3 breakfast recipes (repeats allowed)
                    recipe_data = breakfast_rotation[
                        breakfast_idx % len(breakfast_rotation)
                    ]
                    breakfast_idx += 1
                    recipe = self._convert_to_recipe(recipe_data)
                    slot.plan = MealOption(main_recipe=recipe)
                    slot.prep_time_minutes = min(
                        recipe.preparation_time_minutes or 15, 20
                    )
                else:
                    self._assign_slot_recipes(slot, main_pool, used_ids)
                    # Store in manifest for potential leftover lookups
                    if slot.plan and slot.plan.main_recipe:
                        recipe_manifest[(plan.day, slot.slot_name)] = (
                            slot.plan.main_recipe
                        )

        total_weekly_cals = sum(p.total_calories for p in daily_plans)
        return WeeklyMealPlan(
            daily_plans=daily_plans, total_weekly_calories=total_weekly_cals
        )

    def _apply_adaptive_leftovers(self, daily_plans: list[DailyMealPlan], user: User):
        """
        Leftover Logic (LUNCH & DINNER ONLY):
        1. Breakfast: Always fresh, never leftovers, uses short prep times
        2. Lunch/Dinner: Can create leftovers for the next day
        3. Maximized Efficiency: Every 'Cook' event creates exactly 2 portions
        4. Priority: Pairs 'Free' cook windows with 'Busy' (time is None) slots first
        """
        all_slots: list[dict[str, Any]] = []
        for plan in daily_plans:
            for slot in plan.slots:
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

            # *** NEW: Skip breakfast entirely from leftover pairing ***
            # Breakfast should always be fresh (same-day only)
            if item["is_breakfast"]:
                item["is_assigned"] = True
                continue

            if current_slot.time is None:
                item["is_assigned"] = True
                continue

            # This is a "COOK" slot for LUNCH or DINNER. Find a "LEFTOVER" partner.
            # Priority 1: Busy slots of the same category (lunch or dinner)
            found_partner = False
            for j in range(i + 1, len(all_slots)):
                partner = all_slots[j]
                if partner["is_assigned"]:
                    continue
                if partner["day"] == item["day"]:
                    continue
                # Both should be lunch/dinner (not breakfast)
                if partner["is_breakfast"]:
                    continue
                if partner["slot"].time is None:
                    self._pair_slots(item, partner)
                    found_partner = True
                    break

            # Priority 2: Next available of same meal type (lunch/dinner)
            if not found_partner:
                for j in range(i + 1, len(all_slots)):
                    partner = all_slots[j]
                    if partner["is_assigned"]:
                        continue
                    if partner["day"] == item["day"]:
                        continue
                    # Both should be lunch/dinner (not breakfast)
                    if partner["is_breakfast"]:
                        continue
                    self._pair_slots(item, partner)
                    found_partner = True
                    break

            item["is_assigned"] = True

    def _pair_slots(self, cook_item, leftover_item):
        """Helper to link two portions."""
        leftover_slot = leftover_item["slot"]
        cook_slot = cook_item["slot"]

        leftover_slot.is_leftover = True
        leftover_slot.leftover_from_day = cook_item["day"]
        leftover_slot.leftover_from_slot = cook_slot.slot_name
        leftover_item["is_assigned"] = True

    def _get_user_schedule(self, user: User, day: Day) -> UserSchedule:
        """
        Converts busy times into a UserSchedule for the allocator.
        Prefers explicit user_busy_times (relational) over
        ScheduleItem-derived times.
        """
        busy_times = []

        # Access busy_times (Schema property)
        # Check if user is a Pydantic model or ORM model
        is_pydantic = not hasattr(user, "__dict__") or isinstance(user, User)

        if is_pydantic:
            # We are using the UserRead/UserBase schema
            source_busy = getattr(user, "busy_times", [])
            for bt in source_busy:
                if bt.day == day:
                    # Schema uses 'start', 'end'
                    busy_times.append(BusyTime(day=day, start=bt.start, end=bt.end))
        elif hasattr(user, "user_busy_times"):
            # We are using the ORM model (fallback)
            for bt in user.user_busy_times:
                if bt.day == day:
                    # Model uses 'start_time', 'end_time'
                    busy_times.append(
                        BusyTime(day=day, start=bt.start_time, end=bt.end_time)
                    )
        else:
            # Fallback: derive from ScheduleItem records
            # Explicitly check schedules before looping
            schedules = getattr(user, "schedules", []) or []
            for item in schedules:
                if item.date.strftime("%A") == day:
                    from datetime import timedelta

                    start_time = item.date.time()
                    end_dt = item.date + timedelta(minutes=item.duration_minutes)
                    end_time = end_dt.time()

                    busy_times.append(BusyTime(day=day, start=start_time, end=end_time))

        return UserSchedule(
            busy_times=busy_times,
            wake_up_time=user.wake_up_time or time(7, 0),
            sleep_time=user.sleep_time or time(23, 0),
        )

    @staticmethod
    def _convert_to_recipe(spoon_data: dict) -> Recipe:
        """
        Converts Spoonacular API response to Recipe Pydantic model.
        """
        nutrition = spoon_data.get("nutrition", {})
        nutrients_list = nutrition.get("nutrients", [])

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

        ingredients = []
        extended_ingredients = spoon_data.get("extendedIngredients", [])
        for ing in extended_ingredients:
            ingredients.append(ing.get("original", ""))

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
