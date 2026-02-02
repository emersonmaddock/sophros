from app.schemas.meal_plan import DailyMealPlan, MealDistributionConfig, MealSlotTarget
from app.schemas.nutrient import DRIOutput


class MealAllocator:
    @staticmethod
    @staticmethod
    def allocate_targets(
        daily_targets: DRIOutput, config: MealDistributionConfig | None = None
    ) -> DailyMealPlan:
        """
        Distributes the daily nutritional targets into meal slots based on the
        provided configuration.
        """
        if config is None:
            config = MealDistributionConfig()

        slots_output = []

        # We use the 'target' value from the DRIOutput ranges
        daily_cal = daily_targets.calories.target
        daily_prot = daily_targets.protein.target
        daily_carbs = daily_targets.carbohydrates.target
        daily_fat = daily_targets.fat.target

        total_distribution = sum(config.slots.values())
        if abs(total_distribution - 1.0) > 0.01:
            # Basic validation, though in production we might just normalize
            pass

        # config.slots keys are strings from the JSON/Dict, we map them to MealSlot
        # Assuming the keys match the MealSlot values (e.g. "Breakfast")
        from app.schemas.meal_plan import MealSlot

        for slot_name_str, percentage in config.slots.items():
            # Try to match string to Enum
            # Case-insensitive match if needed, but Enum value is usually robust
            # Let's assume exact match to Enum value
            slot_enum = MealSlot(slot_name_str)

            slots_output.append(
                MealSlotTarget(
                    slot_name=slot_enum,
                    calories=int(daily_cal * percentage),
                    protein=int(daily_prot * percentage),
                    carbohydrates=int(daily_carbs * percentage),
                    fat=int(daily_fat * percentage),
                )
            )

        return DailyMealPlan(
            slots=slots_output,
            total_calories=daily_cal,
            total_protein=daily_prot,
            total_carbs=daily_carbs,
            total_fat=daily_fat,
        )
