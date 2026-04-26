import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import * as client from './client';
import { useHealthKit } from './provider';
import type { SaveMealInput, SaveWeightInput, SaveWorkoutInput } from './client';

function useGated<TInput>(
  fn: (input: TInput) => Promise<void>
): UseMutationResult<void, Error, TInput> {
  const { direction } = useHealthKit();
  return useMutation({
    mutationFn: async (input: TInput) => {
      if (direction !== 'readWrite') return;
      await fn(input);
    },
  });
}

export function useLogWeight() {
  return useGated<SaveWeightInput>(client.saveWeight);
}

export function useLogWorkout() {
  return useGated<SaveWorkoutInput>(client.saveWorkout);
}

export function useLogMeal() {
  return useGated<SaveMealInput>(client.saveMeal);
}
