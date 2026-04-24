/**
 * React Query hooks for Google Calendar integration.
 *
 * These hooks call the /api/v1/calendar/google endpoints directly using the
 * hey-api client (which automatically injects the Clerk auth token).
 * Run `pnpm generate-client` after this feature ships to have the SDK generate
 * typed wrappers for these endpoints automatically.
 */

import { client } from '@/api/client.gen';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scheduleKeys } from './schedule';

// ── Types ────────────────────────────────────────────────────────────────────

export interface GoogleCalendarStatus {
  connected: boolean;
  email: string | null;
  last_synced_at: string | null;
  sync_status: string | null;
  needs_reconnect: boolean;
}

export interface GoogleCalendarSyncResult {
  synced_count: number;
  sync_batch_id: string;
}

export interface GoogleCalendarDisconnectResult {
  removed_busy_blocks: number;
}

// ── Query keys ───────────────────────────────────────────────────────────────

export const googleCalendarKeys = {
  all: ['googleCalendar'] as const,
  status: () => [...googleCalendarKeys.all, 'status'] as const,
};

// ── Queries ──────────────────────────────────────────────────────────────────

export function useGoogleCalendarStatusQuery() {
  return useQuery<GoogleCalendarStatus>({
    queryKey: googleCalendarKeys.status(),
    queryFn: async () => {
      const response = await client.get<GoogleCalendarStatus, unknown>({
        url: '/api/v1/calendar/google/status',
        security: [{ scheme: 'bearer', type: 'http' }],
      });
      if (response.error) throw new Error('Failed to fetch calendar status');
      return response.data!;
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useGoogleCalendarConnectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await client.post<GoogleCalendarStatus, unknown>({
        url: '/api/v1/calendar/google/connect',
        security: [{ scheme: 'bearer', type: 'http' }],
      });
      if (response.error || !response.data) {
        throw new Error('Failed to connect Google Calendar through Clerk');
      }
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(googleCalendarKeys.status(), data);
      // Invalidate schedule queries so google busy blocks appear immediately
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
    },
  });
}

export function useGoogleCalendarSyncMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await client.post<GoogleCalendarSyncResult, unknown>({
        url: '/api/v1/calendar/google/sync',
        security: [{ scheme: 'bearer', type: 'http' }],
      });
      if (response.error || !response.data) {
        throw new Error('Calendar sync failed');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: googleCalendarKeys.status() });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
    },
  });
}

export function useGoogleCalendarDisconnectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (removeBusyBlocks: boolean) => {
      const response = await client.delete<GoogleCalendarDisconnectResult, unknown>({
        url: '/api/v1/calendar/google/disconnect',
        query: { remove_busy_blocks: removeBusyBlocks },
        security: [{ scheme: 'bearer', type: 'http' }],
      });
      if (response.error || !response.data) {
        throw new Error('Failed to disconnect Google Calendar');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.setQueryData(googleCalendarKeys.status(), {
        connected: false,
        email: null,
        last_synced_at: null,
        sync_status: null,
        needs_reconnect: false,
      } satisfies GoogleCalendarStatus);
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
    },
  });
}
