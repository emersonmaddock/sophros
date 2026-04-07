import type { DailyMealPlanOutput, MealSlotTargetOutput, Recipe } from '@/api/types.gen';
import { displayTimeToApiTime, mapDailyPlanToScheduleItems } from '@/utils/mealPlanMapper';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeRecipe(
  id: string,
  title: string,
  calories = 400,
  protein = 30,
  carbs = 50,
  fat = 10
): Recipe {
  return {
    id,
    title,
    nutrients: { calories, protein, carbohydrates: carbs, fat },
    preparation_time_minutes: 20,
  };
}

function makeSlot(
  slotName: MealSlotTargetOutput['slot_name'],
  time: string,
  calories: number,
  recipe?: Recipe,
  eventId?: number
): MealSlotTargetOutput {
  return {
    slot_name: slotName,
    time,
    calories,
    protein: recipe?.nutrients.protein ?? 0,
    carbohydrates: recipe?.nutrients.carbohydrates ?? 0,
    fat: recipe?.nutrients.fat ?? 0,
    plan: recipe ? { main_recipe: recipe, alternatives: [] } : null,
    event_id: eventId,
  };
}

function makeDailyPlan(
  slots: MealSlotTargetOutput[],
  exercise?: DailyMealPlanOutput['exercise']
): DailyMealPlanOutput {
  const total_calories = slots.reduce(
    (sum, s) => sum + (s.plan?.main_recipe?.nutrients.calories ?? s.calories),
    0
  );
  return {
    day: 'Monday',
    slots,
    exercise: exercise ?? null,
    total_calories,
    total_protein: 0,
    total_carbs: 0,
    total_fat: 0,
  };
}

// ---------------------------------------------------------------------------
// displayTimeToApiTime
// ---------------------------------------------------------------------------

describe('displayTimeToApiTime', () => {
  it('converts "7:30 AM" to "07:30:00"', () => {
    expect(displayTimeToApiTime('7:30 AM')).toBe('07:30:00');
  });

  it('converts "12:00 PM" to "12:00:00"', () => {
    expect(displayTimeToApiTime('12:00 PM')).toBe('12:00:00');
  });

  it('converts "11:00 PM" to "23:00:00"', () => {
    expect(displayTimeToApiTime('11:00 PM')).toBe('23:00:00');
  });

  it('converts "12:00 AM" to "00:00:00"', () => {
    expect(displayTimeToApiTime('12:00 AM')).toBe('00:00:00');
  });

  it('converts "1:00 PM" to "13:00:00"', () => {
    expect(displayTimeToApiTime('1:00 PM')).toBe('13:00:00');
  });

  it('converts "6:00 AM" to "06:00:00"', () => {
    expect(displayTimeToApiTime('6:00 AM')).toBe('06:00:00');
  });
});

// ---------------------------------------------------------------------------
// mapDailyPlanToScheduleItems
// ---------------------------------------------------------------------------

