import type { ScheduleItemRead } from '@/api/types.gen';
import { getSleepLogCount } from '@/components/SleepWakePrompt';
import { useStreak } from '@/hooks/useStreak';
import { useEffect, useState } from 'react';

export type Achievement = {
  id: string;
  icon: string;
  name: string;
  description: string;
  unlocked: boolean;
};

export function useAchievements(scheduleItems: ScheduleItemRead[]): Achievement[] {
  const streak = useStreak();
  const [sleepLogged, setSleepLogged] = useState(0);

  useEffect(() => {
    getSleepLogCount().then(setSleepLogged);
  }, []);

  const mealsConfirmed = scheduleItems.filter(
    (i) => i.is_completed === true && i.activity_type === 'meal'
  ).length;
  const workoutsConfirmed = scheduleItems.filter(
    (i) => i.is_completed === true && i.activity_type === 'exercise'
  ).length;

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
      unlocked: mealsConfirmed >= 1,
    },
    {
      id: 'meal_master',
      icon: '🥗',
      name: 'Meal Master',
      description: 'Confirm 10 meals',
      unlocked: mealsConfirmed >= 10,
    },
    // ── Exercise ─────────────────────────────────────────────────────────────
    {
      id: 'first_sweat',
      icon: '💪',
      name: 'First Sweat',
      description: 'Complete your first workout',
      unlocked: workoutsConfirmed >= 1,
    },
    {
      id: 'keep_moving',
      icon: '🏃',
      name: 'Keep Moving',
      description: 'Complete 5 workouts',
      unlocked: workoutsConfirmed >= 5,
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
