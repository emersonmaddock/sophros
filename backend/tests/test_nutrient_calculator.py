from app.services.nutrient_calculator import DRIOutput, NutrientCalculator


def test_calculate_bmr_male():
    # Male: 10*80 + 6.25*180 - 5*30 + 5 = 1780
    bmr = NutrientCalculator.calculate_bmr(80, 180, 30, "male")
    assert bmr == 1780


def test_calculate_bmr_female():
    # Female: 10*60 + 6.25*165 - 5*25 - 161
    # 600 + 1031.25 - 125 - 161 = 1345.25 -> 1345
    bmr = NutrientCalculator.calculate_bmr(60, 165, 25, "female")
    assert bmr == 1345  # int conversion floors 1345.25


def test_calculate_tdee_sedentary():
    # BMR 1500 * 1.2 = 1800
    tdee = NutrientCalculator.calculate_tdee(1500, "sedentary")
    assert tdee == 1800


def test_calculate_tdee_active():
    # BMR 1500 * 1.725 = 2587.5 -> 2587
    tdee = NutrientCalculator.calculate_tdee(1500, "active")
    assert tdee == 2587


def test_calculate_targets_integration():
    # Test a full profile
    # Male, 30, 180, 80, Moderate (1.55)
    # BMR = 1780
    # TDEE = 1780 * 1.55 = 2759

    result = NutrientCalculator.calculate_targets(
        age=30,
        gender="male",
        weight_kg=80,
        height_cm=180,
        activity_level="moderately_active",
    )

    assert isinstance(result, DRIOutput)

    # Check Calories
    assert result.calories.target == 2759
    assert result.calories.min == 2759 - 250
    assert result.calories.max == 2759 + 250

    # Check Protein (10-35% of 2759)
    # 275.9 - 965.65 kcal
    # /4 -> 68.9 - 241.4 g -> 68 - 241 g (int truncation)
    assert result.protein.min == int(2759 * 0.10 / 4)
    assert result.protein.max == int(2759 * 0.35 / 4)

    # Check Fat (20-35% of 2759)
    # /9
    assert result.fat.min == int(2759 * 0.20 / 9)
    assert result.fat.max == int(2759 * 0.35 / 9)

    # Check Carbs (45-65% of 2759)
    # /4
    assert result.carbohydrates.min == int(2759 * 0.45 / 4)
    assert result.carbohydrates.max == int(2759 * 0.65 / 4)


def test_invalid_activity_defaults():
    # Should default to sedentary (1.2)
    bmr = 1000
    tdee = NutrientCalculator.calculate_tdee(bmr, "super_unknown_activity")
    assert tdee == 1200
