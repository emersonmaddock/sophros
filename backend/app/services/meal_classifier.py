import re

from app.schemas.recipe import Recipe


class MealClassifier:
    # Expanded Keyword Dictionaries
    KEYWORDS = {
        "breakfast": {
            "oats",
            "oatmeal",
            "egg",
            "eggs",
            "pancake",
            "waffle",
            "cereal",
            "yogurt",
            "granola",
            "toast",
            "bagel",
            "smoothie",
            "hash",
            "omelet",
            "benedict",
            "muffin",
        },
        "lunch": {
            "sandwich",
            "wrap",
            "salad",
            "soup",
            "bowl",
            "panini",
            "taco",
            "burrito",
            "leftover",
            "quick",
            "bento",
            "cold",
            "flatbread",
            "roll",
        },
        "dinner": {
            "roast",
            "stew",
            "steak",
            "pasta",
            "curry",
            "casserole",
            "grill",
            "stir-fry",
            "lasagna",
            "risotto",
            "slow-cook",
            "bake",
            "braise",
        },
        "snack": {
            "snack",
            "bar",
            "nuts",
            "chips",
            "popcorn",
            "cookie",
            "bite",
            "hummus",
            "fruit",
            "crackers",
            "trail mix",
            "energy ball",
            "jerky",
        },
    }

    # Thresholds
    SNACK_CALORIE_LIMIT = 400
    LUNCH_DINNER_CALORIE_THRESHOLD = 500
    LONG_PREP_THRESHOLD = 30
    QUICK_PREP_THRESHOLD = 15

    @staticmethod
    def _tokenize(text: str) -> set[str]:
        # Split by spaces and punctuation
        return set(re.findall(r"\b\w+\b", text.lower()))

    @classmethod
    def classify(cls, recipe: Recipe) -> list[str]:
        scores = {"breakfast": 0, "lunch": 0, "dinner": 0, "snack": 0}

        # Normalize and Tokenize text
        text_corpus = set()

        # Title
        text_corpus.update(cls._tokenize(recipe.title))

        # Tags and Ingredients
        for tag in recipe.tags:
            text_corpus.update(cls._tokenize(tag))
        for ing in recipe.ingredients:
            text_corpus.update(cls._tokenize(ing))

        cals = recipe.nutrients.calories
        prep_time = recipe.preparation_time_minutes or 20

        # --- 1. Keyword Scoring (Weight: +5) ---
        for slot, keywords in cls.KEYWORDS.items():
            intersection = text_corpus.intersection(keywords)
            if intersection:
                scores[slot] += 5 * len(intersection)

        # --- 2. Calorie Logic (Weight: +3) ---
        if cals < cls.SNACK_CALORIE_LIMIT:
            scores["snack"] += 5
            scores["breakfast"] += 2
            scores["lunch"] += 2
            scores["dinner"] -= 5
        elif cals > cls.LUNCH_DINNER_CALORIE_THRESHOLD:
            # Heavy meal
            scores["dinner"] += 3
            scores["lunch"] += 1
            scores["snack"] -= 10
        else:
            # Middle ground (400-500 cal)
            # Neutral for Lunch/Dinner/Breakfast
            scores["lunch"] += 2
            scores["dinner"] += 1
            scores["breakfast"] += 1
            scores["snack"] -= 2

        # --- 3. Prep Time Logic (Weight: +3) ---
        if prep_time < cls.QUICK_PREP_THRESHOLD:
            scores["breakfast"] += 2
            scores["lunch"] += 2
            scores["snack"] += 2
            scores["dinner"] -= 2
        elif prep_time > cls.LONG_PREP_THRESHOLD:
            scores["dinner"] += 5
            scores["lunch"] -= 2
            scores["breakfast"] -= 2
            scores["snack"] -= 5

        # --- 4. Tag Explicit Logic (Override) ---
        for tag in recipe.tags:
            tag_tokens = cls._tokenize(tag)
            for t in tag_tokens:
                if t in scores:
                    scores[t] += 20

        # --- Decision Phase ---
        valid_slots = [slot for slot, score in scores.items() if score >= 3]

        if not valid_slots:
            if cals > cls.SNACK_CALORIE_LIMIT:
                return ["lunch", "dinner"]
            else:
                return ["snack"]

        return valid_slots
