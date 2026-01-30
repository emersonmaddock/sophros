from app.schemas.meal_plan import MealDistributionConfig
from app.schemas.nutrient import DRIOutput, NutrientRange
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
        slots={"breakfast": 0.3, "lunch": 0.4, "dinner": 0.3}
    )

    plan = MealAllocator.allocate_targets(daily, config)

    assert len(plan.slots) == 3

    # Check Breakfast (30% of 2000 = 600)
    breakfast = next(s for s in plan.slots if s.slot_name == "breakfast")
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

    # 33/33/34 split
    config = MealDistributionConfig(slots={"one": 0.33, "two": 0.33, "three": 0.34})

    plan = MealAllocator.allocate_targets(daily, config)

    sum_calories = sum(s.calories for s in plan.slots)
    # 330 + 330 + 340 = 1000
    assert sum_calories == 1000
