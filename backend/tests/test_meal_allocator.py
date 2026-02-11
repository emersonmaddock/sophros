from app.schemas.meal_plan import MealDistributionConfig, MealSlot
from app.schemas.nutrient import DRIOutput, NutrientRange
from app.schemas.user import BusyTime, UserSchedule
from app.services.meal_allocator import MealAllocator


def test_allocate_standard_distribution():
    # Setup Daily Targets
    daily = DRIOutput(
        calories=NutrientRange(min=1800, target=2000, max=2200),
        protein=NutrientRange(min=100, target=150, max=200),
        carbohydrates=NutrientRange(min=200, target=250, max=300),
        fat=NutrientRange(min=50, target=70, max=90),
    )

    # 30/40/30 split
    config = MealDistributionConfig(
        slots={"Breakfast": 0.3, "Lunch": 0.4, "Dinner": 0.3}
    )

    plan = MealAllocator.allocate_targets(daily, config)

    assert len(plan.slots) == 3

    # Check Breakfast (30% of 2000 = 600)
    breakfast = next(s for s in plan.slots if s.slot_name == MealSlot.BREAKFAST)
    assert breakfast.calories == 600
    assert breakfast.protein == 45  # 30% of 150

    # Verify Sums (Allowing for small rounding differences of +/- 1 per slot)
    sum_calories = sum(s.calories for s in plan.slots)
    sum_protein = sum(s.protein for s in plan.slots)

    # 600 + 800 + 600 = 2000
    assert sum_calories == 2000
    assert sum_protein == 150


def test_allocate_uneven_split():
    # Test with integers that might round down
    daily = DRIOutput(
        calories=NutrientRange(min=0, target=1000, max=2000),
        protein=NutrientRange(min=0, target=100, max=200),
        carbohydrates=NutrientRange(min=0, target=100, max=200),
        fat=NutrientRange(min=0, target=100, max=200),
    )

    # 33/33/34 split using valid Slots
    config = MealDistributionConfig(
        slots={"Breakfast": 0.33, "Lunch": 0.33, "Dinner": 0.34}
    )

    plan = MealAllocator.allocate_targets(daily, config)

    sum_calories = sum(s.calories for s in plan.slots)
    # 330 + 330 + 340 = 1000
    assert sum_calories == 1000


def test_allocate_with_schedule():
    # Setup Daily Targets
    daily = DRIOutput(
        calories=NutrientRange(min=1800, target=2000, max=2200),
        protein=NutrientRange(min=100, target=150, max=200),
        carbohydrates=NutrientRange(min=200, target=250, max=300),
        fat=NutrientRange(min=50, target=70, max=90),
    )

    # Schedule: Busy during standard Breakfast start (08:00-09:00)
    # Default Breakfast search is 06:00-10:00.
    # Helper starts at 06:00.
    # Let's block 06:00 to 09:00 completely.
    schedule = UserSchedule(
        busy_times=[BusyTime(day="Monday", start="06:00", end="09:00")]
    )

    plan = MealAllocator.allocate_targets(daily, user_schedule=schedule, day="Monday")

    breakfast = next(s for s in plan.slots if s.slot_name == MealSlot.BREAKFAST)

    # Should be at 09:00 or later
    assert breakfast.time is not None
    assert breakfast.time >= "09:00"
    assert breakfast.time <= "10:00"

    # Test Dinner conflict
    # Dinner Window: 18:00-21:00
    # Busy: 18:00-19:30
    schedule.busy_times.append(BusyTime(day="Monday", start="18:00", end="19:30"))

    plan_conflict = MealAllocator.allocate_targets(
        daily, user_schedule=schedule, day="Monday"
    )
    dinner = next(s for s in plan_conflict.slots if s.slot_name == MealSlot.DINNER)

    assert dinner.time is not None
    assert dinner.time >= "19:30"
