from app.schemas.meal_plan import (
    DailyMealPlan,
    MealDistributionConfig,
    MealSlot,
    MealSlotTarget,
)
from app.schemas.nutrient import DRIOutput
from app.schemas.user import UserSchedule


class MealAllocator:
    # Standard time ranges for meal types (24h)
    SEARCH_WINDOWS = {
        MealSlot.BREAKFAST: ("06:00", "10:00"),
        MealSlot.LUNCH: ("11:00", "14:00"),
        MealSlot.DINNER: ("18:00", "21:00"),
    }

    @classmethod
    def allocate_targets(
        cls,
        daily_targets: DRIOutput,
        config: MealDistributionConfig | None = None,
        user_schedule: UserSchedule | None = None,
        day: str = "Monday",
    ) -> DailyMealPlan:
        """
        Distributes the daily nutritional targets into meal slots based on the
        provided configuration and user schedule.
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

        for slot_name_str, percentage in config.slots.items():
            # Try to match string to Enum
            slot_enum = MealSlot(slot_name_str)

            # Determine Time
            meal_time = None
            if user_schedule:
                meal_time = cls._find_time_for_slot(slot_enum, user_schedule, day)

            slots_output.append(
                MealSlotTarget(
                    slot_name=slot_enum,
                    calories=int(daily_cal * percentage),
                    protein=int(daily_prot * percentage),
                    carbohydrates=int(daily_carbs * percentage),
                    fat=int(daily_fat * percentage),
                    time=meal_time,
                )
            )

        return DailyMealPlan(
            slots=slots_output,
            total_calories=daily_cal,
            total_protein=daily_prot,
            total_carbs=daily_carbs,
            total_fat=daily_fat,
        )

    @classmethod
    def _find_time_for_slot(
        cls, slot: MealSlot, schedule: UserSchedule, day: str
    ) -> str | None:
        """
        Finds the first available 30-min window within the standard range for the slot.
        Returns time string "HH:MM" or None if no slot found.
        """
        window_start_str, window_end_str = cls.SEARCH_WINDOWS.get(
            slot, ("08:00", "20:00")
        )

        # Convert to minutes for easier calculation
        def to_mins(t_str):
            h, m = map(int, t_str.split(":"))
            return h * 60 + m

        def to_str(mins):
            h = mins // 60
            m = mins % 60
            return f"{h:02d}:{m:02d}"

        window_start = to_mins(window_start_str)
        window_end = to_mins(window_end_str)

        # Parse busy times for the day
        busy_intervals = []
        for busy in schedule.busy_times:
            if busy.day.lower() == day.lower() or busy.day.lower() == "everyday":
                busy_intervals.append((to_mins(busy.start), to_mins(busy.end)))

        # Search for a 30 min gap
        current_time = window_start
        duration = 30

        while current_time + duration <= window_end:
            # check conflict
            conflict = False
            slot_end = current_time + duration

            for b_start, b_end in busy_intervals:
                # If overlap: (StartA <= EndB) and (EndA >= StartB)
                if current_time < b_end and slot_end > b_start:
                    conflict = True
                    # Jump forward to end of busy slot to optimize optimization
                    current_time = max(current_time, b_end)
                    break

            if not conflict:
                return to_str(current_time)

            if conflict:
                # current_time was already updated in the loop if conflict found
                pass
            else:
                # Should not reach here if no conflict, but purely strictly:
                current_time += 15  # Increment by 15 mins if no specific jump

        return None  # No slot found
