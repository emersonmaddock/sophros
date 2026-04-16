import type { DailyMealPlanOutput, DriOutput, ExerciseRecommendation } from '@/api/types.gen';
import type { HealthKitInputs } from '@/lib/healthkit';

const ACTIVE_ENERGY_EXCELLENT_KCAL = 200;
const STEPS_GOOD_THRESHOLD = 8000;
const ACTIVE_ENERGY_EXCELLENT_SCORE = 100;
const STEPS_GOOD_SCORE = 85;

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

function calculateExerciseScoreFromPlan(
  exercise: ExerciseRecommendation | null | undefined
): number {
  if (!exercise) return 30;
  if (exercise.calories_burned && exercise.calories_burned > 0) return 100;
  return 85;
}

function calculateExerciseScore(
  hasPlan: boolean,
  exercise: ExerciseRecommendation | null | undefined,
  hk: HealthKitInputs | undefined
): number {
  if (!hasPlan && !hk) return 0;
  // HealthKit inputs win when they cross the thresholds.
  if (hk?.activeEnergyKcal != null && hk.activeEnergyKcal >= ACTIVE_ENERGY_EXCELLENT_KCAL) {
    return ACTIVE_ENERGY_EXCELLENT_SCORE;
  }
  if (hk?.stepCount != null && hk.stepCount >= STEPS_GOOD_THRESHOLD) {
    return STEPS_GOOD_SCORE;
  }
  if (!hasPlan) return 0;
  return calculateExerciseScoreFromPlan(exercise);
}

function calculateSleepScoreFromSchedule(
  sleepTime: string | null | undefined,
  wakeUpTime: string | null | undefined
): number {
  if (!sleepTime || !wakeUpTime) return 70;

  const [sleepH, sleepM] = sleepTime.split(':').map(Number);
  const [wakeH, wakeM] = wakeUpTime.split(':').map(Number);

  let sleepMinutes = sleepH * 60 + sleepM;
  const wakeMinutes = wakeH * 60 + wakeM;

  if (sleepMinutes > wakeMinutes) {
    sleepMinutes -= 24 * 60;
  }

  const hours = (wakeMinutes - sleepMinutes) / 60;

  if (hours >= 7 && hours <= 9) return 100;
  if ((hours >= 6 && hours < 7) || (hours > 9 && hours <= 10)) return 75;
  return 50;
}

function calculateSleepScoreFromMinutes(minutes: number): number {
  const hours = minutes / 60;
  if (hours >= 7 && hours <= 9) return 100;
  if ((hours >= 6 && hours < 7) || (hours > 9 && hours <= 10)) return 75;
  return 50;
}

function calculateSleepScore(
  sleepTime: string | null | undefined,
  wakeUpTime: string | null | undefined,
  hk: HealthKitInputs | undefined
): number {
  if (hk?.sleepMinutes != null) {
    return calculateSleepScoreFromMinutes(hk.sleepMinutes);
  }
  return calculateSleepScoreFromSchedule(sleepTime, wakeUpTime);
}

export function calculateHealthScore(
  todayPlan: DailyMealPlanOutput | undefined,
  targets: DriOutput | undefined,
  user: { wake_up_time?: string | null; sleep_time?: string | null } | null | undefined,
  hasPlan: boolean,
  hkInputs?: HealthKitInputs
): HealthScoreResult {
  const nutritionScore = calculateNutritionScore(todayPlan, targets);
  const exerciseScore = calculateExerciseScore(hasPlan, todayPlan?.exercise, hkInputs);
  const sleepScore = calculateSleepScore(user?.sleep_time, user?.wake_up_time, hkInputs);

  const overall = Math.round(nutritionScore * 0.4 + exerciseScore * 0.3 + sleepScore * 0.3);

  return {
    overall,
    nutrition: { score: nutritionScore, status: getStatus(nutritionScore) },
    exercise: { score: exerciseScore, status: getStatus(exerciseScore) },
    sleep: { score: sleepScore, status: getStatus(sleepScore) },
  };
}