describe('mapDailyPlanToScheduleItems', () => {
  it('returns an array with one item per meal slot', () => {
    const recipe = makeRecipe('r1', 'Oatmeal');
    const slot = makeSlot('Breakfast', '08:00:00', 400, recipe);
    const plan = makeDailyPlan([slot]);
    const items = mapDailyPlanToScheduleItems(plan);
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe('meal');
  });

  it('returns empty array when plan has no slots and no exercise', () => {
    const plan = makeDailyPlan([]);
    const items = mapDailyPlanToScheduleItems(plan);
    expect(items).toHaveLength(0);
  });

  it('includes exercise item when plan has exercise', () => {
    const plan = makeDailyPlan([], {
      category: 'Cardio',
      duration_minutes: 30,
      time: '06:00:00',
      calories_burned: 250,
    });
    const items = mapDailyPlanToScheduleItems(plan);
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe('workout');
    expect(items[0].id).toBe('exercise-Cardio');
  });

  it('uses event_id as item id for exercise when available', () => {
    const plan = makeDailyPlan([], {
      category: 'Cardio',
      duration_minutes: 30,
      time: '06:00:00',
      calories_burned: 250,
      event_id: 42,
    });
    const items = mapDailyPlanToScheduleItems(plan);
    expect(items[0].id).toBe('42');
  });

  it('uses event_id as item id for meal slots when available', () => {
    const recipe = makeRecipe('r1', 'Avocado Toast');
    const slot = makeSlot('Breakfast', '08:00:00', 400, recipe, 99);
    const plan = makeDailyPlan([slot]);
    const items = mapDailyPlanToScheduleItems(plan);
    expect(items[0].id).toBe('99');
  });

  it('uses recipe title as item title when recipe is present', () => {
    const recipe = makeRecipe('r1', 'Avocado Toast');
    const slot = makeSlot('Breakfast', '08:00:00', 400, recipe);
    const plan = makeDailyPlan([slot]);
    const items = mapDailyPlanToScheduleItems(plan);
    expect(items[0].title).toBe('Avocado Toast');
  });

  it('falls back to slot_name when no recipe', () => {
    const slot = makeSlot('Lunch', '12:00:00', 500);
    const plan = makeDailyPlan([slot]);
    const items = mapDailyPlanToScheduleItems(plan);
    expect(items[0].title).toBe('Lunch');
  });

  it('sorts items by time ascending', () => {
    const recipe1 = makeRecipe('r1', 'Dinner');
    const recipe2 = makeRecipe('r2', 'Breakfast');
    const dinnerSlot = makeSlot('Dinner', '19:00:00', 600, recipe1);
    const breakfastSlot = makeSlot('Breakfast', '08:00:00', 400, recipe2);
    const plan = makeDailyPlan([dinnerSlot, breakfastSlot]);
    const items = mapDailyPlanToScheduleItems(plan);
    expect(items[0].title).toBe('Breakfast');
    expect(items[1].title).toBe('Dinner');
  });

  it('places exercise between meals when time is between them', () => {
    const recipe1 = makeRecipe('r1', 'Morning Meal');
    const recipe2 = makeRecipe('r2', 'Evening Meal');
    const morningSlot = makeSlot('Breakfast', '08:00:00', 400, recipe1);
    const eveningSlot = makeSlot('Dinner', '19:00:00', 600, recipe2);
    const plan = makeDailyPlan([morningSlot, eveningSlot], {
      category: 'Cardio',
      duration_minutes: 30,
      time: '12:00:00',
      calories_burned: 300,
    });
    const items = mapDailyPlanToScheduleItems(plan);
    expect(items).toHaveLength(3);
    expect(items[0].title).toBe('Morning Meal');
    expect(items[1].type).toBe('workout');
    expect(items[2].title).toBe('Evening Meal');
  });

  it('falls back to recipe id when no event_id', () => {
    const recipe = makeRecipe('recipe-42', 'Pasta');
    const slot = makeSlot('Dinner', '19:00:00', 600, recipe);
    const plan = makeDailyPlan([slot]);
    const items = mapDailyPlanToScheduleItems(plan);
    expect(items[0].id).toBe('recipe-42');
  });

  it('maps exercise calories_burned to item calories', () => {
    const plan = makeDailyPlan([], {
      category: 'Weight Lifting',
      duration_minutes: 45,
      calories_burned: 180,
    });
    const items = mapDailyPlanToScheduleItems(plan);
    expect(items[0].calories).toBe(180);
  });

  it('includes protein, carbs, fat on meal items', () => {
    const recipe = makeRecipe('r1', 'Chicken Bowl', 500, 40, 55, 15);
    const slot = makeSlot('Lunch', '12:00:00', 500, recipe, 10);
    const plan = makeDailyPlan([slot]);
    const items = mapDailyPlanToScheduleItems(plan);
    expect(items[0].protein).toBe(40);
    expect(items[0].carbs).toBe(55);
    expect(items[0].fat).toBe(15);
  });
});
