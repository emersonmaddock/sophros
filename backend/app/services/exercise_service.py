from datetime import time as time_type
from typing import Any

from pydantic import BaseModel

from app.domain.enums import ExerciseCategory


class ExerciseRecommendation(BaseModel):
    category: ExerciseCategory
    duration_minutes: int
    time: time_type | None = None
    calories_burned: int = 0
    muscle_gain_estimate_kg: float = 0.0


class ExercisePlanService:
    @staticmethod
    def generate_weekly_plan(
        user: Any,  # app.schemas.user.User
        schedules: dict[Any, Any],  # Day: UserSchedule
    ) -> dict[Any, ExerciseRecommendation | None]:
        """
        Generates a 7-day exercise plan based on weight and body fat goals.
        """
        from app.domain.enums import Day, ExerciseCategory

        weekly_plan: dict[Any, ExerciseRecommendation | None] = {
            day: None for day in Day
        }

        # 1. Determine Frequency and Type Mix based on Goals
        current_weight = user.weight
        target_weight = user.target_weight or current_weight
        target_bf = user.target_body_fat

        weight_diff = abs(target_weight - current_weight)

        # Determine Ratio of Cardio vs Weight Lifting
        if target_weight < current_weight:
            # Focus: Fat Loss
            cardio_ratio = 0.7
            if (
                target_bf and target_bf < 15
            ):  # Leaner goals need more weights to preserve muscle
                cardio_ratio = 0.5
            base_sessions = 4 if weight_diff > 5 else 3
        elif target_weight > current_weight:
            # Focus: Muscle Gain
            cardio_ratio = 0.2
            base_sessions = 4
        else:
            # Maintenance
            cardio_ratio = 0.5
            base_sessions = 3

        # 2. Distribute sessions across the week based on schedule gaps
        # We'll calculate total free time minutes per day (rough estimate)
        day_gaps = {}
        for day, schedule in schedules.items():
            busy_mins = sum(
                (
                    (b.end.hour * 60 + b.end.minute)
                    - (b.start.hour * 60 + b.start.minute)
                )
                for b in schedule.busy_times
            )
            # Rough estimate of available wake minutes (16 hours = 960 mins)
            day_gaps[day] = 960 - busy_mins

        # Sort days by free time to place sessions
        sorted_days = sorted(list(Day), key=lambda d: day_gaps[d], reverse=True)

        sessions_placed = 0
        for day in sorted_days:
            if sessions_placed >= base_sessions:
                break

            # Skip if day is extremely busy (< 60 mins gap)
            if day_gaps[day] < 60:
                continue

            # Determine category for this session based on current mix
            category = (
                ExerciseCategory.CARDIO
                if (sessions_placed / base_sessions) < cardio_ratio
                else ExerciseCategory.WEIGHT_LIFTING
            )

            # Duration based on available gap
            duration = 60 if day_gaps[day] > 180 else 30

            # Physiological Estimates (General Estimates)
            # Cardio: ~10 cal/min for average person
            # Weights: ~5 cal/min + muscle gain estimate
            cals = duration * (10 if category == ExerciseCategory.CARDIO else 5)
            # Muscle gain estimate: ~0.02kg per intense session for beginners
            muscle = 0.02 if category == ExerciseCategory.WEIGHT_LIFTING else 0.0

            weekly_plan[day] = ExerciseRecommendation(
                category=category,
                duration_minutes=duration,
                calories_burned=cals,
                muscle_gain_estimate_kg=muscle,
            )
            sessions_placed += 1

        return weekly_plan
