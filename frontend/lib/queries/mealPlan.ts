import {
  addEventApiV1MealPlansPlanIdEventsPost,
  completeEventApiV1MealPlansEventsEventIdCompletePost,
  deleteEventApiV1MealPlansEventsEventIdDelete,
  generateMealPlanApiV1MealPlansGeneratePost,
  generateWeekPlanApiV1MealPlansGenerateWeekPost,
  getPlannedWeeksApiV1MealPlansPlannedWeeksGet,
  getWeekPlanApiV1MealPlansWeekGet,
  saveMealPlanApiV1MealPlansSavePost,
  updateEventApiV1MealPlansEventsEventIdPut,
} from '@/api/sdk.gen';
import type {
  DailyMealPlanOutput,
  Day,
  PlannedEventCreate,
  PlannedEventUpdate,
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
        const detail = (response.error as any)?.detail || 'Failed to generate weekly meal plan';
        throw new Error(detail);
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
        const detail = (response.error as any)?.detail || `Failed to generate meal plan for ${day}`;
        throw new Error(detail);
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
        const detail = (response.error as any)?.detail || 'Failed to fetch saved meal plan';
        throw new Error(detail);
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
        const detail = (response.error as any)?.detail || 'Failed to save meal plan';
        throw new Error(detail);
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

/**
 * Hook to add a new event to a saved meal plan.
 */
export function useAddEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ planId, event }: { planId: number; event: PlannedEventCreate }) => {
      const response = await addEventApiV1MealPlansPlanIdEventsPost({
        path: { plan_id: planId },
        body: event,
      });
      if (response.error || !response.data) {
        throw new Error((response.error as any)?.detail || 'Failed to add event');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mealPlanKeys.all });
    },
  });
}

/**
 * Hook to update an existing planned event.
 */
export function useUpdateEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, updates }: { eventId: number; updates: PlannedEventUpdate }) => {
      const response = await updateEventApiV1MealPlansEventsEventIdPut({
        path: { event_id: eventId },
        body: updates,
      });
      if (response.error || !response.data) {
        throw new Error((response.error as any)?.detail || 'Failed to update event');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mealPlanKeys.all });
    },
  });
}

/**
 * Hook to delete a planned event.
 */
export function useDeleteEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: number) => {
      const response = await deleteEventApiV1MealPlansEventsEventIdDelete({
        path: { event_id: eventId },
      });
      if (response.error || !response.data) {
        throw new Error((response.error as any)?.detail || 'Failed to delete event');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mealPlanKeys.all });
    },
  });
}

/**
 * Hook to mark an event as completed.
 */
export function useCompleteEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: number) => {
      const response = await completeEventApiV1MealPlansEventsEventIdCompletePost({
        path: { event_id: eventId },
      });
      if (response.error || !response.data) {
        throw new Error((response.error as any)?.detail || 'Failed to complete event');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mealPlanKeys.all });
    },
  });
}
