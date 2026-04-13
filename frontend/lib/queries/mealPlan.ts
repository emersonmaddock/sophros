// frontend/lib/queries/mealPlan.ts
import {
  generateWeekPlanApiV1MealPlansGenerateWeekPost,
  getPlannedWeeksApiV1MealPlansPlannedWeeksGet,
} from '@/api/sdk.gen';
import type { ScheduleItemRead } from '@/api/types.gen';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scheduleKeys } from './schedule';

export const mealPlanKeys = {
  all: ['mealPlan'] as const,
  plannedWeeks: () => [...mealPlanKeys.all, 'plannedWeeks'] as const,
};

/**
 * Generate a weekly meal plan and persist it as schedule items.
 * On success, populates the schedule cache for that week.
 */
export function useGenerateWeekPlanMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (weekStartDate: string): Promise<ScheduleItemRead[]> => {
      const response = await generateWeekPlanApiV1MealPlansGenerateWeekPost({
        query: { week_start_date: weekStartDate },
      });
      if (response.error || !response.data) {
        const detail = (response.error as any)?.detail || 'Failed to generate weekly meal plan';
        throw new Error(detail);
      }
      return response.data;
    },
    onSuccess: (data, weekStartDate) => {
      queryClient.setQueryData(scheduleKeys.week(weekStartDate), data);
      queryClient.invalidateQueries({ queryKey: mealPlanKeys.plannedWeeks() });
    },
  });
}

/**
 * Fetch all weeks that have planned meal items (list of Monday date strings).
 */
export function usePlannedWeeksQuery() {
  return useQuery({
    queryKey: mealPlanKeys.plannedWeeks(),
    queryFn: async () => {
      const response = await getPlannedWeeksApiV1MealPlansPlannedWeeksGet();
      if (response.error) throw new Error('Failed to fetch planned weeks');
      return response.data ?? [];
    },
  });
}
