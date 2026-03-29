import type {
  DailyMealPlanOutput,
  MealSlotTargetOutput,
  Recipe,
  SavedMealPlanResponse,
  WeeklyMealPlanOutput,
} from '@/api/types.gen';
import { useScheduleEditing } from '@/hooks/useScheduleEditing';
import type { WeeklyScheduleItem } from '@/types/schedule';
import { createWrapper } from '@/__tests__/test-utils';
import { act, renderHook, waitFor } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/queries/mealPlan', () => ({
  useSaveMealPlanMutation: jest.fn(() => ({
    mutateAsync: jest.fn().mockResolvedValue({}),
  })),
}));

import { useSaveMealPlanMutation } from '@/lib/queries/mealPlan';

const mockUseSaveMealPlanMutation = useSaveMealPlanMutation as jest.MockedFunction<
  typeof useSaveMealPlanMutation
>;

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeRecipe(id: string, title: string, calories = 400): Recipe {
  return {
    id,
    title,
    nutrients: { calories, protein: 30, carbohydrates: 50, fat: 10 },
    preparation_time_minutes: 20,
  };
}

function makeSlot(
  slotName: MealSlotTargetOutput['slot_name'],
  time: string,
  calories: number,
  recipe?: Recipe,
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
  day: DailyMealPlanOutput['day'],
  slots: MealSlotTargetOutput[],
): DailyMealPlanOutput {
  return {
    day,
    slots,
    exercise: null,
    total_calories: slots.reduce(
      (sum, s) => sum + (s.plan?.main_recipe?.nutrients.calories ?? s.calories),
      0,
    ),
    total_protein: 0,
    total_carbs: 0,
    total_fat: 0,
  };
}

function makeWeeklyPlan(): WeeklyMealPlanOutput {
  const recipe = makeRecipe('recipe-1', 'Oatmeal', 350);
  const slot = makeSlot('Breakfast', '08:00:00', 350, recipe);
  const monday = makeDailyPlan('Monday', [slot]);
  return {
    daily_plans: [monday],
    total_weekly_calories: monday.total_calories,
  };
}

function makeSavedPlan(planData: WeeklyMealPlanOutput): SavedMealPlanResponse {
  return {
    id: 1,
    week_start_date: '2026-03-23',
    plan_data: planData,
    created_at: '2026-03-23T00:00:00Z',
    updated_at: '2026-03-23T00:00:00Z',
  };
}

