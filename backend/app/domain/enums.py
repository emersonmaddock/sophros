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


class Cuisine(StrEnum):
    AFRICAN = "African"
    ASIAN = "Asian"
    AMERICAN = "American"
    BRITISH = "British"
    CAJUN = "Cajun"
    CARIBBEAN = "Caribbean"
    CHINESE = "Chinese"
    EASTERN_EUROPEAN = "Eastern European"
    EUROPEAN = "European"
    FRENCH = "French"
    GERMAN = "German"
    GREEK = "Greek"
    INDIAN = "Indian"
    IRISH = "Irish"
    ITALIAN = "Italian"
    JAPANESE = "Japanese"
    JEWISH = "Jewish"
    KOREAN = "Korean"
    LATIN_AMERICAN = "Latin American"
    MEDITERRANEAN = "Mediterranean"
    MEXICAN = "Mexican"
    MIDDLE_EASTERN = "Middle Eastern"
    NORDIC = "Nordic"
    SOUTHERN = "Southern"
    SPANISH = "Spanish"
    THAI = "Thai"
    VIETNAMESE = "Vietnamese"


class Allergy(StrEnum):
    DAIRY = "Dairy"
    EGG = "Egg"
    GLUTEN = "Gluten"
    GRAIN = "Grain"
    PEANUT = "Peanut"
    SEAFOOD = "Seafood"
    SESAME = "Sesame"
    SHELLFISH = "Shellfish"
    SOY = "Soy"
    SULFITE = "Sulfite"
    TREE_NUT = "Tree Nut"
    WHEAT = "Wheat"


class MealSlot(StrEnum):
    BREAKFAST = "Breakfast"
    LUNCH = "Lunch"
    DINNER = "Dinner"


class Day(StrEnum):
    MONDAY = "Monday"
    TUESDAY = "Tuesday"
    WEDNESDAY = "Wednesday"
    THURSDAY = "Thursday"
    FRIDAY = "Friday"
    SATURDAY = "Saturday"
    SUNDAY = "Sunday"


class MealType(StrEnum):
    MAIN_COURSE = "main course"
    SIDE_DISH = "side dish"
    DESSERT = "dessert"
    APPETIZER = "appetizer"
    SALAD = "salad"
    BREAD = "bread"
    BREAKFAST = "breakfast"
    SOUP = "soup"
    BEVERAGE = "beverage"
    SAUCE = "sauce"
    MARINADE = "marinade"
    FINGERFOOD = "fingerfood"
    SNACK = "snack"
    DRINK = "drink"
