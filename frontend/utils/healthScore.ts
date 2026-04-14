// frontend/utils/healthScore.ts
import type { DriOutput } from '@/api/types.gen';

export interface HealthScoreResult {
  overall: number;
  nutrition: { score: number; status: string };
  exercise: { score: number; status: string };
  sleep: { score: number; status: string };
}

interface DailyTotals {
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
}

function getStatus(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Needs Work';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function calculateNutritionScore(totals: DailyTotals | undefined, targets: DriOutput | undefined): number {
  if (!totals || !targets) return 0;
  const macros = [
    { actual: totals.total_calories, target: targets.calories.target },
    { actual: totals.total_protein, target: targets.protein.target },
    { actual: totals.total_carbs, target: targets.carbohydrates.target },
    { actual: totals.total_fat, target: targets.fat.target },
  ];
  const total = macros.reduce((sum, { actual, target }) => {
    if (target === 0) return sum;
    return sum + clamp(100 - (Math.abs(actual - target) / target) * 100, 0, 100);
  }, 0);
  return Math.round(total / macros.length);
}

function calculateSleepScore(sleepTime: string | null | undefined, wakeUpTime: string | null | undefined): number {
  if (!sleepTime || !wakeUpTime) return 70;
  const [sleepH, sleepM] = sleepTime.split(':').map(Number);
  const [wakeH, wakeM] = wakeUpTime.split(':').map(Number);
  let sleepMins = sleepH * 60 + sleepM;
  const wakeMins = wakeH * 60 + wakeM;
  if (sleepMins > wakeMins) sleepMins -= 24 * 60;
  const hours = (wakeMins - sleepMins) / 60;
  if (hours >= 7 && hours <= 9) return 100;
  if ((hours >= 6 && hours < 7) || (hours > 9 && hours <= 10)) return 75;
  return 50;
}

export function calculateHealthScore(
  todayTotals: DailyTotals | undefined,
  targets: DriOutput | undefined,
  user: { wake_up_time?: string | null; sleep_time?: string | null } | null | undefined,
  hasPlan: boolean,
): HealthScoreResult {
  const nutritionScore = hasPlan ? calculateNutritionScore(todayTotals, targets) : 0;
  const exerciseScore = hasPlan ? 70 : 0;  // exercise score requires schedule exercise items (future)
  const sleepScore = calculateSleepScore(user?.sleep_time, user?.wake_up_time);
  const overall = Math.round(nutritionScore * 0.4 + exerciseScore * 0.3 + sleepScore * 0.3);
  return {
    overall,
    nutrition: { score: nutritionScore, status: getStatus(nutritionScore) },
    exercise: { score: exerciseScore, status: getStatus(exerciseScore) },
    sleep: { score: sleepScore, status: getStatus(sleepScore) },
  };
}
