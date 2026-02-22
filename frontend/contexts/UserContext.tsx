import { client } from '@/api/client.gen';
import type { UserRead, UserUpdate } from '@/api/types.gen';
import { getErrorStatus, useUpdateUserMutation, useUserQuery } from '@/lib/queries/user';
import { useAuth, useUser as useClerkUser } from '@clerk/clerk-expo';
import React, { createContext, useCallback, useContext, useMemo } from 'react';

interface UserContextType {
  user: UserRead | null;
  isOnboarded: boolean;
  loading: boolean;
  error: string | null;
  fetchUser: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserProfile: (updates: UserUpdate) => Promise<boolean>;
  clearUser: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn, signOut } = useAuth();
  const { user: clerkUser } = useClerkUser();

  // Set hey-api auth callback whenever authentication state changes.
  React.useEffect(() => {
    client.setConfig({
      auth: async () => {
        if (!isSignedIn || !clerkUser) {
          return undefined;
        }
        return (await getToken()) ?? undefined;
      },
    });
  }, [isSignedIn, clerkUser, getToken]);

  // Query user data with TanStack Query
  const {
    data: user,
    isLoading,
    error: queryError,
    refetch,
  } = useUserQuery(isSignedIn && !!clerkUser);
  const hasTriggeredUnauthorizedSignOut = React.useRef(false);

  React.useEffect(() => {
    if (!isSignedIn) {
      hasTriggeredUnauthorizedSignOut.current = false;
    }
  }, [isSignedIn]);

  React.useEffect(() => {
    if (!isSignedIn || !queryError) {
      return;
    }

    if (getErrorStatus(queryError) !== 401) {
      return;
    }

    if (hasTriggeredUnauthorizedSignOut.current) {
      return;
    }

    hasTriggeredUnauthorizedSignOut.current = true;
    signOut().catch((error) => {
      console.error('[UserContext] Failed to sign out after 401:', error);
      hasTriggeredUnauthorizedSignOut.current = false;
    });
  }, [queryError, isSignedIn, signOut]);

  // Mutation for updating user
  const updateMutation = useUpdateUserMutation();

  // Derived state: user is onboarded if they exist in backend
  const isOnboarded = user !== null;

  // Convert query error to string for backward compatibility
  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : 'An error occurred'
    : null;

  const fetchUser = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const refreshUser = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const updateUserProfile = useCallback(
    async (updates: UserUpdate): Promise<boolean> => {
      try {
        await updateMutation.mutateAsync(updates);
        return true;
      } catch (err) {
        console.error('[UserContext] Error updating user:', err);
        return false;
      }
    },
    [updateMutation]
  );

  const clearUser = useCallback(() => {
    // Clearing is handled by signing out via Clerk
    // The query will automatically clear when isSignedIn becomes false
  }, []);

  const value: UserContextType = useMemo(
    () => ({
      user: user ?? null,
      isOnboarded,
      loading: isLoading,
      error,
      fetchUser,
      refreshUser,
      updateUserProfile,
      clearUser,
    }),
    [user, isOnboarded, isLoading, error, fetchUser, refreshUser, updateUserProfile, clearUser]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
