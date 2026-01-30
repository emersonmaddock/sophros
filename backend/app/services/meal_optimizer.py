from ortools.sat.python import cp_model

from app.schemas.meal_plan import MealSlotTarget
from app.schemas.recipe import Recipe


class MealOptimizer:
    @staticmethod
    def optimize_day(
        slots: list[MealSlotTarget], available_recipes: list[Recipe]
    ) -> list[Recipe | None]:
        """
        Selects one recipe for each slot to minimize nutritional deviation.
        Returns a list of Recipes corresponding to the slots order.
        If no solution found, returns empty list or partials (handling failure
        gracefully).
        """

        # 1. Filter candidates per slot (Optimization)
        # We pre-calculate which recipes are valid for which slot to reduce search
        # space. But for now, we leave that to the caller (Issue 7/8) OR we assume
        # all filtered recipes are valid candidates for *some* slot.
        # Actually, the prompt says "Implement the optimization model that selects
        # one recipe per meal slot". We need to know which recipes are valid for
        # which slot. We'll assume the classification service is used externally
        # to tag recipes, or filter inputs. However, to let the solver decide, we
        # need pass in candidates that ARE valid.

        # Let's assume 'classify' has been run and we check tags/metadata, OR we
        # rely on a simplified assumption that the caller provides a list of ALL
        # recipes and we enforce slot rules here? The prompt says: "Implement logic
        # that determines... (Issue 7) ... This will be used to determine when a
        # meal can be selected". So we should enforce that constraint here.

        from app.services.meal_classifier import MealClassifier

        model = cp_model.CpModel()
        solver = cp_model.CpSolver()

        # Variables
        # selected[recipe_idx, slot_idx]
        selected = {}
        for s_idx, _slot in enumerate(slots):
            for r_idx, _recipe in enumerate(available_recipes):
                selected[(r_idx, s_idx)] = model.NewBoolVar(f"select_r{r_idx}_s{s_idx}")

        # Constraints

        # 1. Exact one recipe per slot
        for s_idx in range(len(slots)):
            model.Add(
                sum(selected[(r_idx, s_idx)] for r_idx in range(len(available_recipes)))
                == 1
            )

        # 2. Recipe must match slot type
        # We use the classifier here to enforce logic
        recipe_classifications = [MealClassifier.classify(r) for r in available_recipes]

        for s_idx, slot in enumerate(slots):
            slot_name_lower = slot.slot_name.lower()
            for r_idx, _recipe in enumerate(available_recipes):
                valid_types = recipe_classifications[r_idx]

                # Check compatibility
                # If slot is "Breakfast", recipe must have "breakfast" in classification
                # If slot is "Snack", recipe must have "snack"
                # If slot is "Lunch" or "Dinner", strict check?
                # Let's simple check: if the slot name is in the valid types

                # Note: This might be too strict if classifications are fuzzy.
                # But it's safer for validity.
                is_valid = slot_name_lower in valid_types

                if not is_valid:
                    # Force selection to 0
                    model.Add(selected[(r_idx, s_idx)] == 0)

        # 3. Calculate Totals
        # We need to scale values to integers (our schema uses int, so we are good)

        total_cals = sum(
            selected[(r_idx, s_idx)] * available_recipes[r_idx].nutrients.calories
            for s_idx in range(len(slots))
            for r_idx in range(len(available_recipes))
        )

        total_prot = sum(
            selected[(r_idx, s_idx)] * available_recipes[r_idx].nutrients.protein
            for s_idx in range(len(slots))
            for r_idx in range(len(available_recipes))
        )

        total_carbs = sum(
            selected[(r_idx, s_idx)] * available_recipes[r_idx].nutrients.carbohydrates
            for s_idx in range(len(slots))
            for r_idx in range(len(available_recipes))
        )

        total_fat = sum(
            selected[(r_idx, s_idx)] * available_recipes[r_idx].nutrients.fat
            for s_idx in range(len(slots))
            for r_idx in range(len(available_recipes))
        )

        # Targets (Sum of all slots targets)
        target_cals = sum(s.calories for s in slots)
        target_prot = sum(s.protein for s in slots)
        target_carbs = sum(s.carbohydrates for s in slots)
        target_fat = sum(s.fat for s in slots)

        # Objective Terms (Absolute Deviations)
        abs_diff_cals = model.NewIntVar(0, 100000, "abs_diff_cals")
        abs_diff_prot = model.NewIntVar(0, 100000, "abs_diff_prot")
        abs_diff_carbs = model.NewIntVar(0, 100000, "abs_diff_carbs")
        abs_diff_fat = model.NewIntVar(0, 100000, "abs_diff_fat")

        model.AddAbsEquality(abs_diff_cals, total_cals - target_cals)
        model.AddAbsEquality(abs_diff_prot, total_prot - target_prot)
        model.AddAbsEquality(abs_diff_carbs, total_carbs - target_carbs)
        model.AddAbsEquality(abs_diff_fat, total_fat - target_fat)

        # Weighting: Calories might be most important, but generally equal weight
        # is fine. Maybe scale macros since they are smaller numbers than calories?
        # e.g. 10 cal diff is less significant than 10g protein diff.
        # Cals ~ 2000, Prot ~ 150. Factor ~ 10-15.
        # Let's weight macros x10 to prioritize macro balance roughly equally to
        # calorie balance

        model.Minimize(
            abs_diff_cals
            + (abs_diff_prot * 10)
            + (abs_diff_carbs * 10)
            + (abs_diff_fat * 10)
        )

        # Solve
        status = solver.Solve(model)

        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            result_recipes = []
            for s_idx in range(len(slots)):
                # Find which recipe was selected
                for r_idx in range(len(available_recipes)):
                    if solver.Value(selected[(r_idx, s_idx)]) == 1:
                        result_recipes.append(available_recipes[r_idx])
                        break
            return result_recipes
        else:
            return []  # No solution
