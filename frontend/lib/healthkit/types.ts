import type { ExerciseCategory } from '@/api/types.gen';

export type Direction = 'off' | 'read' | 'readWrite';

export type MetricKey =
  | 'steps'
  | 'activeEnergy'
  | 'sleep'
  | 'workouts'
  | 'weight'
  | 'bodyFat'
  | 'dietaryEnergy'
  | 'dietaryProtein'
  | 'dietaryFat'
  | 'dietaryCarbs';

export interface StepsResult {
  valueToday: number;
  sampledAt: string;
}

export interface ActiveEnergyResult {
  kcalToday: number;
  sampledAt: string;
}

export interface SleepResult {
  minutesLastNight: number | null;
  startedAt: string | null;
  endedAt: string | null;
}

export interface WorkoutSample {
  id: string;
  activityName: string;
  startISO: string;
  endISO: string;
  calories: number | null;
}

export interface BodyMetricSample {
  value: number;
  unit: string;
  recordedAtISO: string;
}

export interface DietaryResult {
  totalToday: number;
}

const ACTIVITY_MAP: Record<ExerciseCategory, string> = {
  Cardio: 'Running',
  'Weight Lifting': 'TraditionalStrengthTraining',
};

export function activityTypeToHK(t: ExerciseCategory | string): string {
  if (Object.hasOwn(ACTIVITY_MAP, t)) return ACTIVITY_MAP[t as ExerciseCategory];
  return 'Other';
}
