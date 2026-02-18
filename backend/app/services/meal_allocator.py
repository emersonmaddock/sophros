from datetime import time

from app.schemas.meal_plan import (
    DailyMealPlan,
    MealDistributionConfig,
    MealSlot,
    MealSlotTarget,
)
from app.schemas.nutrient import DRIOutput
from app.schemas.user import UserSchedule


def _time_to_mins(t: time) -> int:
    return t.hour * 60 + t.minute


def _mins_to_time(mins: int) -> time:
    return time(mins // 60, mins % 60)


class MealAllocator:
    # Standard time ranges for meal types (24h)
    SEARCH_WINDOWS = {
        MealSlot.BREAKFAST: (time(6, 0), time(10, 0)),
        MealSlot.LUNCH: (time(11, 0), time(14, 0)),
        MealSlot.DINNER: (time(18, 0), time(21, 0)),
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
    ) -> time | None:
        """
        Finds the first available 30-min window within the standard range for the slot.
        Returns a datetime.time object, or None if no slot found.
        """
        window_start_t, window_end_t = cls.SEARCH_WINDOWS.get(
            slot, (time(8, 0), time(20, 0))
        )

        window_start = _time_to_mins(window_start_t)
        window_end = _time_to_mins(window_end_t)

        # Parse busy times for the day
        busy_intervals = []
        for busy in schedule.busy_times:
            if busy.day.lower() == day.lower() or busy.day.lower() == "everyday":
                busy_intervals.append(
                    (_time_to_mins(busy.start), _time_to_mins(busy.end))
                )

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
                    # Jump forward to end of busy slot to optimize search
                    current_time = max(current_time, b_end)
                    break

            if not conflict:
                return _mins_to_time(current_time)

        return None  # No slot found
