from app.schemas.dietary import DietaryConstraints
from app.schemas.recipe import Recipe


class RecipeFilter:
    @staticmethod
    def filter_recipes(
        recipes: list[Recipe], constraints: DietaryConstraints
    ) -> list[Recipe]:
        """
        Returns a list of recipes that satisfy ALL constraints.
        """
        filtered = []

        # Pre-process constraints for speed
        allergies = [a.lower() for a in constraints.allergies]
        dislikes = [d.lower() for d in constraints.dislikes]

        for recipe in recipes:
            # 1. Check Diets (Strict inclusion)
            # If user needs Vegan, recipe MUST be tagged Vegan
            if constraints.is_vegan and "vegan" not in [t.lower() for t in recipe.tags]:
                continue

            if constraints.is_vegetarian and "vegetarian" not in [
                t.lower() for t in recipe.tags
            ]:
                # Note: Vegan implies Vegetarian usually, but we check explicit tags
                # for now. Unless we add logic like: if vegan tag present, also
                # counts as vegetarian. Let's add that smart check:
                tags_lower = {t.lower() for t in recipe.tags}
                if "vegan" not in tags_lower and "vegetarian" not in tags_lower:
                    continue

            if constraints.is_gluten_free and "gluten-free" not in [
                t.lower() for t in recipe.tags
            ]:
                continue

            if constraints.is_dairy_free and "dairy-free" not in [
                t.lower() for t in recipe.tags
            ]:
                continue

            if constraints.is_pescatarian and "pescatarian" not in [
                t.lower() for t in recipe.tags
            ]:
                continue

            if constraints.is_halal and "halal" not in [t.lower() for t in recipe.tags]:
                continue

            if constraints.is_kosher and "kosher" not in [
                t.lower() for t in recipe.tags
            ]:
                continue

            # 2. Check Ingredients for Allergies (Strict)
            # We assume if the allergen string is present in any ingredient string,
            # it's a violation.
            violation = False
            if allergies:
                for ingredient in recipe.ingredients:
                    ing_lower = ingredient.lower()
                    for allergy in allergies:
                        if allergy in ing_lower:
                            violation = True
                            break
                    if violation:
                        break

            if violation:
                continue

            # 3. Check Ingredients for Dislikes (Soft)
            # If dislike found, add to warnings
            if dislikes:
                for ingredient in recipe.ingredients:
                    ing_lower = ingredient.lower()
                    for dislike in dislikes:
                        if dislike in ing_lower:
                            recipe.warnings.append(
                                f"Contains disliked ingredient: {dislike}"
                            )

            filtered.append(recipe)

        return filtered
