import {
  generateMealPlanApiV1MealPlansGeneratePost,
  generateWeekPlanApiV1MealPlansGenerateWeekPost,
  getPlannedWeeksApiV1MealPlansPlannedWeeksGet,
  getWeekPlanApiV1MealPlansWeekGet,
  saveMealPlanApiV1MealPlansSavePost,
} from '@/api/sdk.gen';
import type {
  DailyMealPlanOutput,
  Day,
  SaveMealPlanRequest,
  WeeklyMealPlanOutput,
} from '@/api/types.gen';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const mealPlanKeys = {
  all: ['mealPlan'] as const,
  weekly: () => [...mealPlanKeys.all, 'weekly'] as const,
  daily: (day: Day) => [...mealPlanKeys.all, 'daily', day] as const,
  savedWeek: (weekStart: string) => [...mealPlanKeys.all, 'saved', weekStart] as const,
  plannedWeeks: () => [...mealPlanKeys.all, 'plannedWeeks'] as const,
};

/**
 * Hook to read cached weekly meal plan.
 * Data is populated by useGenerateWeekPlanMutation.
 */
export function useWeeklyMealPlanOutputQuery() {
  return useQuery<WeeklyMealPlanOutput | null>({
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
      const current = queryClient.getQueryData<WeeklyMealPlanOutput>(mealPlanKeys.weekly());
      if (current) {
        const updatedPlans: DailyMealPlanOutput[] = current.daily_plans.map(
          (p: DailyMealPlanOutput) => (p.day === day ? plan : p)
        );
        // If day wasn't in the list, add it
        if (!current.daily_plans.some((p: DailyMealPlanOutput) => p.day === day)) {
          updatedPlans.push(plan);
        }
        queryClient.setQueryData(mealPlanKeys.weekly(), {
          ...current,
          daily_plans: updatedPlans,
          total_weekly_calories: updatedPlans.reduce(
            (sum: number, p: DailyMealPlanOutput) => sum + p.total_calories,
            0
          ),
        });
      }
    },
  });
}

/**
 * Hook to fetch a saved meal plan for a specific week.
 */
export function useSavedWeekPlanQuery(weekStartDate: string) {
  return useQuery({
    queryKey: mealPlanKeys.savedWeek(weekStartDate),
    queryFn: async () => {
      const response = await getWeekPlanApiV1MealPlansWeekGet({
        query: { week_start_date: weekStartDate },
      });

      if (response.error) {
        throw new Error('Failed to fetch saved meal plan');
      }

      return response.data ?? null;
    },
  });
}

/**
 * Hook to fetch list of all planned week start dates.
 */
export function usePlannedWeeksQuery() {
  return useQuery({
    queryKey: mealPlanKeys.plannedWeeks(),
    queryFn: async () => {
      const response = await getPlannedWeeksApiV1MealPlansPlannedWeeksGet();

      if (response.error) {
        throw new Error('Failed to fetch planned weeks');
      }

      return response.data ?? [];
    },
  });
}

/**
 * Hook to save a confirmed meal plan. Invalidates saved-week and planned-weeks queries.
 */
export function useSaveMealPlanMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: SaveMealPlanRequest) => {
      const response = await saveMealPlanApiV1MealPlansSavePost({ body });

      if (response.error || !response.data) {
        throw new Error('Failed to save meal plan');
      }

      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: mealPlanKeys.savedWeek(variables.week_start_date),
      });
      queryClient.invalidateQueries({ queryKey: mealPlanKeys.plannedWeeks() });
    },
  });
}
