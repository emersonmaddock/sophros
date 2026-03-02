import type { DailyMealPlan, MealSlotTarget, Recipe } from '@/api/types.gen';
import type { WeeklyScheduleItem } from '@/types/schedule';

/**
 * Converts a Python time string (HH:MM:SS) to display format (H:MM AM/PM).
 */
function formatTime(pythonTime: string | null | undefined): string {
  if (!pythonTime) return '12:00 PM';

  // Handle "HH:MM:SS" or "HH:MM"
  const parts = pythonTime.split(':');
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1] || '00';
  const period = hours >= 12 ? 'PM' : 'AM';

  if (hours === 0) hours = 12;
  else if (hours > 12) hours -= 12;

  return `${hours}:${minutes} ${period}`;
}

/**
 * Estimates meal prep/eating duration based on slot type.
 */
function estimateDuration(slot: MealSlotTarget): string {
  if (slot.prep_time_minutes) {
    return `${slot.prep_time_minutes} min`;
  }
  const recipe = slot.plan?.main_recipe;
  if (recipe?.preparation_time_minutes) {
    return `${recipe.preparation_time_minutes} min`;
  }
  switch (slot.slot_name) {
    case 'Breakfast':
      return '20 min';
    case 'Lunch':
      return '30 min';
    case 'Dinner':
      return '40 min';
    default:
      return '30 min';
  }
}

/**
 * Converts a Recipe to a WeeklyScheduleItem (used for alternatives).
 */
function recipeToScheduleItem(recipe: Recipe, time: string, slotName: string): WeeklyScheduleItem {
  return {
    id: recipe.id,
    time,
    title: recipe.title,
    subtitle: `${recipe.nutrients.calories} cal · ${recipe.nutrients.protein}g protein`,
    duration: recipe.preparation_time_minutes ? `${recipe.preparation_time_minutes} min` : '30 min',
    type: 'meal',
    calories: recipe.nutrients.calories,
    recipe,
  };
}

/**
 * Converts a DailyMealPlan (API) to WeeklyScheduleItem[] for the UI.
 */
export function mapDailyPlanToScheduleItems(plan: DailyMealPlan): WeeklyScheduleItem[] {
  return plan.slots.map((slot) => {
    const time = formatTime(slot.time);
    const recipe = slot.plan?.main_recipe;

    const alternatives: WeeklyScheduleItem[] = (slot.plan?.alternatives || []).map((alt) =>
      recipeToScheduleItem(alt, time, slot.slot_name)
    );

    return {
      id: recipe?.id || `${slot.slot_name}-${Date.now()}`,
      time,
      title: recipe?.title || slot.slot_name,
      subtitle: recipe
        ? `${recipe.nutrients.calories} cal · ${recipe.nutrients.protein}g protein`
        : `${slot.calories} cal target`,
      duration: estimateDuration(slot),
      type: 'meal' as const,
      calories: recipe?.nutrients.calories || slot.calories,
      recipe: recipe || undefined,
      alternatives,
    };
  });
}