const WEEK_START = '2026-03-23';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useScheduleEditing', () => {
  let mutateAsync: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mutateAsync = jest.fn().mockResolvedValue({});
    mockUseSaveMealPlanMutation.mockReturnValue({ mutateAsync } as any);
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('initializes rawPlan from savedPlan.plan_data on mount', () => {
    const weeklyPlan = makeWeeklyPlan();
    const savedPlan = makeSavedPlan(weeklyPlan);
    const { result } = renderHook(() => useScheduleEditing(savedPlan, WEEK_START), {
      wrapper: createWrapper(),
    });
    expect(result.current.rawPlan).toEqual(weeklyPlan);
  });

  it('isDirty is false initially', () => {
    const savedPlan = makeSavedPlan(makeWeeklyPlan());
    const { result } = renderHook(() => useScheduleEditing(savedPlan, WEEK_START), {
      wrapper: createWrapper(),
    });
    expect(result.current.isDirty).toBe(false);
  });

  it('removeItem sets isDirty to true and updates rawPlan', () => {
    const savedPlan = makeSavedPlan(makeWeeklyPlan());
    const { result } = renderHook(() => useScheduleEditing(savedPlan, WEEK_START), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.removeItem('Monday', 'recipe-1');
    });

    expect(result.current.isDirty).toBe(true);
    expect(result.current.rawPlan?.daily_plans[0].slots).toHaveLength(0);
  });

  it('addItem sets isDirty to true and updates rawPlan', () => {
    const savedPlan = makeSavedPlan(makeWeeklyPlan());
    const { result } = renderHook(() => useScheduleEditing(savedPlan, WEEK_START), {
      wrapper: createWrapper(),
    });

    const newItem: WeeklyScheduleItem = {
      id: 'recipe-new',
      time: '12:00 PM',
      title: 'New Lunch',
      duration: '30 min',
      type: 'meal',
      calories: 500,
    };

    act(() => {
      result.current.addItem('Monday', newItem);
    });

    expect(result.current.isDirty).toBe(true);
    // The plan originally had 1 slot; after addItem it should have 2
    expect(result.current.rawPlan?.daily_plans[0].slots).toHaveLength(2);
  });

  it('editItem (remove + add) sets isDirty to true', () => {
    const savedPlan = makeSavedPlan(makeWeeklyPlan());
    const { result } = renderHook(() => useScheduleEditing(savedPlan, WEEK_START), {
      wrapper: createWrapper(),
    });

    const updatedItem: WeeklyScheduleItem = {
      id: 'recipe-updated',
      time: '8:00 AM',
      title: 'Updated Oatmeal',
      duration: '20 min',
      type: 'meal',
      calories: 400,
    };

    act(() => {
      result.current.editItem('Monday', 'recipe-1', updatedItem);
    });

    expect(result.current.isDirty).toBe(true);
  });

  it('getScheduleItems returns mapped items for the given day index', () => {
    const savedPlan = makeSavedPlan(makeWeeklyPlan());
    const { result } = renderHook(() => useScheduleEditing(savedPlan, WEEK_START), {
      wrapper: createWrapper(),
    });

    // Day index 0 = Monday
    const items = result.current.getScheduleItems(0);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Oatmeal');
    expect(items[0].type).toBe('meal');
  });

  it('getScheduleItems returns empty array for a day with no plan', () => {
    const savedPlan = makeSavedPlan(makeWeeklyPlan());
    const { result } = renderHook(() => useScheduleEditing(savedPlan, WEEK_START), {
      wrapper: createWrapper(),
    });

    // Day index 1 = Tuesday (not in the plan)
    const items = result.current.getScheduleItems(1);
    expect(items).toHaveLength(0);
  });

  it('save() when not dirty does NOT call mutateAsync', async () => {
    const savedPlan = makeSavedPlan(makeWeeklyPlan());
    const { result } = renderHook(() => useScheduleEditing(savedPlan, WEEK_START), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.save();
    });

    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('save() when dirty calls mutateAsync with correct args and sets isDirty to false', async () => {
    const savedPlan = makeSavedPlan(makeWeeklyPlan());
    const { result } = renderHook(() => useScheduleEditing(savedPlan, WEEK_START), {
      wrapper: createWrapper(),
    });

    // Make it dirty first
    act(() => {
      result.current.removeItem('Monday', 'recipe-1');
    });
    expect(result.current.isDirty).toBe(true);

    await act(async () => {
      await result.current.save();
    });

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        week_start_date: WEEK_START,
        plan_data: expect.any(Object),
      }),
    );
    expect(result.current.isDirty).toBe(false);
  });

  // --- statusText ---

  it('statusText is "AI-optimized" when saveStatus is idle', () => {
    const savedPlan = makeSavedPlan(makeWeeklyPlan());
    const { result } = renderHook(() => useScheduleEditing(savedPlan, WEEK_START), {
      wrapper: createWrapper(),
    });
    expect(result.current.statusText).toBe('AI-optimized');
  });

  it('statusText reflects saving/saved/error states', async () => {
    // Use a promise we control to test the "saving" state
    let resolveSave!: (v: unknown) => void;
    const savePromise = new Promise((res) => {
      resolveSave = res;
    });
    mutateAsync.mockReturnValueOnce(savePromise);

    const savedPlan = makeSavedPlan(makeWeeklyPlan());
    const { result } = renderHook(() => useScheduleEditing(savedPlan, WEEK_START), {
      wrapper: createWrapper(),
    });

    // Make dirty then trigger save
    act(() => {
      result.current.removeItem('Monday', 'recipe-1');
    });

    // Start save without awaiting
    act(() => {
      result.current.save();
    });

    expect(result.current.statusText).toBe('Saving...');

    // Resolve the save
    await act(async () => {
      resolveSave({});
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.statusText).toBe('Changes saved');
    });

    // Advance past the 2-second reset timer so it doesn't leak
    act(() => {
      jest.advanceTimersByTime(2000);
    });
  });

  it('statusText is "Error saving" when save fails', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('Network error'));

    const savedPlan = makeSavedPlan(makeWeeklyPlan());
    const { result } = renderHook(() => useScheduleEditing(savedPlan, WEEK_START), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.removeItem('Monday', 'recipe-1');
    });

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.statusText).toBe('Error saving');
  });
});
