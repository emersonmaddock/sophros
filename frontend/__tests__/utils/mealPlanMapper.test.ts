import type {
  DailyMealPlanOutput,
  MealSlotTargetOutput,
  Recipe,
  WeeklyMealPlanOutput,
} from '@/api/types.gen';
import type { WeeklyScheduleItem } from '@/types/schedule';
import {
  addItemToRawPlan,
  displayTimeToApiTime,
  mapDailyPlanToScheduleItems,
  removeItemFromRawPlan,
} from '@/utils/mealPlanMapper';

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
  recipe?: Recipe
): MealSlotTargetOutput {
  return {
    slot_name: slotName,
    time,
    calories,
    protein: recipe?.nutrients.protein ?? 0,
    carbohydrates: recipe?.nutrients.carbohydrates ?? 0,
    fat: recipe?.nutrients.fat ?? 0,
    plan: recipe ? { main_recipe: recipe, alternatives: [] } : null,
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

function makeWeeklyPlan(dailyPlan: DailyMealPlanOutput): WeeklyMealPlanOutput {
  return {
    daily_plans: [dailyPlan],
    total_weekly_calories: dailyPlan.total_calories,
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

  it('uses recipe id as the item id', () => {
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
});

// ---------------------------------------------------------------------------
// removeItemFromRawPlan
// ---------------------------------------------------------------------------

describe('removeItemFromRawPlan', () => {
  it('removes the meal slot with the matching recipe id', () => {
    const recipe1 = makeRecipe('recipe-1', 'Oatmeal', 350, 10, 60, 8);
    const recipe2 = makeRecipe('recipe-2', 'Salad', 200, 5, 30, 5);
    const slot1 = makeSlot('Breakfast', '08:00:00', 350, recipe1);
    const slot2 = makeSlot('Lunch', '12:00:00', 200, recipe2);
    const dailyPlan = makeDailyPlan([slot1, slot2]);
    const weeklyPlan = makeWeeklyPlan(dailyPlan);

    const result = removeItemFromRawPlan(weeklyPlan, 'Monday', 'recipe-1');

    const updatedDay = result.daily_plans[0];
    expect(updatedDay.slots).toHaveLength(1);
    expect(updatedDay.slots[0].plan?.main_recipe?.id).toBe('recipe-2');
  });

  it('recalculates total_calories after removing a meal slot', () => {
    const recipe1 = makeRecipe('recipe-1', 'Oatmeal', 350, 10, 60, 8);
    const recipe2 = makeRecipe('recipe-2', 'Salad', 200, 5, 30, 5);
    const slot1 = makeSlot('Breakfast', '08:00:00', 350, recipe1);
    const slot2 = makeSlot('Lunch', '12:00:00', 200, recipe2);
    const dailyPlan = makeDailyPlan([slot1, slot2]);
    const weeklyPlan = makeWeeklyPlan(dailyPlan);

    const result = removeItemFromRawPlan(weeklyPlan, 'Monday', 'recipe-1');

    // remaining: recipe2 = 200 cal
    expect(result.daily_plans[0].total_calories).toBe(200);
    expect(result.total_weekly_calories).toBe(200);
  });

  it('removes exercise when itemId starts with "exercise-"', () => {
    const exercise = { category: 'Cardio' as const, duration_minutes: 30, calories_burned: 300 };
    const dailyPlan = makeDailyPlan([], exercise);
    const weeklyPlan = makeWeeklyPlan(dailyPlan);

    const result = removeItemFromRawPlan(weeklyPlan, 'Monday', 'exercise-Cardio');

    expect(result.daily_plans[0].exercise).toBeNull();
  });

  it('does not modify other days', () => {
    const recipe = makeRecipe('r1', 'Oatmeal', 400, 10, 60, 8);
    const slot = makeSlot('Breakfast', '08:00:00', 400, recipe);
    const mondayPlan = makeDailyPlan([slot]);
    const tuesdayPlan: DailyMealPlanOutput = {
      day: 'Tuesday',
      slots: [makeSlot('Lunch', '12:00:00', 500)],
      exercise: null,
      total_calories: 500,
      total_protein: 0,
      total_carbs: 0,
      total_fat: 0,
    };
    const weeklyPlan: WeeklyMealPlanOutput = {
      daily_plans: [mondayPlan, tuesdayPlan],
      total_weekly_calories: 900,
    };

    const result = removeItemFromRawPlan(weeklyPlan, 'Monday', 'r1');

    // Tuesday should be untouched
    expect(result.daily_plans[1].slots).toHaveLength(1);
    expect(result.daily_plans[1].total_calories).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// addItemToRawPlan
// ---------------------------------------------------------------------------

describe('addItemToRawPlan', () => {
  it('adds a meal item to the correct day', () => {
    const dailyPlan = makeDailyPlan([]);
    const weeklyPlan = makeWeeklyPlan(dailyPlan);

    const newItem: WeeklyScheduleItem = {
      id: 'recipe-99',
      time: '8:00 AM',
      title: 'New Breakfast',
      duration: '20 min',
      type: 'meal',
      calories: 400,
    };

    const result = addItemToRawPlan(weeklyPlan, 'Monday', newItem);

    expect(result.daily_plans[0].slots).toHaveLength(1);
    expect(result.daily_plans[0].slots[0].slot_name).toBe('Breakfast');
  });

  it('adds a workout item to the correct day', () => {
    const dailyPlan = makeDailyPlan([]);
    const weeklyPlan = makeWeeklyPlan(dailyPlan);

    const workoutItem: WeeklyScheduleItem = {
      id: 'exercise-Cardio',
      time: '6:00 AM',
      title: 'Cardio',
      duration: '30 min',
      type: 'workout',
      calories: 300,
      workoutType: 'Cardio',
    };

    const result = addItemToRawPlan(weeklyPlan, 'Monday', workoutItem);

    expect(result.daily_plans[0].exercise).not.toBeNull();
    expect(result.daily_plans[0].exercise?.category).toBe('Cardio');
    expect(result.daily_plans[0].exercise?.duration_minutes).toBe(30);
    expect(result.daily_plans[0].exercise?.calories_burned).toBe(300);
  });

  it('recalculates total_calories after adding a meal item', () => {
    const recipe = makeRecipe('r1', 'Existing', 300, 10, 40, 8);
    const slot = makeSlot('Breakfast', '08:00:00', 300, recipe);
    const dailyPlan = makeDailyPlan([slot]);
    const weeklyPlan = makeWeeklyPlan(dailyPlan);

    const newItem: WeeklyScheduleItem = {
      id: 'new-item',
      time: '12:00 PM',
      title: 'New Lunch',
      duration: '30 min',
      type: 'meal',
      calories: 500,
    };

    const result = addItemToRawPlan(weeklyPlan, 'Monday', newItem);

    // existing slot has no recipe (wait - it does), recipe1=300 + new slot=500 (no recipe, uses slot.calories)
    // recalcDailyTotals: slot1 has recipe → 300, new slot has no recipe → slot.calories = 500
    expect(result.daily_plans[0].total_calories).toBe(800);
    expect(result.total_weekly_calories).toBe(800);
  });

  it('does not modify other days', () => {
    const mondayPlan = makeDailyPlan([]);
    const tuesdayPlan: DailyMealPlanOutput = {
      day: 'Tuesday',
      slots: [],
      exercise: null,
      total_calories: 0,
      total_protein: 0,
      total_carbs: 0,
      total_fat: 0,
    };
    const weeklyPlan: WeeklyMealPlanOutput = {
      daily_plans: [mondayPlan, tuesdayPlan],
      total_weekly_calories: 0,
    };

    const newItem: WeeklyScheduleItem = {
      id: 'r1',
      time: '8:00 AM',
      title: 'Breakfast',
      duration: '20 min',
      type: 'meal',
      calories: 400,
    };

    const result = addItemToRawPlan(weeklyPlan, 'Monday', newItem);

    expect(result.daily_plans[0].slots).toHaveLength(1);
    expect(result.daily_plans[1].slots).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// inferSlotName (tested indirectly via addItemToRawPlan)
// ---------------------------------------------------------------------------

describe('inferSlotName (via addItemToRawPlan)', () => {
  function getSlotName(time: string): string {
    const dailyPlan = makeDailyPlan([]);
    const weeklyPlan = makeWeeklyPlan(dailyPlan);
    const item: WeeklyScheduleItem = {
      id: 'test',
      time,
      title: 'Test',
      duration: '20 min',
      type: 'meal',
      calories: 0,
    };
    const result = addItemToRawPlan(weeklyPlan, 'Monday', item);
    return result.daily_plans[0].slots[0].slot_name;
  }

  it('assigns Breakfast for hour < 11 (7:30 AM → hour 7)', () => {
    expect(getSlotName('7:30 AM')).toBe('Breakfast');
  });

  it('assigns Breakfast for hour 10 (10:00 AM)', () => {
    expect(getSlotName('10:00 AM')).toBe('Breakfast');
  });

  it('assigns Lunch for hour 11 (11:00 AM)', () => {
    expect(getSlotName('11:00 AM')).toBe('Lunch');
  });

  it('assigns Lunch for hour 12 (12:00 PM)', () => {
    expect(getSlotName('12:00 PM')).toBe('Lunch');
  });

  it('assigns Lunch for hour 14 (2:00 PM)', () => {
    expect(getSlotName('2:00 PM')).toBe('Lunch');
  });

  it('assigns Dinner for hour >= 15 (3:00 PM → hour 15)', () => {
    expect(getSlotName('3:00 PM')).toBe('Dinner');
  });

  it('assigns Dinner for hour 19 (7:00 PM)', () => {
    expect(getSlotName('7:00 PM')).toBe('Dinner');
  });
});
