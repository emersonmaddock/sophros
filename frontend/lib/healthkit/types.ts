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

export type AppActivityType = 'cardio' | 'weightlifting';

const ACTIVITY_MAP: Record<AppActivityType, string> = {
  cardio: 'Running',
  weightlifting: 'TraditionalStrengthTraining',
};

export function activityTypeToHK(t: AppActivityType | string): string {
  if (t in ACTIVITY_MAP) return ACTIVITY_MAP[t as AppActivityType];
  return 'Other';
}
