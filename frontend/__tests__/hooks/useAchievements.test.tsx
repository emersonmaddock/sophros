import type { ScheduleItemRead } from '@/api/types.gen';
import { useAchievements } from '@/hooks/useAchievements';
import { renderHook, waitFor } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/hooks/useStreak', () => ({
  useStreak: jest.fn(),
}));

jest.mock('@/components/SleepWakePrompt', () => ({
  getSleepLogCount: jest.fn(),
}));

import { useStreak } from '@/hooks/useStreak';
import { getSleepLogCount } from '@/components/SleepWakePrompt';

const mockUseStreak = useStreak as jest.MockedFunction<typeof useStreak>;
const mockGetSleepLogCount = getSleepLogCount as jest.MockedFunction<typeof getSleepLogCount>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeScheduleItem(
  activity_type: ScheduleItemRead['activity_type'],
  is_completed: boolean
): ScheduleItemRead {
  return {
    id: Math.random(),
    user_id: 'u1',
    date: '2026-04-26T08:00:00',
    activity_type,
    is_completed,
    duration_minutes: 30,
    exercise_calorie_burn: 0,
    exercise_muscle_gain: 0,
  } as unknown as ScheduleItemRead;
}

function meals(count: number, completed = true) {
  return Array.from({ length: count }, () => makeScheduleItem('meal', completed));
}

function workouts(count: number, completed = true) {
  return Array.from({ length: count }, () => makeScheduleItem('exercise', completed));
}

function renderAchievements(scheduleItems: ScheduleItemRead[] = []) {
  return renderHook(() => useAchievements(scheduleItems));
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockUseStreak.mockReturnValue(0);
  mockGetSleepLogCount.mockResolvedValue(0);
});

// ---------------------------------------------------------------------------
// Streak achievements
// ---------------------------------------------------------------------------

