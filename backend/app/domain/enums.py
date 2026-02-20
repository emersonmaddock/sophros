from enum import StrEnum


# USDA uses 4 levels, we use 5
class ActivityLevel(StrEnum):
    SEDENTARY = "sedentary"
    LIGHT = "light"
    MODERATE = "moderate"
    ACTIVE = "active"
    VERY_ACTIVE = "very_active"


# Biological sex only (for calculations)
class Sex(StrEnum):
    MALE = "male"
    FEMALE = "female"


# From USDA DRI Calculator
class PregnancyStatus(StrEnum):
    NOT_PREGNANT = "not_pregnant"
    PREGNANT = "pregnant"
    EXCLUSIVELY_BREASTFEEDING = "exclusively_breastfeeding"  # 0 to 6 months postpartum
    PARTIALLY_BREASTFEEDING = "partially_breastfeeding"  # 7 to 12 months postpartum


class ActivityType(StrEnum):
    MEAL = "meal"
    SLEEP = "sleep"
    WORK = "work"
    EXERCISE = "exercise"
    LEISURE = "leisure"
    OTHER = "other"
