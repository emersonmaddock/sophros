from datetime import time as time_type
from itertools import combinations
from typing import Any

from pydantic import BaseModel

from app.domain.enums import ExerciseCategory


class ExerciseRecommendation(BaseModel):
    category: ExerciseCategory
    duration_minutes: int
    time: time_type | None = None
    calories_burned: int = 0
    muscle_gain_estimate_kg: float = 0.0


def _pick_spread_days(available_days: list[Any], n: int) -> list[Any]:
    """
    Pick n days from available_days that maximise the minimum gap between
    any two consecutive chosen days (Mon=0 … Sun=6).

    Iterates over all C(len,n) combinations — safe for n ≤ 4 and len ≤ 7.
    Returns the subset whose smallest consecutive gap is largest, breaking
    ties by preferring the combination whose total gap is largest.
    """
    from app.domain.enums import Day

    if n <= 0:
        return []
    if n >= len(available_days):
        return available_days[:n]

    day_list = list(Day)
    day_to_idx: dict[Any, int] = {d: i for i, d in enumerate(day_list)}
    idx_to_day: dict[int, Any] = {i: d for i, d in enumerate(day_list)}

    avail_idxs = sorted(day_to_idx[d] for d in available_days)

    best_combo: list[int] = avail_idxs[:n]
    best_min_gap = -1
    best_total_gap = -1

    for combo in combinations(avail_idxs, n):
        sorted_combo = sorted(combo)
        gaps = [sorted_combo[i + 1] - sorted_combo[i] for i in range(n - 1)]
        min_gap = min(gaps) if gaps else 7
        total_gap = sum(gaps)
        better = min_gap > best_min_gap or (
            min_gap == best_min_gap and total_gap > best_total_gap
        )
        if better:
            best_min_gap = min_gap
            best_total_gap = total_gap
            best_combo = list(sorted_combo)

    return [idx_to_day[i] for i in best_combo]


class ExercisePlanService:
    @staticmethod
    def generate_weekly_plan(
        user: Any,  # app.schemas.user.User
        schedules: dict[Any, Any],  # Day: UserSchedule
    ) -> dict[Any, ExerciseRecommendation | None]:
        """
        Generates a 7-day exercise plan based on weight and body-fat goals.

        Weight lifting sessions are distributed to maximise rest days between
        them (e.g. 2 sessions → Mon + Thu rather than Mon + Tue).
        Cardio sessions fill remaining available slots, preferring the days
        with the most free time.
        """
        from app.domain.enums import Day, ExerciseCategory

        weekly_plan: dict[Any, ExerciseRecommendation | None] = {
            day: None for day in Day
        }

        # ── 1. Determine session count and cardio/weights split ───────────────
        current_weight = user.weight
        target_weight = user.target_weight or current_weight
        weight_diff = abs(target_weight - current_weight)

        if target_weight < current_weight:
            # Fat-loss focus: mostly cardio
            cardio_ratio = 0.7
            base_sessions = 4 if weight_diff > 5 else 3
        elif target_weight > current_weight:
            # Muscle-gain focus: mostly weights
            cardio_ratio = 0.2
            base_sessions = 4
        else:
            # Maintenance: balanced
            cardio_ratio = 0.5
            base_sessions = 3

        n_cardio = round(base_sessions * cardio_ratio)
        n_weights = base_sessions - n_cardio

        # ── 2. Estimate free time per day ────────────────────────────────────
        day_gaps: dict[Any, int] = {}
        for day, schedule in schedules.items():
            busy_mins = sum(
                (b.end.hour * 60 + b.end.minute) - (b.start.hour * 60 + b.start.minute)
                for b in schedule.busy_times
            )
            # Rough available window: assume 16 waking hours (960 min)
            day_gaps[day] = 960 - busy_mins

        # ── 3. Available days (≥ 60 min free) in Mon→Sun order ───────────────
        day_order = list(Day)
        available_days = [d for d in day_order if day_gaps[d] >= 60]

        # ── 4. Place weight lifting days spread maximally apart ───────────────
        weight_days: set[Any] = set(_pick_spread_days(available_days, n_weights))

        # ── 5. Cardio on remaining available days (most free time first) ──────
        remaining = sorted(
            [d for d in available_days if d not in weight_days],
            key=lambda d: day_gaps[d],
            reverse=True,
        )
        cardio_days: set[Any] = set(remaining[:n_cardio])

        # ── 6. Assign sessions ────────────────────────────────────────────────
        for day in day_order:
            gap = day_gaps[day]
            duration = 60 if gap > 180 else 30

            if day in weight_days:
                weekly_plan[day] = ExerciseRecommendation(
                    category=ExerciseCategory.WEIGHT_LIFTING,
                    duration_minutes=duration,
                    calories_burned=duration * 5,
                    muscle_gain_estimate_kg=0.02,
                )
            elif day in cardio_days:
                weekly_plan[day] = ExerciseRecommendation(
                    category=ExerciseCategory.CARDIO,
                    duration_minutes=duration,
                    calories_burned=duration * 10,
                    muscle_gain_estimate_kg=0.0,
                )

        return weekly_plan
