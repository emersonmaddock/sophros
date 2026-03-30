from datetime import date

from app.domain.enums import ActivityLevel
from app.schemas.nutrient import DRIOutput, NutrientRange

# USDA Activity Factors
# https://goldenplains.extension.colostate.edu/wp-content/uploads/sites/56/2020/12/Basal-Metabolic-Rate-Eating-Plan.pdf
ACTIVITY_MULTIPLIERS = {
    ActivityLevel.SEDENTARY: 1.2,
    ActivityLevel.LIGHT: 1.375,
    ActivityLevel.MODERATE: 1.55,
    ActivityLevel.ACTIVE: 1.725,
    ActivityLevel.VERY_ACTIVE: 1.9,
}

# AMDR Ranges (Adults)
# Format: (min_percent, max_percent)
AMDR_RANGES = {
    "protein": (0.10, 0.35),
    "fat": (0.20, 0.35),
    "carbohydrates": (0.45, 0.65),
}

CALORIES_PER_GRAM = {
    "protein": 4,
    "fat": 9,
    "carbohydrates": 4,
}


class NutrientCalculator:
    @staticmethod
    def calculate_bmr(
        weight_kg: float, height_cm: float, age_years: int, gender: str
    ) -> int:
        """
        Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor Equation.
        """
        # Base formula: 10 * W + 6.25 * H - 5 * A
        base_bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age_years)

        if gender and gender.lower() == "male":
            return int(base_bmr + 5)
        elif gender and gender.lower() == "female":
            return int(base_bmr - 161)
        else:
            # Fallback for unspecified gender, using Female as conservative baseline
            return int(base_bmr - 161)

    @staticmethod
    def calculate_tdee(bmr: int, activity_level: ActivityLevel) -> int:
        """
        Calculate Total Daily Energy Expenditure (TDEE).
        """
        multiplier = ACTIVITY_MULTIPLIERS[activity_level]
        return int(bmr * multiplier)

    @staticmethod
    def calculate_macronutrient_ranges(tdee: int) -> dict[str, NutrientRange]:
        """
        Calculate macronutrient ranges based on TDEE and AMDR.
        Returns dictionary of NutrientRange objects.
        """
        ranges = {}

        # Calculate Protein
        p_min_cal = tdee * AMDR_RANGES["protein"][0]
        p_max_cal = tdee * AMDR_RANGES["protein"][1]
        p_target_cal = tdee * 0.225  # Midpoint

        ranges["protein"] = NutrientRange(
            min=int(p_min_cal / CALORIES_PER_GRAM["protein"]),
            max=int(p_max_cal / CALORIES_PER_GRAM["protein"]),
            target=int(p_target_cal / CALORIES_PER_GRAM["protein"]),
        )

        # Calculate Fat
        f_min_cal = tdee * AMDR_RANGES["fat"][0]
        f_max_cal = tdee * AMDR_RANGES["fat"][1]
        f_target_cal = tdee * 0.275  # Midpoint

        ranges["fat"] = NutrientRange(
            min=int(f_min_cal / CALORIES_PER_GRAM["fat"]),
            max=int(f_max_cal / CALORIES_PER_GRAM["fat"]),
            target=int(f_target_cal / CALORIES_PER_GRAM["fat"]),
        )

        # Calculate Carbs
        c_min_cal = tdee * AMDR_RANGES["carbohydrates"][0]
        c_max_cal = tdee * AMDR_RANGES["carbohydrates"][1]
        c_target_cal = tdee * 0.55  # Midpoint

        ranges["carbohydrates"] = NutrientRange(
            min=int(c_min_cal / CALORIES_PER_GRAM["carbohydrates"]),
            max=int(c_max_cal / CALORIES_PER_GRAM["carbohydrates"]),
            target=int(c_target_cal / CALORIES_PER_GRAM["carbohydrates"]),
        )

        return ranges

    @classmethod
    def calculate_targets(
        cls,
        age: int,
        gender: str,
        weight_kg: float,
        height_cm: float,
        activity_level: ActivityLevel,
        target_weight: float | None = None,
        target_date: date | None = None,
        exercise_calories: int = 0,
        target_body_fat: float | None = None,
    ) -> DRIOutput:
        bmr = cls.calculate_bmr(weight_kg, height_cm, age, gender)
        tdee = cls.calculate_tdee(bmr, activity_level)

        # Calorie Offset for Goals
        daily_offset = 0
        if target_weight is not None and target_date:
            try:
                today = date.today()
                days_to_target = (target_date - today).days

                # Avoid division by zero and handle past/today dates by assuming 1 day
                if days_to_target < 1:
                    days_to_target = 1

                weight_diff = target_weight - weight_kg
                total_kcal_diff = weight_diff * 7700  # 1kg ~ 7700kcal
                daily_offset = int(total_kcal_diff / days_to_target)

                # Safety rails: max +/- 1000 kcal offset
                daily_offset = max(-1000, min(1000, daily_offset))
            except (ValueError, TypeError, ZeroDivisionError):
                # Fallback if date is invalid or calculation fails
                pass

        # Adjust TDEE by goal offset AND calories burned from exercise today
        # We add exercise_calories because the user needs to eat back
        # some of those calories to maintain the planned deficit/surplus.
        adjusted_tdee = tdee + daily_offset + exercise_calories

        # If target body fat is lower than current estimated (not implemented),
        # we could adjust protein ratios here. For now, we'll just prioritize
        # protein if BF goal is lean.
        if target_body_fat and target_body_fat < 15:
            # Shift some carbs to protein (Advanced logic simplified)
            pass

        # Ensure floor of 1200 calories for safety
        adjusted_tdee = max(1200, adjusted_tdee)

        macros = cls.calculate_macronutrient_ranges(adjusted_tdee)

        # Calories Range: Adjusted TDEE +/- 250
        calories_range = NutrientRange(
            min=adjusted_tdee - 250,
            target=adjusted_tdee,
            max=adjusted_tdee + 250,
            unit="kcal",
        )

        return DRIOutput(
            calories=calories_range,
            protein=macros["protein"],
            carbohydrates=macros["carbohydrates"],
            fat=macros["fat"],
        )
