import type {
  DailyMealPlanOutput,
  MealSlotTargetOutput,
  Recipe,
  SavedMealPlanResponse,
  WeeklyMealPlanOutput,
} from '@/api/types.gen';
import { useScheduleEditing } from '@/hooks/useScheduleEditing';
import { createWrapper } from '@/__tests__/test-utils';
import { renderHook } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSaveMutateAsync = jest.fn().mockResolvedValue({});
const mockAddMutateAsync = jest.fn().mockResolvedValue({});
const mockUpdateMutateAsync = jest.fn().mockResolvedValue({});
const mockDeleteMutateAsync = jest.fn().mockResolvedValue({});

jest.mock('@/lib/queries/mealPlan', () => ({
  useSaveMealPlanMutation: jest.fn(() => ({
    mutateAsync: mockSaveMutateAsync,
    isPending: false,
  })),
  useAddEventMutation: jest.fn(() => ({
    mutateAsync: mockAddMutateAsync,
    isPending: false,
  })),
  useUpdateEventMutation: jest.fn(() => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
  })),
  useDeleteEventMutation: jest.fn(() => ({
    mutateAsync: mockDeleteMutateAsync,
    isPending: false,
  })),
}));

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
  day: DailyMealPlanOutput['day'],
  slots: MealSlotTargetOutput[]
): DailyMealPlanOutput {
  return {
    day,
    slots,
    exercise: null,
    total_calories: slots.reduce(
      (sum, s) => sum + (s.plan?.main_recipe?.nutrients.calories ?? s.calories),
      0
    ),
    total_protein: 0,
    total_carbs: 0,
    total_fat: 0,
  };
}

function makeWeeklyPlan(): WeeklyMealPlanOutput {
  const recipe = makeRecipe('recipe-1', 'Oatmeal', 350);
  const slot = makeSlot('Breakfast', '08:00:00', 350, recipe, 101);
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes planId from savedPlan', () => {
    const savedPlan = makeSavedPlan(makeWeeklyPlan());
    const { result } = renderHook(() => useScheduleEditing(savedPlan, WEEK_START), {
      wrapper: createWrapper(),
    });
    expect(result.current.planId).toBe(1);
  });

  it('isDirty is false initially', () => {
    const savedPlan = makeSavedPlan(makeWeeklyPlan());
    const { result } = renderHook(() => useScheduleEditing(savedPlan, WEEK_START), {
      wrapper: createWrapper(),
    });
    expect(result.current.isDirty).toBe(false);
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
    expect(items[0].id).toBe('101');
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

  it('statusText is "AI-optimized" when idle', () => {
    const savedPlan = makeSavedPlan(makeWeeklyPlan());
    const { result } = renderHook(() => useScheduleEditing(savedPlan, WEEK_START), {
      wrapper: createWrapper(),
    });
    expect(result.current.statusText).toBe('AI-optimized');
  });

  it('save() when not dirty does NOT call mutateAsync', async () => {
    const savedPlan = makeSavedPlan(makeWeeklyPlan());
    const { result } = renderHook(() => useScheduleEditing(savedPlan, WEEK_START), {
      wrapper: createWrapper(),
    });

    await result.current.save();

    expect(mockSaveMutateAsync).not.toHaveBeenCalled();
  });
});