describe('streak achievements', () => {
  it('all streak achievements are locked when streak is 0', async () => {
    mockUseStreak.mockReturnValue(0);
    const { result } = renderAchievements();
    await waitFor(() => {
      const ids = result.current.filter((a) => !a.unlocked).map((a) => a.id);
      expect(ids).toEqual(
        expect.arrayContaining(['first_step', 'on_a_roll', 'week_warrior', 'unstoppable'])
      );
    });
  });

  it('first_step unlocks at streak >= 1', async () => {
    mockUseStreak.mockReturnValue(1);
    const { result } = renderAchievements();
    await waitFor(() => {
      expect(result.current.find((a) => a.id === 'first_step')?.unlocked).toBe(true);
      expect(result.current.find((a) => a.id === 'on_a_roll')?.unlocked).toBe(false);
    });
  });

  it('on_a_roll unlocks at streak >= 3', async () => {
    mockUseStreak.mockReturnValue(3);
    const { result } = renderAchievements();
    await waitFor(() => {
      expect(result.current.find((a) => a.id === 'first_step')?.unlocked).toBe(true);
      expect(result.current.find((a) => a.id === 'on_a_roll')?.unlocked).toBe(true);
      expect(result.current.find((a) => a.id === 'week_warrior')?.unlocked).toBe(false);
    });
  });

  it('week_warrior unlocks at streak >= 7', async () => {
    mockUseStreak.mockReturnValue(7);
    const { result } = renderAchievements();
    await waitFor(() => {
      expect(result.current.find((a) => a.id === 'week_warrior')?.unlocked).toBe(true);
      expect(result.current.find((a) => a.id === 'unstoppable')?.unlocked).toBe(false);
    });
  });

  it('unstoppable unlocks at streak >= 30', async () => {
    mockUseStreak.mockReturnValue(30);
    const { result } = renderAchievements();
    await waitFor(() => {
      expect(result.current.find((a) => a.id === 'unstoppable')?.unlocked).toBe(true);
    });
  });

  it('streak of 29 does not unlock unstoppable', async () => {
    mockUseStreak.mockReturnValue(29);
    const { result } = renderAchievements();
    await waitFor(() => {
      expect(result.current.find((a) => a.id === 'unstoppable')?.unlocked).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Meal achievements
// ---------------------------------------------------------------------------

describe('meal achievements', () => {
  it('first_bite and meal_master are locked with no completed meals', async () => {
    const { result } = renderAchievements([]);
    await waitFor(() => {
      expect(result.current.find((a) => a.id === 'first_bite')?.unlocked).toBe(false);
      expect(result.current.find((a) => a.id === 'meal_master')?.unlocked).toBe(false);
    });
  });

  it('first_bite unlocks when 1 meal is completed', async () => {
    const { result } = renderAchievements(meals(1));
    await waitFor(() => {
      expect(result.current.find((a) => a.id === 'first_bite')?.unlocked).toBe(true);
      expect(result.current.find((a) => a.id === 'meal_master')?.unlocked).toBe(false);
    });
  });

  it('meal_master unlocks when 10 meals are completed', async () => {
    const { result } = renderAchievements(meals(10));
    await waitFor(() => {
      expect(result.current.find((a) => a.id === 'first_bite')?.unlocked).toBe(true);
      expect(result.current.find((a) => a.id === 'meal_master')?.unlocked).toBe(true);
    });
  });

  it('incomplete meals do not count toward meal achievements', async () => {
    const { result } = renderAchievements(meals(10, false));
    await waitFor(() => {
      expect(result.current.find((a) => a.id === 'first_bite')?.unlocked).toBe(false);
    });
  });

  it('non-meal completed items do not count toward meal achievements', async () => {
    const { result } = renderAchievements(workouts(10));
    await waitFor(() => {
      expect(result.current.find((a) => a.id === 'first_bite')?.unlocked).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Exercise achievements
// ---------------------------------------------------------------------------

describe('exercise achievements', () => {
  it('first_sweat and keep_moving are locked with no completed workouts', async () => {
    const { result } = renderAchievements([]);
    await waitFor(() => {
      expect(result.current.find((a) => a.id === 'first_sweat')?.unlocked).toBe(false);
      expect(result.current.find((a) => a.id === 'keep_moving')?.unlocked).toBe(false);
    });
  });

  it('first_sweat unlocks when 1 workout is completed', async () => {
    const { result } = renderAchievements(workouts(1));
    await waitFor(() => {
      expect(result.current.find((a) => a.id === 'first_sweat')?.unlocked).toBe(true);
      expect(result.current.find((a) => a.id === 'keep_moving')?.unlocked).toBe(false);
    });
  });

  it('keep_moving unlocks when 5 workouts are completed', async () => {
    const { result } = renderAchievements(workouts(5));
    await waitFor(() => {
      expect(result.current.find((a) => a.id === 'first_sweat')?.unlocked).toBe(true);
      expect(result.current.find((a) => a.id === 'keep_moving')?.unlocked).toBe(true);
    });
  });

  it('incomplete workouts do not count toward exercise achievements', async () => {
    const { result } = renderAchievements(workouts(5, false));
    await waitFor(() => {
      expect(result.current.find((a) => a.id === 'first_sweat')?.unlocked).toBe(false);
    });
  });

  it('4 workouts does not unlock keep_moving', async () => {
    const { result } = renderAchievements(workouts(4));
    await waitFor(() => {
      expect(result.current.find((a) => a.id === 'keep_moving')?.unlocked).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Sleep achievements
// ---------------------------------------------------------------------------

describe('sleep achievements', () => {
  it('sleep_starter and sweet_dreams are locked when sleep log count is 0', async () => {
    mockGetSleepLogCount.mockResolvedValue(0);
    const { result } = renderAchievements();
    await waitFor(() => {
      expect(result.current.find((a) => a.id === 'sleep_starter')?.unlocked).toBe(false);
      expect(result.current.find((a) => a.id === 'sweet_dreams')?.unlocked).toBe(false);
    });
  });

  it('sleep_starter unlocks when sleep has been logged at least once', async () => {
    mockGetSleepLogCount.mockResolvedValue(1);
    const { result } = renderAchievements();
    await waitFor(() => {
      expect(result.current.find((a) => a.id === 'sleep_starter')?.unlocked).toBe(true);
      expect(result.current.find((a) => a.id === 'sweet_dreams')?.unlocked).toBe(false);
    });
  });

  it('sweet_dreams unlocks when sleep has been logged 7 times', async () => {
    mockGetSleepLogCount.mockResolvedValue(7);
    const { result } = renderAchievements();
    await waitFor(() => {
      expect(result.current.find((a) => a.id === 'sleep_starter')?.unlocked).toBe(true);
      expect(result.current.find((a) => a.id === 'sweet_dreams')?.unlocked).toBe(true);
    });
  });

  it('6 sleep logs does not unlock sweet_dreams', async () => {
    mockGetSleepLogCount.mockResolvedValue(6);
    const { result } = renderAchievements();
    await waitFor(() => {
      expect(result.current.find((a) => a.id === 'sweet_dreams')?.unlocked).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Return shape
// ---------------------------------------------------------------------------

describe('return shape', () => {
  it('always returns exactly 10 achievements', async () => {
    const { result } = renderAchievements();
    await waitFor(() => {
      expect(result.current).toHaveLength(10);
    });
  });

  it('every achievement has id, icon, name, description, and unlocked fields', async () => {
    const { result } = renderAchievements();
    await waitFor(() => {
      for (const achievement of result.current) {
        expect(achievement).toMatchObject({
          id: expect.any(String),
          icon: expect.any(String),
          name: expect.any(String),
          description: expect.any(String),
          unlocked: expect.any(Boolean),
        });
      }
    });
  });
});
