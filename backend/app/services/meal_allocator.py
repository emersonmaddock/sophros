from datetime import time
from typing import Any

from app.domain.enums import Day, MealSlot
from app.schemas.meal_plan import (
    DailyMealPlan,
    MealDistributionConfig,
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

    # Default meal times when no user schedule is provided
    DEFAULT_TIMES = {
        MealSlot.BREAKFAST: time(7, 30),
        MealSlot.LUNCH: time(12, 30),
        MealSlot.DINNER: time(19, 0),
    }

    @classmethod
    def allocate_targets(
        cls,
        daily_targets: DRIOutput,
        config: MealDistributionConfig | None = None,
        user_schedule: UserSchedule | None = None,
        day: Day = Day.MONDAY,
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

        for slot_name_str, percentage in config.slots.items():
            # Try to match string to Enum
            slot_enum = MealSlot(slot_name_str)

            # Determine Time — use schedule if available, otherwise defaults
            meal_time = None
            if user_schedule:
                meal_time = cls._find_time_for_slot(slot_enum, user_schedule, day)

            # If still no time, or scheduler failed, use fixed default
            if meal_time is None:
                meal_time = cls.DEFAULT_TIMES.get(slot_enum)

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
            day=day,
            slots=slots_output,
            total_calories=daily_cal,
            total_protein=daily_prot,
            total_carbs=daily_carbs,
            total_fat=daily_fat,
        )

    @classmethod
    def _find_time_for_slot(
        cls, slot: MealSlot, schedule: UserSchedule, day: Day
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

        # Clamp window to waking hours
        wake_mins = _time_to_mins(schedule.wake_up_time)
        sleep_mins = _time_to_mins(schedule.sleep_time)

        # Handle typical day (sleep after wake)
        if sleep_mins > wake_mins:
            actual_start = max(window_start, wake_mins)
            actual_end = min(window_end, sleep_mins)
        else:
            # Sleep crosses midnight (e.g., wake 7 AM, sleep 1 AM)
            # For meal planning, we assume meals are between wake and sleep
            # within the same "active day"
            actual_start = max(window_start, wake_mins)
            actual_end = window_end  # window_end is typically before midnight anyway

        # Parse busy times for the day
        busy_intervals = []
        for busy in schedule.busy_times:
            if busy.day.lower() == day.lower() or busy.day.lower() == "everyday":
                busy_intervals.append(
                    (_time_to_mins(busy.start), _time_to_mins(busy.end))
                )

        # Sort busy intervals by start time for the jumping logic to work correctly
        busy_intervals.sort(key=lambda x: x[0])

        current_time = actual_start
        duration = 30

        while current_time + duration <= actual_end:
            prev_time = current_time
            # check conflict
            conflict = False
            slot_end = current_time + duration

            for b_start, b_end in busy_intervals:
                # If overlap: (StartA <= EndB) and (EndA >= StartB)
                if current_time < b_end and slot_end > b_start:
                    conflict = True
                    current_time = max(current_time, b_end)
                    break

            if not conflict:
                return _mins_to_time(current_time)

            # Move forward - either to end of conflict or by 15 min fallback
            # Absolute safety check: if we didn't move forward through jump,
            # we use a manual increment
            if current_time <= prev_time:
                current_time += 15

        return None  # No slot found

    @classmethod
    def allocate_exercise_time(
        cls,
        recommendation: Any,  # ExerciseRecommendation
        user_schedule: UserSchedule,
        day: Day,
        meal_times: list[time],
    ) -> time | None:
        """
        Finds an available window for exercise, avoiding proximity to meals.
        """
        # Standard exercise window (e.g. 6am to 9pm)
        start_bound = _time_to_mins(time(6, 0))
        end_bound = _time_to_mins(time(21, 0))

        busy_intervals = []
        for busy in user_schedule.busy_times:
            if busy.day.lower() == day.lower() or busy.day.lower() == "everyday":
                busy_intervals.append(
                    (_time_to_mins(busy.start), _time_to_mins(busy.end))
                )

        # Add meal times as busy (plus 1 hour buffer for digestion/rest)
        for m_time in meal_times:
            if m_time:
                m_mins = _time_to_mins(m_time)
                busy_intervals.append((m_mins - 60, m_mins + 60))

        # Re-sort to include meals
        busy_intervals.sort(key=lambda x: x[0])

        current_time = start_bound
        duration = recommendation.duration_minutes

        while current_time + duration <= end_bound:
            prev_time = current_time
            conflict = False
            slot_end = current_time + duration
            for b_start, b_end in busy_intervals:
                if current_time < b_end and slot_end > b_start:
                    conflict = True
                    current_time = max(current_time, b_end)
                    break

            if not conflict:
                return _mins_to_time(current_time)

            if current_time <= prev_time:
                current_time += 15  # Check every 15 mins

        return None
