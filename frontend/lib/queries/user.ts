import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UserUpdate } from '../../api/types.gen';
import { getUser, updateUser } from '../api-client';

/**
 * Query key factory for user-related queries.
 * This ensures consistent cache keys across the application.
 */
export const userKeys = {
  all: ['user'] as const,
  detail: (userId?: string) => [...userKeys.all, userId] as const,
};

/**
 * Hook to fetch user data.
 * Automatically caches and deduplicates requests.
 */
export function useUserQuery(token: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: userKeys.all,
    queryFn: async () => {
      if (!token) {
        throw new Error('No authentication token available');
      }
      const userData = await getUser(token);
      return userData;
    },
    enabled: enabled && !!token,
    // Prevent showing stale data after logout
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to update user profile.
 * Automatically invalidates and refetches user data on success.
 */
export function useUpdateUserMutation(token: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: UserUpdate) => {
      if (!token) {
        throw new Error('No authentication token available');
      }
      return updateUser(updates, token);
    },
    onSuccess: (updatedUser) => {
      // Optimistically update the cache with new data
      queryClient.setQueryData(userKeys.all, updatedUser);
      // Invalidate to trigger a background refetch
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
    onError: (error) => {
      console.error('[useUpdateUserMutation] Error:', error);
    },
  });
}
