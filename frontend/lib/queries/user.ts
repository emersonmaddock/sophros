import {
  readUserMeApiV1UsersMeGet,
  readUserTargetsApiV1UsersMeTargetsGet,
  updateUserMeApiV1UsersMePut,
} from '@/api/sdk.gen';
import { useUser as useClerkUser } from '@clerk/expo';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UserUpdate } from '../../api/types.gen';

type ApiRequestError = Error & {
  details?: unknown;
  status?: number;
};

function createApiRequestError(
  message: string,
  status?: number,
  details?: unknown
): ApiRequestError {
  const error = new Error(message) as ApiRequestError;
  error.name = 'ApiRequestError';
  error.status = status;
  error.details = details;
  return error;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'detail' in error && typeof error.detail === 'string') {
    return error.detail;
  }
  return fallback;
}

export function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  if ('status' in error && typeof error.status === 'number') {
    return error.status;
  }

  if (
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'status' in error.response &&
    typeof error.response.status === 'number'
  ) {
    return error.response.status;
  }

  return undefined;
}

/**
 * Query key factory for user-related queries.
 * This ensures consistent cache keys across the application.
 */
export const userKeys = {
  all: ['user'] as const,
  me: (clerkId?: string) => ['user', clerkId] as const,
  detail: (userId?: string) => [...userKeys.all, userId] as const,
  targets: ['userTargets'] as const,
};

/**
 * Hook to fetch user data.
 * Automatically caches and deduplicates requests.
 */
export function useUserQuery(enabled: boolean = true) {
  const { user: clerkUser } = useClerkUser();

  return useQuery({
    queryKey: userKeys.me(clerkUser?.id),
    queryFn: async () => {
      const response = await readUserMeApiV1UsersMeGet();
      if (response.data) {
        return response.data;
      }

      const status = response.response?.status;
      if (status === 404) {
        return null;
      }

      throw createApiRequestError(
        getErrorMessage(response.error, 'Failed to fetch user data'),
        status,
        response.error
      );
    },
    enabled,
    // Prevent showing stale data after logout
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch user nutrition targets (DRI).
 * Targets change rarely — only when user profile changes.
 */
export function useUserTargetsQuery() {
  return useQuery({
    queryKey: userKeys.targets,
    queryFn: async () => {
      const response = await readUserTargetsApiV1UsersMeTargetsGet();
      if (response.data) {
        return response.data;
      }

      throw createApiRequestError(
        getErrorMessage(response.error, 'Failed to fetch user targets'),
        response.response?.status,
        response.error
      );
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to update user profile.
 * Automatically invalidates and refetches user data on success.
 */
export function useUpdateUserMutation() {
  const { user: clerkUser } = useClerkUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: UserUpdate) => {
      const response = await updateUserMeApiV1UsersMePut({
        body: updates,
      });

      if (response.error || !response.data) {
        throw createApiRequestError(
          getErrorMessage(response.error, 'Failed to update user profile'),
          response.response?.status,
          response.error
        );
      }

      return response.data;
    },
    onSuccess: (updatedUser) => {
      // Optimistically update the cache with new data
      queryClient.setQueryData(userKeys.me(clerkUser?.id), updatedUser);
      // Invalidate to trigger a background refetch
      queryClient.invalidateQueries({ queryKey: userKeys.me(clerkUser?.id) });
    },
    onError: (error) => {
      console.error('[useUpdateUserMutation] Error:', error);
    },
  });
}
