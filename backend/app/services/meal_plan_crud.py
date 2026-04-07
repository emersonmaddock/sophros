"""Service layer for decomposing / reassembling WeeklyMealPlan <-> relational rows."""

from __future__ import annotations

from collections import defaultdict
from typing import TYPE_CHECKING

from app.models.planned_event import MealDetail, PlannedEvent, WorkoutDetail

if TYPE_CHECKING:
    from app.models.saved_meal_plan import SavedMealPlan
    from app.schemas.meal_plan import WeeklyMealPlan


# ---------------------------------------------------------------------------
# Decompose: WeeklyMealPlan schema -> PlannedEvent model instances
# ---------------------------------------------------------------------------


def decompose_weekly_plan(
    plan_data: WeeklyMealPlan,
    meal_plan_id: int,
) -> list[PlannedEvent]:
    """Convert a ``WeeklyMealPlan`` Pydantic schema into ORM model instances.

    Returns a flat list of ``PlannedEvent`` objects (with attached detail
    objects) ready to be added to the session.
    """
    events: list[PlannedEvent] = []

    for daily in plan_data.daily_plans:
        # --- Meal slots ---
        for slot in daily.slots:
            recipe = slot.plan.main_recipe if slot.plan else None

            # Prefer recipe nutrients when available; fall back to slot targets
            if recipe:
                calories = recipe.nutrients.calories
                protein = recipe.nutrients.protein
                carbohydrates = recipe.nutrients.carbohydrates
                fat = recipe.nutrients.fat
            else:
                calories = slot.calories
                protein = slot.protein
                carbohydrates = slot.carbohydrates
                fat = slot.fat

            event = PlannedEvent(
                meal_plan_id=meal_plan_id,
                day=daily.day,
                event_type="meal",
                time=slot.time,
                title=recipe.title if recipe else slot.slot_name,
                duration_minutes=slot.prep_time_minutes or None,
            )

            alternatives_json = [
                alt.model_dump(mode="json")
                for alt in (slot.plan.alternatives if slot.plan else [])
            ]

            meal_detail = MealDetail(
                slot_name=slot.slot_name,
                calories=calories,
                protein=protein,
                carbohydrates=carbohydrates,
                fat=fat,
                prep_time_minutes=slot.prep_time_minutes,
                is_leftover=slot.is_leftover,
                leftover_from_day=slot.leftover_from_day,
                leftover_from_slot=slot.leftover_from_slot,
                recipe_id=recipe.id if recipe else None,
                recipe_description=recipe.description if recipe else None,
                recipe_ingredients=recipe.ingredients if recipe else None,
                recipe_tags=recipe.tags if recipe else None,
                recipe_warnings=recipe.warnings if recipe else None,
                recipe_source_url=recipe.source_url if recipe else None,
                recipe_image_url=recipe.image_url if recipe else None,
                alternatives=alternatives_json or None,
            )

            event.meal_detail = meal_detail
            events.append(event)

        # --- Exercise ---
        if daily.exercise:
            ex = daily.exercise
            event = PlannedEvent(
                meal_plan_id=meal_plan_id,
                day=daily.day,
                event_type="workout",
                time=ex.time,
                title=ex.category,
                duration_minutes=ex.duration_minutes,
            )
            workout_detail = WorkoutDetail(
                exercise_category=ex.category,
                calories_burned=ex.calories_burned,
                muscle_gain_estimate_kg=ex.muscle_gain_estimate_kg,
            )
            event.workout_detail = workout_detail
            events.append(event)

    return events


# ---------------------------------------------------------------------------
# Compute day-level macro totals from events
# ---------------------------------------------------------------------------


def compute_day_totals(
    events: list[PlannedEvent],
) -> tuple[int, int, int, int]:
    """Return ``(total_calories, total_protein, total_carbs, total_fat)``
    computed from the meal/workout detail rows of a single day's events.
    """
    total_cal = 0
    total_pro = 0
    total_carb = 0
    total_fat = 0

    for ev in events:
        if ev.event_type == "meal" and ev.meal_detail:
            total_cal += ev.meal_detail.calories
            total_pro += ev.meal_detail.protein
            total_carb += ev.meal_detail.carbohydrates
            total_fat += ev.meal_detail.fat
        elif ev.event_type == "workout" and ev.workout_detail:
            total_cal -= ev.workout_detail.calories_burned or 0

    return total_cal, total_pro, total_carb, total_fat


# ---------------------------------------------------------------------------
# Assemble: relational rows -> response dict (SavedMealPlanResponse shape)
# ---------------------------------------------------------------------------


