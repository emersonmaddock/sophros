import type { User, UserUpdate } from '@/api/types.gen';
import { useUpdateUserMutation, useUserQuery } from '@/lib/queries/user';
import { useAuth, useUser as useClerkUser } from '@clerk/clerk-expo';
import React, { createContext, useCallback, useContext, useMemo } from 'react';

interface UserContextType {
  user: User | null;
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
  const { getToken, isSignedIn } = useAuth();
  const { user: clerkUser } = useClerkUser();

  // Get authentication token
  const [token, setToken] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isSignedIn && clerkUser) {
      getToken().then(setToken);
    } else {
      setToken(null);
    }
  }, [isSignedIn, clerkUser, getToken]);

  // Query user data with TanStack Query
  const {
    data: user,
    isLoading,
    error: queryError,
    refetch,
  } = useUserQuery(token, isSignedIn && !!clerkUser);

  // Mutation for updating user
  const updateMutation = useUpdateUserMutation(token);

  // Derived state: user is onboarded if they exist in backend
  const isOnboarded = user !== null;

  // Convert query error to string for backward compatibility
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'An error occurred') : null;

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
