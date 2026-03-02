import type {
  DailyMealPlanOutput,
  Day,
  ExerciseRecommendation,
  MealSlot,
  MealSlotTargetOutput,
  Recipe,
  WeeklyMealPlanOutput,
} from '@/api/types.gen';
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
 * Converts an ExerciseRecommendation to a WeeklyScheduleItem.
 */
function exerciseToScheduleItem(exercise: ExerciseRecommendation): WeeklyScheduleItem {
  const time = exercise.time ? formatTime(exercise.time) : '6:00 AM';
  const subtitle =
    [
      exercise.calories_burned ? `${exercise.calories_burned} cal burn` : null,
      exercise.muscle_gain_estimate_kg
        ? `~${(exercise.muscle_gain_estimate_kg * 1000).toFixed(0)}g muscle gain`
        : null,
    ]
      .filter(Boolean)
      .join(' · ') || `${exercise.duration_minutes} min session`;

  return {
    id: `exercise-${exercise.category}`,
    time,
    title: exercise.category,
    subtitle,
    duration: `${exercise.duration_minutes} min`,
    type: 'workout',
    calories: exercise.calories_burned,
    workoutType: exercise.category,
  };
}

/**
 * Parses a display time string (e.g. "7:30 AM") into minutes since midnight for sorting.
 */
function parseTimeToMinutes(displayTime: string): number {
  const [timePart, period] = displayTime.split(' ');
  const [hours, minutes] = timePart.split(':').map(Number);
  let h = hours;
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + (minutes || 0);
}

/**
 * Estimates meal prep/eating duration based on slot type.
 */
function estimateDuration(slot: MealSlotTargetOutput): string {
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
export function mapDailyPlanToScheduleItems(plan: DailyMealPlanOutput): WeeklyScheduleItem[] {
  const mealItems: WeeklyScheduleItem[] = plan.slots.map((slot) => {
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

  const items: WeeklyScheduleItem[] = [...mealItems];

  if (plan.exercise) {
    items.push(exerciseToScheduleItem(plan.exercise));
  }

  // Sort all items by time for correct timeline ordering
  items.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

  return items;
}

// ---------------------------------------------------------------------------
// Reverse mapping utilities – map UI edits back to the raw API plan
// ---------------------------------------------------------------------------

/**
 * Converts a display time string (e.g. "7:30 AM") to API time format ("07:30:00").
 */
export function displayTimeToApiTime(displayTime: string): string {
  const [timePart, period] = displayTime.split(' ');
  const [hours, minutes] = timePart.split(':').map(Number);
  let h = hours;
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${h.toString().padStart(2, '0')}:${(minutes || 0).toString().padStart(2, '0')}:00`;
}

function recalcDailyTotals(day: DailyMealPlanOutput): DailyMealPlanOutput {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;

  for (const slot of day.slots) {
    const recipe = slot.plan?.main_recipe;
    if (recipe) {
      calories += recipe.nutrients.calories;
      protein += recipe.nutrients.protein;
      carbs += recipe.nutrients.carbohydrates;
      fat += recipe.nutrients.fat;
    } else {
      calories += slot.calories;
      protein += slot.protein;
      carbs += slot.carbohydrates;
      fat += slot.fat;
    }
  }

  if (day.exercise?.calories_burned) {
    calories -= day.exercise.calories_burned;
  }

  return { ...day, total_calories: calories, total_protein: protein, total_carbs: carbs, total_fat: fat };
}

/**
 * Remove an item from the raw plan by its schedule item ID.
 */
export function removeItemFromRawPlan(
  plan: WeeklyMealPlanOutput,
  dayName: Day,
  itemId: string
): WeeklyMealPlanOutput {
  const updatedDailyPlans = plan.daily_plans.map((dp) => {
    if (dp.day !== dayName) return dp;

    // Exercise item
    if (typeof itemId === 'string' && itemId.startsWith('exercise-')) {
      return recalcDailyTotals({ ...dp, exercise: null });
    }

    // Meal item – filter out the matching slot
    const filteredSlots = dp.slots.filter((slot) => {
      const recipeId = slot.plan?.main_recipe?.id;
      if (recipeId !== undefined && recipeId.toString() === itemId.toString()) return false;
      // Fallback: match by slot_name pattern
      if (itemId === `${slot.slot_name}-${Date.now()}`) return false;
      return true;
    });

    return recalcDailyTotals({ ...dp, slots: filteredSlots });
  });

  const totalWeekly = updatedDailyPlans.reduce((sum, dp) => sum + dp.total_calories, 0);
  return { ...plan, daily_plans: updatedDailyPlans, total_weekly_calories: totalWeekly };
}

/**
 * Infer a MealSlot from an hour.
 */
function inferSlotName(hour: number): MealSlot {
  if (hour < 11) return 'Breakfast';
  if (hour < 15) return 'Lunch';
  return 'Dinner';
}

/**
 * Add a WeeklyScheduleItem to the raw plan for a given day.
 */
export function addItemToRawPlan(
  plan: WeeklyMealPlanOutput,
  dayName: Day,
  item: WeeklyScheduleItem
): WeeklyMealPlanOutput {
  const updatedDailyPlans = plan.daily_plans.map((dp) => {
    if (dp.day !== dayName) return dp;

    if (item.type === 'workout') {
      const exercise: ExerciseRecommendation = {
        category: (item.workoutType as ExerciseRecommendation['category']) || 'Cardio',
        duration_minutes: parseInt(item.duration) || 30,
        time: displayTimeToApiTime(item.time),
        calories_burned: item.calories,
      };
      return recalcDailyTotals({ ...dp, exercise });
    }

    // Meal item
    const apiTime = displayTimeToApiTime(item.time);
    const [timePart, period] = item.time.split(' ');
    const [hours] = timePart.split(':').map(Number);
    let hour = hours;
    if (period === 'PM' && hours !== 12) hour += 12;
    if (period === 'AM' && hours === 12) hour = 0;

    const newSlot: MealSlotTargetOutput = {
      slot_name: inferSlotName(hour),
      calories: item.calories || 0,
      protein: 0,
      carbohydrates: 0,
      fat: 0,
      time: apiTime,
      plan: item.recipe
        ? { main_recipe: item.recipe, alternatives: [] }
        : null,
    };

    return recalcDailyTotals({ ...dp, slots: [...dp.slots, newSlot] });
  });

  const totalWeekly = updatedDailyPlans.reduce((sum, dp) => sum + dp.total_calories, 0);
  return { ...plan, daily_plans: updatedDailyPlans, total_weekly_calories: totalWeekly };
}
