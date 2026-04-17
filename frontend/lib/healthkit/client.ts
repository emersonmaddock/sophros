import { Platform } from 'react-native';
import {
  getMostRecentQuantitySample,
  queryCategorySamples,
  queryQuantitySamples,
  queryWorkoutSamples,
  requestAuthorization,
  saveQuantitySample,
  saveWorkoutSample,
} from '@kingstinct/react-native-healthkit';
import { permissionsFor } from './permissions';
import type {
  ActiveEnergyResult,
  BodyMetricSample,
  DietaryResult,
  Direction,
  SleepResult,
  StepsResult,
  WorkoutSample,
} from './types';

function isIOS(): boolean {
  return Platform.OS === 'ios';
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function nowISO(): string {
  return new Date().toISOString();
}

function lastNightWindow(): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(12, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 1);
  return { start, end };
}

// CategoryValueSleepAnalysis enum values (copied from the library's generated types):
//   inBed = 0, asleepUnspecified = 1, asleep = 1, awake = 2,
//   asleepCore = 3, asleepDeep = 4, asleepREM = 5
const SLEEP_ASLEEP_VALUES = new Set<number>([1, 3, 4, 5]);

// HKWorkoutActivityType enum mapping from the display names used by
// lib/healthkit/types.ts#activityTypeToHK (Running, TraditionalStrengthTraining, Other).
const WORKOUT_ACTIVITY_TYPE_BY_NAME: Record<string, number> = {
  Running: 37,
  TraditionalStrengthTraining: 50,
  Other: 3000,
};

function workoutActivityNameFromValue(value: number): string {
  for (const [name, v] of Object.entries(WORKOUT_ACTIVITY_TYPE_BY_NAME)) {
    if (v === value) return name;
  }
  return 'Other';
}

export async function initAuthorization(direction: Direction): Promise<void> {
  if (!isIOS()) return;
  const spec = permissionsFor(direction);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await requestAuthorization(spec as any);
}

export async function getStepsToday(): Promise<StepsResult> {
  if (!isIOS()) return { valueToday: 0, sampledAt: nowISO() };
  const samples = await queryQuantitySamples('HKQuantityTypeIdentifierStepCount', {
    filter: { date: { startDate: startOfToday(), endDate: new Date() } },
    limit: 0,
  });
  const total = (samples ?? []).reduce((acc, s) => acc + (s.quantity ?? 0), 0);
  return { valueToday: total, sampledAt: nowISO() };
}

export async function getActiveEnergyToday(): Promise<ActiveEnergyResult> {
  if (!isIOS()) return { kcalToday: 0, sampledAt: nowISO() };
  const samples = await queryQuantitySamples('HKQuantityTypeIdentifierActiveEnergyBurned', {
    filter: { date: { startDate: startOfToday(), endDate: new Date() } },
    limit: 0,
  });
  const total = (samples ?? []).reduce((acc, s) => acc + (s.quantity ?? 0), 0);
  return { kcalToday: total, sampledAt: nowISO() };
}

export async function getSleepLastNight(): Promise<SleepResult> {
  if (!isIOS()) return { minutesLastNight: null, startedAt: null, endedAt: null };
  const { start, end } = lastNightWindow();
  const samples = await queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
    filter: { date: { startDate: start, endDate: end } },
    limit: 0,
  });
  if (!samples || samples.length === 0) {
    return { minutesLastNight: null, startedAt: null, endedAt: null };
  }
  const asleep = samples.filter((s) => SLEEP_ASLEEP_VALUES.has(s.value as unknown as number));
  if (asleep.length === 0) {
    return { minutesLastNight: null, startedAt: null, endedAt: null };
  }
  const totalMs = asleep.reduce(
    (acc, s) => acc + (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()),
    0
  );
  const minutes = Math.round(totalMs / 60000);
  const startedAt = asleep[0]?.startDate ? new Date(asleep[0].startDate).toISOString() : null;
  const endedAt = asleep[asleep.length - 1]?.endDate
    ? new Date(asleep[asleep.length - 1].endDate).toISOString()
    : null;
  return { minutesLastNight: minutes > 0 ? minutes : null, startedAt, endedAt };
}

export async function getRecentWorkouts(days: number): Promise<WorkoutSample[]> {
  if (!isIOS()) return [];
  const start = new Date();
  start.setDate(start.getDate() - days);
  const workouts = await queryWorkoutSamples({
    filter: { date: { startDate: start, endDate: new Date() } },
    limit: 0,
  });
  return (workouts ?? []).map((w, i) => {
    const startISO = w.startDate instanceof Date ? w.startDate.toISOString() : String(w.startDate);
    const endISO = w.endDate instanceof Date ? w.endDate.toISOString() : String(w.endDate);
    const calories =
      typeof w.totalEnergyBurned?.quantity === 'number' ? w.totalEnergyBurned.quantity : null;
    return {
      id: w.uuid ?? `${startISO}-${i}`,
      activityName: workoutActivityNameFromValue(w.workoutActivityType as unknown as number),
      startISO,
      endISO,
      calories,
    };
  });
}