def event_to_response(event: PlannedEvent) -> dict:
    """Convert a PlannedEvent + details to a PlannedEventResponse dict."""
    data = {
        "id": event.id,
        "meal_plan_id": event.meal_plan_id,
        "day": event.day,
        "event_type": event.event_type,
        "time": event.time,
        "title": event.title,
        "duration_minutes": event.duration_minutes,
        "completed": event.completed,
    }
    if event.meal_detail:
        md = event.meal_detail
        data.update(
            {
                "slot_name": md.slot_name,
                "calories": md.calories,
                "protein": md.protein,
                "carbohydrates": md.carbohydrates,
                "fat": md.fat,
                "recipe_id": md.recipe_id,
            }
        )
    if event.workout_detail:
        wd = event.workout_detail
        data.update(
            {
                "exercise_category": wd.exercise_category,
                "calories_burned": wd.calories_burned,
                "muscle_gain_estimate_kg": wd.muscle_gain_estimate_kg,
            }
        )
    if event.sleep_detail:
        data.update({"target_hours": event.sleep_detail.target_hours})
    return data


def build_day_totals(events: list[PlannedEvent], day: str) -> dict:
    """Build a DayTotalsResponse dict for a specific day."""
    day_events = [e for e in events if e.day == day]
    cal, pro, carb, f = compute_day_totals(day_events)
    return {
        "day": day,
        "events": [event_to_response(e) for e in day_events],
        "total_calories": cal,
        "total_protein": pro,
        "total_carbs": carb,
        "total_fat": f,
    }


def _meal_detail_to_recipe(md: MealDetail) -> dict | None:
    """Reconstruct a ``Recipe`` dict from a ``MealDetail`` row."""
    if not md.recipe_id:
        return None
    return {
        "id": md.recipe_id,
        "title": md.event.title,  # title lives on the PlannedEvent
        "description": md.recipe_description,
        "nutrients": {
            "calories": md.calories,
            "protein": md.protein,
            "carbohydrates": md.carbohydrates,
            "fat": md.fat,
        },
        "tags": md.recipe_tags or [],
        "ingredients": md.recipe_ingredients or [],
        "warnings": md.recipe_warnings or [],
        "preparation_time_minutes": md.prep_time_minutes or None,
        "source_url": md.recipe_source_url,
        "image_url": md.recipe_image_url,
    }


def _event_to_meal_slot(ev: PlannedEvent) -> dict:
    """Convert a meal ``PlannedEvent`` back to a ``MealSlotTarget`` dict."""
    md = ev.meal_detail
    assert md is not None

    recipe_dict = _meal_detail_to_recipe(md)
    alternatives = md.alternatives or []

    plan: dict | None = None
    if recipe_dict or alternatives:
        plan = {
            "main_recipe": recipe_dict,
            "alternatives": alternatives,
        }

    return {
        "slot_name": md.slot_name,
        "calories": md.calories,
        "protein": md.protein,
        "carbohydrates": md.carbohydrates,
        "fat": md.fat,
        "time": ev.time.isoformat() if ev.time else None,
        "plan": plan,
        "is_leftover": md.is_leftover,
        "leftover_from_day": md.leftover_from_day,
        "leftover_from_slot": md.leftover_from_slot,
        "prep_time_minutes": md.prep_time_minutes,
        "event_id": ev.id,
    }


def _event_to_exercise(ev: PlannedEvent) -> dict:
    """Convert a workout ``PlannedEvent`` back to an ``ExerciseRecommendation`` dict."""
    wd = ev.workout_detail
    assert wd is not None
    return {
        "category": wd.exercise_category,
        "duration_minutes": ev.duration_minutes,
        "time": ev.time.isoformat() if ev.time else None,
        "calories_burned": wd.calories_burned,
        "muscle_gain_estimate_kg": wd.muscle_gain_estimate_kg,
        "event_id": ev.id,
    }


def assemble_week_response(plan: SavedMealPlan) -> dict:
    """Reconstruct a ``SavedMealPlanResponse``-shaped dict from a
    ``SavedMealPlan`` with eagerly-loaded events and detail rows.

    Server-computes day totals so the response is always consistent with
    the relational data.
    """
    # Group events by day
    by_day: dict[str, list[PlannedEvent]] = defaultdict(list)
    for ev in plan.events:
        by_day[ev.day].append(ev)

    daily_plans: list[dict] = []
    total_weekly_cal = 0

    for day, day_events in by_day.items():
        slots = []
        exercise = None

        for ev in day_events:
            if ev.event_type == "meal":
                slots.append(_event_to_meal_slot(ev))
            elif ev.event_type == "workout":
                exercise = _event_to_exercise(ev)

        cal, pro, carb, fat = compute_day_totals(day_events)
        total_weekly_cal += cal

        daily_plans.append(
            {
                "day": day,
                "slots": slots,
                "exercise": exercise,
                "total_calories": cal,
                "total_protein": pro,
                "total_carbs": carb,
                "total_fat": fat,
            }
        )

    return {
        "id": plan.id,
        "week_start_date": plan.week_start_date.isoformat(),
        "plan_data": {
            "daily_plans": daily_plans,
            "total_weekly_calories": total_weekly_cal,
        },
        "created_at": plan.created_at.isoformat(),
        "updated_at": plan.updated_at.isoformat(),
    }
