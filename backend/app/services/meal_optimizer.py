from ortools.sat.python import cp_model

from app.schemas.meal_plan import MealSlotTarget
from app.schemas.recipe import Recipe
from app.services.meal_classifier import MealClassifier


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

        # 1. Pre-filter candidates per slot (Optimization)
        recipe_classifications = [MealClassifier.classify(r) for r in available_recipes]

        # valid_indices[slot_idx] = list of recipe_indices valid for this slot
        valid_indices: dict[int, list[int]] = {}
        for s_idx, slot in enumerate(slots):
            slot_name_lower = slot.slot_name.lower()
            valid_indices[s_idx] = []

            for r_idx, _ in enumerate(available_recipes):
                if slot_name_lower in recipe_classifications[r_idx]:
                    valid_indices[s_idx].append(r_idx)

        model = cp_model.CpModel()
        solver = cp_model.CpSolver()

        # Variables
        # selected[recipe_idx, slot_idx]
        # Only create variables for VALID combinations
        selected = {}
        for s_idx in range(len(slots)):
            for r_idx in valid_indices[s_idx]:
                selected[(r_idx, s_idx)] = model.NewBoolVar(f"select_r{r_idx}_s{s_idx}")

        # Constraints

        # 1. Exact one recipe per slot
        for s_idx in range(len(slots)):
            # Sum of selected recipes for this slot must be 1
            # If no valid recipes, this will be sum([]) == 1 which is False (Infeasible)
            # preventing crash but returning no solution
            model.Add(
                sum(selected[(r_idx, s_idx)] for r_idx in valid_indices[s_idx]) == 1  # type: ignore[arg-type]
            )

        # 3. Calculate Totals
        # We need to scale values to integers (our schema uses int, so we are good)

        total_cals = sum(
            selected[(r_idx, s_idx)] * available_recipes[r_idx].nutrients.calories
            for s_idx in range(len(slots))
            for r_idx in valid_indices[s_idx]
        )

        total_prot = sum(
            selected[(r_idx, s_idx)] * available_recipes[r_idx].nutrients.protein
            for s_idx in range(len(slots))
            for r_idx in valid_indices[s_idx]
        )

        total_carbs = sum(
            selected[(r_idx, s_idx)] * available_recipes[r_idx].nutrients.carbohydrates
            for s_idx in range(len(slots))
            for r_idx in valid_indices[s_idx]
        )

        total_fat = sum(
            selected[(r_idx, s_idx)] * available_recipes[r_idx].nutrients.fat
            for s_idx in range(len(slots))
            for r_idx in valid_indices[s_idx]
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

        # Minimize penalties for warnings
        # We want to avoid recipes with warnings if possible
        # Penalty of 1000 per warning
        total_warnings = sum(
            selected[(r_idx, s_idx)] * (1 if available_recipes[r_idx].warnings else 0)
            for s_idx in range(len(slots))
            for r_idx in valid_indices[s_idx]
        )  # type: ignore[arg-type]

        model.Minimize(
            abs_diff_cals
            + (abs_diff_prot * 10)
            + (abs_diff_carbs * 10)
            + (abs_diff_fat * 10)
            + (total_warnings * 1000)
        )

        # Solve
        status = solver.Solve(model)

        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            result_recipes: list[Recipe | None] = []
            for s_idx in range(len(slots)):
                # Find which recipe was selected
                for r_idx in valid_indices[s_idx]:
                    if solver.Value(selected[(r_idx, s_idx)]) == 1:
                        result_recipes.append(available_recipes[r_idx])
                        break
            return result_recipes
        else:
            return []  # No solution
