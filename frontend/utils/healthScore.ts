import type { DailyMealPlanOutput, DriOutput } from '@/api/types.gen';
import type { HealthKitInputs } from '@/lib/healthkit';

// Targets — hitting these scores 100; sub-target performance scales linearly.
const ACTIVE_ENERGY_TARGET_KCAL = 400;
const STEPS_TARGET = 10000;
const SLEEP_TARGET_HOURS = 8;

// Exercise blend weights (active energy dominates because it captures intensity).
const ACTIVE_ENERGY_BLEND_WEIGHT = 0.7;
const STEPS_BLEND_WEIGHT = 0.3;

// Sleep falls off linearly away from 8h, asymmetric (under-sleep harsher than over-sleep).
// 12.5 pts/h under is exactly 100/SLEEP_TARGET_HOURS so 0h lands at 0.
const UNDER_SLEEP_SLOPE = 100 / SLEEP_TARGET_HOURS;
const OVER_SLEEP_SLOPE = 6;

// Overall weighting across the three pillars. Renormalized when a pillar is not measured.
const WEIGHT_NUTRITION = 0.4;
const WEIGHT_EXERCISE = 0.3;
const WEIGHT_SLEEP = 0.3;

export interface SubScoreResult {
  score: number;
  status: string;
}

export interface HealthScoreResult {
  overall: number | null;
  nutrition: SubScoreResult | null;
  exercise: SubScoreResult | null;
  sleep: SubScoreResult | null;
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

function linearToTarget(value: number, target: number): number {
  if (target <= 0) return 0;
  return clamp((value / target) * 100, 0, 100);
}

function finishScore(raw: number): SubScoreResult {
  const score = Math.round(raw);
  return { score, status: getStatus(score) };
}

function calculateNutritionScore(
  todayPlan: DailyMealPlanOutput | undefined,
  targets: DriOutput | undefined
): SubScoreResult | null {
  if (!todayPlan || !targets) return null;

  const macros = [
    { actual: todayPlan.total_calories, target: targets.calories.target },
    { actual: todayPlan.total_protein, target: targets.protein.target },
    { actual: todayPlan.total_carbs, target: targets.carbohydrates.target },
    { actual: todayPlan.total_fat, target: targets.fat.target },
  ];

  const usable = macros.filter((m) => m.target > 0);
  if (usable.length === 0) return null;

  const total = usable.reduce((sum, { actual, target }) => {
    const adherence = 100 - (Math.abs(actual - target) / target) * 100;
    return sum + clamp(adherence, 0, 100);
  }, 0);

  return finishScore(total / usable.length);
}

function calculateExerciseScore(hk: HealthKitInputs | undefined): SubScoreResult | null {
  // Exercise is measured only via Apple Health; plan-based values are aspirational, not real.
  const active = hk?.activeEnergyKcal ?? null;
  const steps = hk?.stepCount ?? null;
  if (active == null && steps == null) return null;

  if (active != null && steps != null) {
    const blended =
      ACTIVE_ENERGY_BLEND_WEIGHT * linearToTarget(active, ACTIVE_ENERGY_TARGET_KCAL) +
      STEPS_BLEND_WEIGHT * linearToTarget(steps, STEPS_TARGET);
    return finishScore(blended);
  }
  if (active != null) return finishScore(linearToTarget(active, ACTIVE_ENERGY_TARGET_KCAL));
  return finishScore(linearToTarget(steps as number, STEPS_TARGET));
}

function sleepScoreFromHours(hours: number): number {
  if (hours <= 0) return 0;
  const deviation = hours - SLEEP_TARGET_HOURS;
  const slope = deviation <= 0 ? UNDER_SLEEP_SLOPE : OVER_SLEEP_SLOPE;
  return clamp(100 - Math.abs(deviation) * slope, 0, 100);
}

function hoursFromSchedule(
  sleepTime: string | null | undefined,
  wakeUpTime: string | null | undefined
): number | null {
  if (!sleepTime || !wakeUpTime) return null;

  const [sleepH, sleepM] = sleepTime.split(':').map(Number);
  const [wakeH, wakeM] = wakeUpTime.split(':').map(Number);
  if ([sleepH, sleepM, wakeH, wakeM].some((n) => Number.isNaN(n))) return null;

  let sleepMinutes = sleepH * 60 + sleepM;
  const wakeMinutes = wakeH * 60 + wakeM;

  // If sleep time is later than wake time, it means yesterday evening.
  if (sleepMinutes > wakeMinutes) {
    sleepMinutes -= 24 * 60;
  }

  return (wakeMinutes - sleepMinutes) / 60;
}

function calculateSleepScore(
  sleepTime: string | null | undefined,
  wakeUpTime: string | null | undefined,
  hk: HealthKitInputs | undefined
): SubScoreResult | null {
  const hours =
    hk?.sleepMinutes != null ? hk.sleepMinutes / 60 : hoursFromSchedule(sleepTime, wakeUpTime);
  if (hours == null) return null;
  return finishScore(sleepScoreFromHours(hours));
}

export function calculateHealthScore(
  todayPlan: DailyMealPlanOutput | undefined,
  targets: DriOutput | undefined,
  user: { wake_up_time?: string | null; sleep_time?: string | null } | null | undefined,
  hasPlan: boolean,
  hkInputs?: HealthKitInputs
): HealthScoreResult {
  const nutrition = hasPlan ? calculateNutritionScore(todayPlan, targets) : null;
  const exercise = calculateExerciseScore(hkInputs);
  const sleep = calculateSleepScore(user?.sleep_time, user?.wake_up_time, hkInputs);

  // Renormalize weights across only the measured pillars.
  const parts: Array<{ score: number; weight: number }> = [];
  if (nutrition) parts.push({ score: nutrition.score, weight: WEIGHT_NUTRITION });
  if (exercise) parts.push({ score: exercise.score, weight: WEIGHT_EXERCISE });
  if (sleep) parts.push({ score: sleep.score, weight: WEIGHT_SLEEP });

  if (parts.length === 0) {
    return { overall: null, nutrition, exercise, sleep };
  }

  const weightSum = parts.reduce((acc, p) => acc + p.weight, 0);
  const weighted = parts.reduce((acc, p) => acc + (p.score * p.weight) / weightSum, 0);
  const overall = Math.round(weighted);

  return { overall, nutrition, exercise, sleep };
}
