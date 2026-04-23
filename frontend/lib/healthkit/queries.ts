import { Platform } from 'react-native';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import * as client from './client';
import { useHealthKit } from './provider';
import type {
  ActiveEnergyResult,
  BodyMetricSample,
  DietaryResult,
  SleepResult,
  StepsResult,
  WorkoutSample,
} from './types';

const STALE_TIME_MS = 5 * 60 * 1000;
const GC_TIME_MS = 15 * 60 * 1000;

function enabledNow(direction: string): boolean {
  return direction !== 'off' && Platform.OS === 'ios';
}

export function useStepsToday(): UseQueryResult<StepsResult> {
  const { direction } = useHealthKit();
  return useQuery({
    queryKey: ['healthkit', 'steps'],
    queryFn: client.getStepsToday,
    enabled: enabledNow(direction),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}

export function useActiveEnergyToday(): UseQueryResult<ActiveEnergyResult> {
  const { direction } = useHealthKit();
  return useQuery({
    queryKey: ['healthkit', 'activeEnergy'],
    queryFn: client.getActiveEnergyToday,
    enabled: enabledNow(direction),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}

export function useSleepLastNight(): UseQueryResult<SleepResult> {
  const { direction } = useHealthKit();
  return useQuery({
    queryKey: ['healthkit', 'sleep'],
    queryFn: client.getSleepLastNight,
    enabled: enabledNow(direction),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}

export function useRecentWorkouts(days = 7): UseQueryResult<WorkoutSample[]> {
  const { direction } = useHealthKit();
  return useQuery({
    queryKey: ['healthkit', 'workouts', days],
    queryFn: () => client.getRecentWorkouts(days),
    enabled: enabledNow(direction),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}

export function useLatestWeight(): UseQueryResult<BodyMetricSample | null> {
  const { direction } = useHealthKit();
  return useQuery({
    queryKey: ['healthkit', 'weight'],
    queryFn: client.getLatestWeight,
    enabled: enabledNow(direction),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}

export function useLatestBodyFat(): UseQueryResult<BodyMetricSample | null> {
  const { direction } = useHealthKit();
  return useQuery({
    queryKey: ['healthkit', 'bodyFat'],
    queryFn: client.getLatestBodyFat,
    enabled: enabledNow(direction),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}

export function useDietaryEnergyToday(): UseQueryResult<DietaryResult> {
  const { direction } = useHealthKit();
  return useQuery({
    queryKey: ['healthkit', 'dietaryEnergy'],
    queryFn: client.getDietaryEnergyToday,
    enabled: enabledNow(direction),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}

export function useDietaryProteinToday(): UseQueryResult<DietaryResult> {
  const { direction } = useHealthKit();
  return useQuery({
    queryKey: ['healthkit', 'dietaryProtein'],
    queryFn: client.getDietaryProteinToday,
    enabled: enabledNow(direction),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}

export function useDietaryFatToday(): UseQueryResult<DietaryResult> {
  const { direction } = useHealthKit();
  return useQuery({
    queryKey: ['healthkit', 'dietaryFat'],
    queryFn: client.getDietaryFatToday,
    enabled: enabledNow(direction),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}

export function useDietaryCarbsToday(): UseQueryResult<DietaryResult> {
  const { direction } = useHealthKit();
  return useQuery({
    queryKey: ['healthkit', 'dietaryCarbs'],
    queryFn: client.getDietaryCarbsToday,
    enabled: enabledNow(direction),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}
