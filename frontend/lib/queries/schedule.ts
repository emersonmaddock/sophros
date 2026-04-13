import {
  createScheduleItemApiV1SchedulesPost,
  deleteScheduleItemApiV1SchedulesItemIdDelete,
  getWeekScheduleApiV1SchedulesWeekGet,
  swapScheduleItemMealApiV1SchedulesItemIdSwapPost,
  updateScheduleItemApiV1SchedulesItemIdPut,
} from '@/api/sdk.gen';
import type { MealRead, ScheduleItemRead } from '@/api/types.gen';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const scheduleKeys = {
  all: ['schedule'] as const,
  week: (weekStart: string) => [...scheduleKeys.all, 'week', weekStart] as const,
};

// ── Queries ────────────────────────────────────────────────────────────────

export function useWeekScheduleQuery(weekStartDate: string) {
  return useQuery<ScheduleItemRead[]>({
    queryKey: scheduleKeys.week(weekStartDate),
    queryFn: async () => {
      const response = await getWeekScheduleApiV1SchedulesWeekGet({
        query: { week_start_date: weekStartDate },
      });
      if (response.error) throw new Error('Failed to fetch week schedule');
      return response.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ── Mutations ──────────────────────────────────────────────────────────────

export function useCompleteScheduleItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      isCompleted,
    }: {
      itemId: number;
      isCompleted: boolean;
      weekStartDate: string;
    }) => {
      const response = await updateScheduleItemApiV1SchedulesItemIdPut({
        path: { item_id: itemId },
        body: { is_completed: isCompleted },
      });
      if (response.error || !response.data) throw new Error('Failed to update schedule item');
      return response.data;
    },
    onMutate: async ({ itemId, isCompleted, weekStartDate }) => {
      await queryClient.cancelQueries({ queryKey: scheduleKeys.week(weekStartDate) });
      const prev = queryClient.getQueryData<ScheduleItemRead[]>(scheduleKeys.week(weekStartDate));
      queryClient.setQueryData<ScheduleItemRead[]>(
        scheduleKeys.week(weekStartDate),
        (old) => old?.map((item) => (item.id === itemId ? { ...item, is_completed: isCompleted } : item)) ?? []
      );
      return { prev, weekStartDate };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(scheduleKeys.week(ctx.weekStartDate), ctx.prev);
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.week(vars.weekStartDate) });
    },
  });
}

export function useSwapMealMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      mealId,
    }: {
      itemId: number;
      mealId: number;
      weekStartDate: string;
    }) => {
      const response = await swapScheduleItemMealApiV1SchedulesItemIdSwapPost({
        path: { item_id: itemId },
        body: { meal_id: mealId },
      });
      if (response.error || !response.data) throw new Error('Failed to swap meal');
      return response.data;
    },
    onMutate: async ({ itemId, mealId, weekStartDate }) => {
      await queryClient.cancelQueries({ queryKey: scheduleKeys.week(weekStartDate) });
      const prev = queryClient.getQueryData<ScheduleItemRead[]>(scheduleKeys.week(weekStartDate));
      queryClient.setQueryData<ScheduleItemRead[]>(
        scheduleKeys.week(weekStartDate),
        (old) => {
          if (!old) return [];
          return old.map((item) => {
            if (item.id !== itemId) return item;
            const newMeal = item.alternatives?.find((a: MealRead) => a.id === mealId);
            if (!newMeal) return item;
            const oldMeal = item.meal;
            const newAlts = (item.alternatives ?? []).filter((a: MealRead) => a.id !== mealId);
            if (oldMeal) newAlts.push(oldMeal);
            return { ...item, meal: newMeal, meal_id: mealId, alternatives: newAlts };
          });
        }
      );
      return { prev, weekStartDate };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(scheduleKeys.week(ctx.weekStartDate), ctx.prev);
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.week(vars.weekStartDate) });
    },
  });
}

export function useDeleteScheduleItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId }: { itemId: number; weekStartDate: string }) => {
      const response = await deleteScheduleItemApiV1SchedulesItemIdDelete({
        path: { item_id: itemId },
      });
      if (response.error) throw new Error('Failed to delete schedule item');
    },
    onMutate: async ({ itemId, weekStartDate }) => {
      await queryClient.cancelQueries({ queryKey: scheduleKeys.week(weekStartDate) });
      const prev = queryClient.getQueryData<ScheduleItemRead[]>(scheduleKeys.week(weekStartDate));
      queryClient.setQueryData<ScheduleItemRead[]>(
        scheduleKeys.week(weekStartDate),
        (old) => old?.filter((item) => item.id !== itemId) ?? []
      );
      return { prev, weekStartDate };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(scheduleKeys.week(ctx.weekStartDate), ctx.prev);
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.week(vars.weekStartDate) });
    },
  });
}

export function useCreateScheduleItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      body,
    }: {
      body: Parameters<typeof createScheduleItemApiV1SchedulesPost>[0]['body'];
      weekStartDate: string;
    }) => {
      const response = await createScheduleItemApiV1SchedulesPost({ body });
      if (response.error || !response.data) throw new Error('Failed to create schedule item');
      return response.data;
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.week(vars.weekStartDate) });
    },
  });
}

export function useUpdateScheduleItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      body,
    }: {
      itemId: number;
      body: Parameters<typeof updateScheduleItemApiV1SchedulesItemIdPut>[0]['body'];
      weekStartDate: string;
    }) => {
      const response = await updateScheduleItemApiV1SchedulesItemIdPut({
        path: { item_id: itemId },
        body,
      });
      if (response.error || !response.data) throw new Error('Failed to update schedule item');
      return response.data;
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.week(vars.weekStartDate) });
    },
  });
}
