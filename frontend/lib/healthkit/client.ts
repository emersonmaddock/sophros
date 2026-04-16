import { Platform } from 'react-native';
import AppleHealthKit from 'react-native-health';
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

type Callback<T> = (err: string | null, result: T) => void;

function isIOS(): boolean {
  return Platform.OS === 'ios';
}

function promisify<T>(fn: (cb: Callback<T>) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    fn((err, result) => (err ? reject(new Error(err)) : resolve(result)));
  });
}

function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function nowISO(): string {
  return new Date().toISOString();
}

function lastNightWindow(): { start: string; end: string } {
  const end = new Date();
  end.setHours(12, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function initAuthorization(direction: Direction): Promise<void> {
  if (!isIOS()) return;
  const spec = permissionsFor(direction);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await promisify<void>((cb) =>
    AppleHealthKit.initHealthKit(spec as any, (err: string | null) =>
      cb(err, undefined as unknown as void)
    )
  );
}

export async function getStepsToday(): Promise<StepsResult> {
  if (!isIOS()) return { valueToday: 0, sampledAt: nowISO() };
  const result = await promisify<{ value: number }>((cb) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    AppleHealthKit.getStepCount({ startDate: startOfTodayISO() }, cb as any)
  );
  return { valueToday: result?.value ?? 0, sampledAt: nowISO() };
}

export async function getActiveEnergyToday(): Promise<ActiveEnergyResult> {
  if (!isIOS()) return { kcalToday: 0, sampledAt: nowISO() };
  const result = await promisify<{ value: number }>((cb) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    AppleHealthKit.getActiveEnergyBurned({ startDate: startOfTodayISO() }, cb as any)
  );
  return { kcalToday: result?.value ?? 0, sampledAt: nowISO() };
}

export async function getSleepLastNight(): Promise<SleepResult> {
  if (!isIOS()) return { minutesLastNight: null, startedAt: null, endedAt: null };
  const { start, end } = lastNightWindow();
  const samples = await promisify<Array<{ startDate: string; endDate: string; value: string }>>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (cb) => AppleHealthKit.getSleepSamples({ startDate: start, endDate: end }, cb as any)
  );
  if (!samples || samples.length === 0) {
    return { minutesLastNight: null, startedAt: null, endedAt: null };
  }
  // Sum "asleep" segments. Values: INBED, ASLEEP, AWAKE, CORE, DEEP, REM.
  const asleep = samples.filter((s) => s.value !== 'INBED' && s.value !== 'AWAKE');
  const totalMs = asleep.reduce(
    (acc, s) => acc + (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()),
    0
  );
  const minutes = Math.round(totalMs / 60000);
  const startedAt = asleep[0]?.startDate ?? null;
  const endedAt = asleep[asleep.length - 1]?.endDate ?? null;
  return { minutesLastNight: minutes > 0 ? minutes : null, startedAt, endedAt };
}

export async function getRecentWorkouts(days: number): Promise<WorkoutSample[]> {
  if (!isIOS()) return [];
  const start = new Date();
  start.setDate(start.getDate() - days);
  const result = await promisify<{
    data: Array<{
      id?: string;
      activityName?: string;
      calories?: number;
      start: string;
      end: string;
    }>;
  }>((cb) =>
    AppleHealthKit.getAnchoredWorkouts(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { startDate: start.toISOString(), type: 'Workout' as any },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cb as any
    )
  );
  return (result?.data ?? []).map((w, i) => ({
    id: w.id ?? `${w.start}-${i}`,
    activityName: w.activityName ?? 'Other',
    startISO: w.start,
    endISO: w.end,
    calories: typeof w.calories === 'number' ? w.calories : null,
  }));
}

export async function getLatestWeight(): Promise<BodyMetricSample | null> {
  if (!isIOS()) return null;
  const r = await promisify<{ value: number; startDate?: string } | null>((cb) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    AppleHealthKit.getLatestWeight({ unit: 'kg' as any }, cb as any)
  );
  if (!r) return null;
  return { value: r.value, unit: 'kg', recordedAtISO: r.startDate ?? nowISO() };
}

export async function getLatestBodyFat(): Promise<BodyMetricSample | null> {
  if (!isIOS()) return null;
  const samples = await promisify<Array<{ value: number; startDate: string }>>((cb) =>
    AppleHealthKit.getBodyFatPercentageSamples(
      { startDate: new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString(), limit: 1 },
      cb
    )
  );
  const s = samples?.[0];
  if (!s) return null;
  return { value: s.value, unit: '%', recordedAtISO: s.startDate };
}

async function sumSamplesToday(
  method:
    | 'getEnergyConsumedSamples'
    | 'getProteinSamples'
    | 'getFatTotalSamples'
    | 'getCarbohydratesSamples'
): Promise<DietaryResult> {
  if (!isIOS()) return { totalToday: 0 };
  const samples = await promisify<Array<{ value: number }>>((cb) =>
    (AppleHealthKit as unknown as Record<string, (o: unknown, c: Callback<unknown>) => void>)[
      method
    ]({ startDate: startOfTodayISO(), endDate: nowISO() }, cb as Callback<unknown>)
  );
  const total = (samples ?? []).reduce((acc, s) => acc + (s.value ?? 0), 0);
  return { totalToday: total };
}

export const getDietaryEnergyToday = () => sumSamplesToday('getEnergyConsumedSamples');
export const getDietaryProteinToday = () => sumSamplesToday('getProteinSamples');
export const getDietaryFatToday = () => sumSamplesToday('getFatTotalSamples');
export const getDietaryCarbsToday = () => sumSamplesToday('getCarbohydratesSamples');

export interface SaveWeightInput {
  weightKg: number;
  recordedAtISO: string;
}

export async function saveWeight(input: SaveWeightInput): Promise<void> {
  if (!isIOS()) return;
  // HealthUnit has no 'kilogram' — convert kg to grams before writing so the stored
  // sample represents the user's real weight in HealthKit.
  const valueInGrams = input.weightKg * 1000;
  await promisify<string>((cb) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    AppleHealthKit.saveWeight({ value: valueInGrams, unit: 'gram' } as any, cb as any)
  );
}

export interface SaveWorkoutInput {
  activityName: string; // HealthKit HKWorkoutActivityType name, e.g. "Running"
  startISO: string;
  endISO: string;
  calories?: number;
}

export async function saveWorkout(input: SaveWorkoutInput): Promise<void> {
  if (!isIOS()) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await promisify<string>((cb) =>
    AppleHealthKit.saveWorkout(
      {
        type: input.activityName,
        startDate: input.startISO,
        endDate: input.endISO,
        energyBurned: input.calories ?? 0,
        energyBurnedUnit: 'calorie',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cb as any
    )
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
  // saveFood writes a combined nutrition sample; react-native-health accepts value+date+metadata.
  // Here we use the carb sample as the anchor and attach calories/protein/fat in metadata.
  await promisify<string>((cb) =>
    AppleHealthKit.saveFood(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {
        value: input.carbsG,
        date: input.consumedAtISO,
        unit: 'gramUnit',
        metadata: {
          HKWasUserEntered: false,
          sophrosCaloriesKcal: input.calories,
          sophrosProteinG: input.proteinG,
          sophrosFatG: input.fatG,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cb as any
    )
  );
}
