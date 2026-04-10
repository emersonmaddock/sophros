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

        # 2. Calculate free time per day
        all_days = list(Day)
        day_gaps: dict[Any, int] = {}
        for day, schedule in schedules.items():
            busy_mins = sum(
                (b.end.hour * 60 + b.end.minute) - (b.start.hour * 60 + b.start.minute)
                for b in schedule.busy_times
            )
            day_gaps[day] = 960 - busy_mins  # ~16 wake hours

        # Split target sessions into weight lifting vs cardio counts
        n_cardio = round(base_sessions * cardio_ratio)
        n_weights = base_sessions - n_cardio

        # Candidate days sorted by free time (most free first)
        candidate_days = sorted(
            [d for d in all_days if day_gaps[d] >= 60],
            key=lambda d: day_gaps[d],
            reverse=True,
        )

        # -- Weight lifting placement: maximise spacing --
        # Measures circular distance between two day indices (Mon=0 … Sun=6)
        def circ_dist(i: int, j: int) -> int:
            d = abs(i - j)
            return min(d, 7 - d)

        def min_dist_to_placed(idx: int, placed: list[int]) -> int:
            if not placed:
                return 7
            return min(circ_dist(idx, p) for p in placed)

        weight_days: list[Any] = []
        remaining = list(candidate_days)

        for _ in range(n_weights):
            if not remaining:
                break
            if not weight_days:
                chosen = remaining[0]  # First: most free time
            else:
                placed_indices = [all_days.index(d) for d in weight_days]
                # Pick day that maximises min-distance to existing weight days;
                # break ties by free time (already sorted desc)
                chosen = max(
                    remaining,
                    key=lambda d: (
                        min_dist_to_placed(all_days.index(d), placed_indices),
                        day_gaps[d],
                    ),
                )
            weight_days.append(chosen)
            remaining.remove(chosen)

        # -- Cardio placement: most free remaining days --
        cardio_days = [d for d in candidate_days if d not in weight_days][:n_cardio]

        # 3. Build the weekly plan
        def _make_rec(day: Any, category: ExerciseCategory) -> ExerciseRecommendation:
            duration = 60 if day_gaps[day] > 180 else 30
            cals = duration * (10 if category == ExerciseCategory.CARDIO else 5)
            muscle = 0.02 if category == ExerciseCategory.WEIGHT_LIFTING else 0.0
            return ExerciseRecommendation(
                category=category,
                duration_minutes=duration,
                calories_burned=cals,
                muscle_gain_estimate_kg=muscle,
            )

        for day in weight_days:
            weekly_plan[day] = _make_rec(day, ExerciseCategory.WEIGHT_LIFTING)
        for day in cardio_days:
            weekly_plan[day] = _make_rec(day, ExerciseCategory.CARDIO)

        return weekly_plan
