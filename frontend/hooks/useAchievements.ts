/**
 * useAchievements — derives achievement unlock states from:
 *   - useStreak()       → login-streak achievements
 *   - useConfirmations() → meal / workout completion counts (persisted across sessions)
 *   - getSleepLogCount() → number of times the user has submitted the sleep form
 *
 * Meal/workout counts are persisted in AsyncStorage under 'achievements_data' so
 * they survive app restarts. New 'done' confirmations are detected by comparing
 * against a seen-set (keyed by id + dateStr to avoid double-counting the same
 * confirmed item when the component re-renders).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConfirmations } from '@/contexts/ConfirmationsContext';
import { getSleepLogCount } from '@/components/SleepWakePrompt';
import { useStreak } from '@/hooks/useStreak';
import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'achievements_data';

type PersistedData = {
  mealsConfirmed: number;
  workoutsConfirmed: number;
};

export type Achievement = {
  id: string;
  icon: string;
  name: string;
  description: string;
  unlocked: boolean;
};

const DEFAULT_DATA: PersistedData = { mealsConfirmed: 0, workoutsConfirmed: 0 };

export function useAchievements(): Achievement[] {
  const { confirmations } = useConfirmations();
  const streak = useStreak();
  const [data, setData] = useState<PersistedData>(DEFAULT_DATA);
  const [sleepLogged, setSleepLogged] = useState(0);
  // Track which confirmation keys we've already counted to avoid double-incrementing
  const seenRef = useRef<Set<string>>(new Set());

  // Load persisted counts on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) setData(JSON.parse(raw));
    });
    getSleepLogCount().then(setSleepLogged);
  }, []);

  // Detect newly confirmed meals and workouts, persist updated counts
  useEffect(() => {
    let newMeals = 0;
    let newWorkouts = 0;

    for (const [id, conf] of Object.entries(confirmations)) {
      if (conf.status !== 'done') continue;
      const key = `${id}:${conf.dateStr}`;
      if (seenRef.current.has(key)) continue;
      seenRef.current.add(key);
      if (id.startsWith('exercise-')) {
        newWorkouts += 1;
      } else {
        newMeals += 1;
      }
    }

    if (newMeals === 0 && newWorkouts === 0) return;

    setData((prev) => {
      const next: PersistedData = {
        mealsConfirmed: prev.mealsConfirmed + newMeals,
        workoutsConfirmed: prev.workoutsConfirmed + newWorkouts,
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [confirmations]);

  return [
    // ── Consistency ──────────────────────────────────────────────────────────
    {
      id: 'first_step',
      icon: '👋',
      name: 'First Step',
      description: 'Open the app for the first time',
      unlocked: streak >= 1,
    },
    {
      id: 'on_a_roll',
      icon: '🔥',
      name: 'On a Roll',
      description: 'Log in 3 days in a row',
      unlocked: streak >= 3,
    },
    {
      id: 'week_warrior',
      icon: '📅',
      name: 'Week Warrior',
      description: 'Log in 7 days in a row',
      unlocked: streak >= 7,
    },
    {
      id: 'unstoppable',
      icon: '🏆',
      name: 'Unstoppable',
      description: 'Log in 30 days in a row',
      unlocked: streak >= 30,
    },
    // ── Meals ────────────────────────────────────────────────────────────────
    {
      id: 'first_bite',
      icon: '🍽️',
      name: 'First Bite',
      description: 'Confirm your first meal',
      unlocked: data.mealsConfirmed >= 1,
    },
    {
      id: 'meal_master',
      icon: '🥗',
      name: 'Meal Master',
      description: 'Confirm 10 meals',
      unlocked: data.mealsConfirmed >= 10,
    },
    // ── Exercise ─────────────────────────────────────────────────────────────
    {
      id: 'first_sweat',
      icon: '💪',
      name: 'First Sweat',
      description: 'Complete your first workout',
      unlocked: data.workoutsConfirmed >= 1,
    },
    {
      id: 'keep_moving',
      icon: '🏃',
      name: 'Keep Moving',
      description: 'Complete 5 workouts',
      unlocked: data.workoutsConfirmed >= 5,
    },
    // ── Sleep ────────────────────────────────────────────────────────────────
    {
      id: 'sleep_starter',
      icon: '🌙',
      name: 'Sleep Starter',
      description: 'Log your sleep for the first time',
      unlocked: sleepLogged >= 1,
    },
    {
      id: 'sweet_dreams',
      icon: '😴',
      name: 'Sweet Dreams',
      description: 'Log your sleep 7 times',
      unlocked: sleepLogged >= 7,
    },
  ];
}