export async function getLatestWeight(): Promise<BodyMetricSample | null> {
  if (!isIOS()) return null;
  const s = await getMostRecentQuantitySample('HKQuantityTypeIdentifierBodyMass', 'kg');
  if (!s) return null;
  const recordedAtISO =
    s.startDate instanceof Date ? s.startDate.toISOString() : String(s.startDate ?? nowISO());
  return { value: s.quantity, unit: 'kg', recordedAtISO };
}

export async function getLatestBodyFat(): Promise<BodyMetricSample | null> {
  if (!isIOS()) return null;
  const s = await getMostRecentQuantitySample('HKQuantityTypeIdentifierBodyFatPercentage', '%');
  if (!s) return null;
  const recordedAtISO =
    s.startDate instanceof Date ? s.startDate.toISOString() : String(s.startDate ?? nowISO());
  return { value: s.quantity, unit: '%', recordedAtISO };
}

async function sumQuantityToday<T extends string>(identifier: T, unit: string): Promise<number> {
  const samples = await queryQuantitySamples(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    identifier as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    {
      filter: { date: { startDate: startOfToday(), endDate: new Date() } },
      limit: 0,
      unit,
    } as any
  );
  return (samples ?? []).reduce((acc, s) => acc + (s.quantity ?? 0), 0);
}

export async function getDietaryEnergyToday(): Promise<DietaryResult> {
  if (!isIOS()) return { totalToday: 0 };
  const total = await sumQuantityToday('HKQuantityTypeIdentifierDietaryEnergyConsumed', 'kcal');
  return { totalToday: total };
}

export async function getDietaryProteinToday(): Promise<DietaryResult> {
  if (!isIOS()) return { totalToday: 0 };
  const total = await sumQuantityToday('HKQuantityTypeIdentifierDietaryProtein', 'g');
  return { totalToday: total };
}

export async function getDietaryFatToday(): Promise<DietaryResult> {
  if (!isIOS()) return { totalToday: 0 };
  const total = await sumQuantityToday('HKQuantityTypeIdentifierDietaryFatTotal', 'g');
  return { totalToday: total };
}

export async function getDietaryCarbsToday(): Promise<DietaryResult> {
  if (!isIOS()) return { totalToday: 0 };
  const total = await sumQuantityToday('HKQuantityTypeIdentifierDietaryCarbohydrates', 'g');
  return { totalToday: total };
}

export interface SaveWeightInput {
  weightKg: number;
  recordedAtISO: string;
}

export async function saveWeight(input: SaveWeightInput): Promise<void> {
  if (!isIOS()) return;
  const at = new Date(input.recordedAtISO);
  await saveQuantitySample('HKQuantityTypeIdentifierBodyMass', 'kg', input.weightKg, at, at);
}

export interface SaveWorkoutInput {
  activityName: string; // HealthKit HKWorkoutActivityType name, e.g. "Running"
  startISO: string;
  endISO: string;
  calories?: number;
}

export async function saveWorkout(input: SaveWorkoutInput): Promise<void> {
  if (!isIOS()) return;
  const activityType =
    WORKOUT_ACTIVITY_TYPE_BY_NAME[input.activityName] ?? WORKOUT_ACTIVITY_TYPE_BY_NAME.Other;
  const start = new Date(input.startISO);
  const end = new Date(input.endISO);
  await saveWorkoutSample(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activityType as any,
    [],
    start,
    end,
    typeof input.calories === 'number' ? { energyBurned: input.calories } : undefined
  );
}

export interface SaveMealInput {
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  consumedAtISO: string;
}

export async function saveMeal(input: SaveMealInput): Promise<void> {
  if (!isIOS()) return;
  // Anchor the meal on a carbohydrates quantity sample and attach calories/protein/fat
  // in metadata so we can reconstitute the meal later.
  const at = new Date(input.consumedAtISO);
  await saveQuantitySample(
    'HKQuantityTypeIdentifierDietaryCarbohydrates',
    'g',
    input.carbsG,
    at,
    at,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    {
      HKWasUserEntered: false,
      sophrosCaloriesKcal: input.calories,
      sophrosProteinG: input.proteinG,
      sophrosFatG: input.fatG,
    } as any
  );
}
