from app.schemas.meal_plan import DailyMealPlan, MealDistributionConfig, MealSlotTarget
from app.schemas.nutrient import DRIOutput


class MealAllocator:
    @staticmethod
    def allocate_targets(
        daily_targets: DRIOutput, config: MealDistributionConfig = None
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

        for slot_name, percentage in config.slots.items():
            slots_output.append(
                MealSlotTarget(
                    slot_name=slot_name,
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
