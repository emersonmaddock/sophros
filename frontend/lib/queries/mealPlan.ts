import {
  generateMealPlanApiV1MealPlansGeneratePost,
  generateWeekPlanApiV1MealPlansGenerateWeekPost,
} from '@/api/sdk.gen';
import type { Day, WeeklyMealPlan } from '@/api/types.gen';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const mealPlanKeys = {
  all: ['mealPlan'] as const,
  weekly: () => [...mealPlanKeys.all, 'weekly'] as const,
  daily: (day: Day) => [...mealPlanKeys.all, 'daily', day] as const,
};

/**
 * Hook to read cached weekly meal plan.
 * Data is populated by useGenerateWeekPlanMutation.
 */
export function useWeeklyMealPlanQuery() {
  return useQuery<WeeklyMealPlan | null>({
    queryKey: mealPlanKeys.weekly(),
    queryFn: () => null,
    // Don't auto-fetch — data is set by the mutation
    enabled: false,
    staleTime: Infinity,
  });
}

/**
 * Hook to generate a full weekly meal plan.
 * On success, caches the result under mealPlanKeys.weekly().
 */
export function useGenerateWeekPlanMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await generateWeekPlanApiV1MealPlansGenerateWeekPost();

      if (response.error || !response.data) {
        throw new Error('Failed to generate weekly meal plan');
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(mealPlanKeys.weekly(), data);
    },
  });
}

/**
 * Hook to generate/refresh a single day's meal plan.
 * On success, patches the cached weekly plan with the new day.
 */
export function useGenerateDayPlanMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (day: Day) => {
      const response = await generateMealPlanApiV1MealPlansGeneratePost({
        query: { day },
      });

      if (response.error || !response.data) {
        throw new Error(`Failed to generate meal plan for ${day}`);
      }

      return { day, plan: response.data };
    },
    onSuccess: ({ day, plan }) => {
      // Patch the cached weekly plan
      const current = queryClient.getQueryData<WeeklyMealPlan>(mealPlanKeys.weekly());
      if (current) {
        const updatedPlans = current.daily_plans.map((p) =>
          p.day === day ? plan : p
        );
        // If day wasn't in the list, add it
        if (!current.daily_plans.some((p) => p.day === day)) {
          updatedPlans.push(plan);
        }
        queryClient.setQueryData(mealPlanKeys.weekly(), {
          ...current,
          daily_plans: updatedPlans,
          total_weekly_calories: updatedPlans.reduce((sum, p) => sum + p.total_calories, 0),
        });
      }
    },
  });
}
