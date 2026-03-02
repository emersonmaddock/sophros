import type { DailyMealPlanOutput, DriOutput, ExerciseRecommendation } from '@/api/types.gen';

export interface HealthScoreResult {
  overall: number;
  nutrition: { score: number; status: string };
  exercise: { score: number; status: string };
  sleep: { score: number; status: string };
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

function calculateNutritionScore(
  todayPlan: DailyMealPlanOutput | undefined,
  targets: DriOutput | undefined
): number {
  if (!todayPlan || !targets) return 0;

  const macros = [
    { actual: todayPlan.total_calories, target: targets.calories.target },
    { actual: todayPlan.total_protein, target: targets.protein.target },
    { actual: todayPlan.total_carbs, target: targets.carbohydrates.target },
    { actual: todayPlan.total_fat, target: targets.fat.target },
  ];

  const total = macros.reduce((sum, { actual, target }) => {
    if (target === 0) return sum;
    const adherence = 100 - (Math.abs(actual - target) / target) * 100;
    return sum + clamp(adherence, 0, 100);
  }, 0);

  return Math.round(total / macros.length);
}

function calculateExerciseScore(exercise: ExerciseRecommendation | null | undefined): number {
  if (!exercise) return 30;
  if (exercise.calories_burned && exercise.calories_burned > 0) return 100;
  return 85;
}

function calculateSleepScore(
  sleepTime: string | null | undefined,
  wakeUpTime: string | null | undefined
): number {
  if (!sleepTime || !wakeUpTime) return 70;

  const [sleepH, sleepM] = sleepTime.split(':').map(Number);
  const [wakeH, wakeM] = wakeUpTime.split(':').map(Number);

  let sleepMinutes = sleepH * 60 + sleepM;
  const wakeMinutes = wakeH * 60 + wakeM;

  // If sleep time is in the evening (after noon), it's the night before
  if (sleepMinutes > wakeMinutes) {
    sleepMinutes -= 24 * 60;
  }

  const hours = (wakeMinutes - sleepMinutes) / 60;

  if (hours >= 7 && hours <= 9) return 100;
  if ((hours >= 6 && hours < 7) || (hours > 9 && hours <= 10)) return 75;
  return 50;
}

export function calculateHealthScore(
  todayPlan: DailyMealPlanOutput | undefined,
  targets: DriOutput | undefined,
  user: { wake_up_time?: string | null; sleep_time?: string | null } | null | undefined,
  hasPlan: boolean
): HealthScoreResult {
  const nutritionScore = calculateNutritionScore(todayPlan, targets);
  const exerciseScore = hasPlan ? calculateExerciseScore(todayPlan?.exercise) : 0;
  const sleepScore = calculateSleepScore(user?.sleep_time, user?.wake_up_time);

  const overall = Math.round(nutritionScore * 0.4 + exerciseScore * 0.3 + sleepScore * 0.3);

  return {
    overall,
    nutrition: { score: nutritionScore, status: getStatus(nutritionScore) },
    exercise: { score: exerciseScore, status: getStatus(exerciseScore) },
    sleep: { score: sleepScore, status: getStatus(sleepScore) },
  };
}
