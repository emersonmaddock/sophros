import { getUser, updateUser } from '@/api/helpers';
import type { User, UserUpdate } from '@/api/types.gen';
import { useAuth, useUser as useClerkUser } from '@clerk/clerk-expo';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

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

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  // Derived state: user is onboarded if they exist in backend
  const isOnboarded = user !== null;

  const fetchUser = useCallback(async () => {
    if (!isSignedIn) {
      setUser(null);
      setLoading(false);
      return;
    }

    // Prevent multiple simultaneous fetches
    if (isFetching) {
      return;
    }

    try {
      setIsFetching(true);
      setLoading(true);
      setError(null);

      const token = await getToken();
      if (!token) {
        throw new Error('Could not get authentication token');
      }

      const userData = await getUser(token);
      // userData will be null if user doesn't exist (404), which is expected
      setUser(userData);
    } catch (err) {
      // Only set error for actual errors (not 404s, which return null above)
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user data';
      setError(errorMessage);
      console.error('[UserContext] Error fetching user:', errorMessage);
      setUser(null);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, [isSignedIn, getToken, isFetching]);

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  const updateUserProfile = useCallback(
    async (updates: UserUpdate): Promise<boolean> => {
      try {
        setError(null);

        const token = await getToken();
        if (!token) {
          throw new Error('Could not get authentication token');
        }

        const updatedUser = await updateUser(updates, token);
        setUser(updatedUser);
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update user profile';
        setError(errorMessage);
        console.error('Error updating user:', err);
        return false;
      }
    },
    [getToken]
  );

  const clearUser = useCallback(() => {
    setUser(null);
    setError(null);
  }, []);

  // Auto-fetch user when Clerk user becomes available
  // IMPORTANT: Don't include fetchUser in dependencies to avoid infinite loop
  useEffect(() => {
    if (isSignedIn && clerkUser) {
      fetchUser();
    } else {
      setUser(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, clerkUser]);

  const value: UserContextType = {
    user,
    isOnboarded,
    loading,
    error,
    fetchUser,
    refreshUser,
    updateUserProfile,
    clearUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
