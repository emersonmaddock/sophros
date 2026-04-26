/**
 * React Query hooks for the progress DB endpoints.
 *
 * These replace AsyncStorage in lib/progress/storage.ts for weight log,
 * body fat log, and archived goals. Goal snapshot fields (goal_start_date,
 * goal_start_weight_kg) are stored on the User record and updated via
 * PATCH /users/me (existing useUserQuery infrastructure).
 *
 * NOTE: Run `pnpm generate-client` after deploying the backend changes to
 * replace the direct client calls here with typed SDK functions.
 */
import { client } from '@/api/client.gen';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { WeightLogEntryRead, BodyFatLogEntryRead, ArchivedGoalRead } from '@/types/progress';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const progressKeys = {
  all: ['progress'] as const,
  weightLog: () => [...progressKeys.all, 'weightLog'] as const,
  bodyFatLog: () => [...progressKeys.all, 'bodyFatLog'] as const,
  archivedGoals: () => [...progressKeys.all, 'archivedGoals'] as const,
};

// ---------------------------------------------------------------------------
// Weight log
// ---------------------------------------------------------------------------

export function useWeightLogQuery() {
  return useQuery<WeightLogEntryRead[]>({
    queryKey: progressKeys.weightLog(),
    queryFn: async () => {
      const res = await client.get({ url: '/api/v1/users/me/progress/weight-log' });
      if (res.error) throw new Error('Failed to fetch weight log');
      return (res.data as WeightLogEntryRead[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpsertWeightEntryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entry: { date: string; weight_kg: number; source?: string }) => {
      const res = await client.post({
        url: '/api/v1/users/me/progress/weight-log',
        body: { date: entry.date, weight_kg: entry.weight_kg, source: entry.source ?? 'manual' },
      });
      if (res.error) throw new Error('Failed to save weight entry');
      return res.data as WeightLogEntryRead;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: progressKeys.weightLog() }),
  });
}

export function useDeleteWeightEntryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (date: string) => {
      const res = await client.delete({ url: `/api/v1/users/me/progress/weight-log/${date}` });
      if (res.error) throw new Error('Failed to delete weight entry');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: progressKeys.weightLog() }),
  });
}

// ---------------------------------------------------------------------------
// Body fat log
// ---------------------------------------------------------------------------

export function useBodyFatLogQuery() {
  return useQuery<BodyFatLogEntryRead[]>({
    queryKey: progressKeys.bodyFatLog(),
    queryFn: async () => {
      const res = await client.get({ url: '/api/v1/users/me/progress/body-fat-log' });
      if (res.error) throw new Error('Failed to fetch body fat log');
      return (res.data as BodyFatLogEntryRead[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpsertBodyFatEntryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entry: { date: string; body_fat_percent: number }) => {
      const res = await client.post({
        url: '/api/v1/users/me/progress/body-fat-log',
        body: { date: entry.date, body_fat_percent: entry.body_fat_percent, source: 'manual' },
      });
      if (res.error) throw new Error('Failed to save body fat entry');
      return res.data as BodyFatLogEntryRead;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: progressKeys.bodyFatLog() }),
  });
}

// ---------------------------------------------------------------------------
// Archived goals
// ---------------------------------------------------------------------------

export function useArchivedGoalsQuery() {
  return useQuery<ArchivedGoalRead[]>({
    queryKey: progressKeys.archivedGoals(),
    queryFn: async () => {
      const res = await client.get({ url: '/api/v1/users/me/progress/archived-goals' });
      if (res.error) throw new Error('Failed to fetch archived goals');
      return (res.data as ArchivedGoalRead[]) ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useUpsertArchivedGoalMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (goal: ArchivedGoalRead) => {
      const res = await client.post({
        url: '/api/v1/users/me/progress/archived-goals',
        body: goal,
      });
      if (res.error) throw new Error('Failed to save archived goal');
      return res.data as ArchivedGoalRead;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: progressKeys.archivedGoals() }),
  });
}
