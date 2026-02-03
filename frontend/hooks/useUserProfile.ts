import { useUser } from '@/contexts/UserContext';
import { useUser as useClerkUser } from '@clerk/clerk-expo';
import { useMemo } from 'react';

interface FormattedUserProfile {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  age: string;
  weight: string; // formatted with unit
  height: string; // formatted with unit
  gender: string;
  activityLevel: string;
  pregnancyStatus: string;
}

const ACTIVITY_LEVEL_LABELS: Record<string, string> = {
  sedentary: 'Sedentary',
  'lightly-active': 'Lightly Active',
  'moderately-active': 'Moderately Active',
  'very-active': 'Very Active',
};

const GENDER_LABELS: Record<string, string> = {
  male: 'Male',
  female: 'Female',
};

export function useUserProfile() {
  const { user: clerkUser } = useClerkUser();
  const { user: backendUser, updateUserProfile, loading, error } = useUser();

  const profile = useMemo<FormattedUserProfile | null>(() => {
    if (!clerkUser || !backendUser) return null;

    return {
      firstName: clerkUser.firstName || '',
      lastName: clerkUser.lastName || '',
      fullName: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User',
      email: backendUser.email,
      age: backendUser.age?.toString() || 'Not set',
      weight: backendUser.weight ? `${Math.round(backendUser.weight * 2.20462)} lbs` : 'Not set',
      height: backendUser.height
        ? `${Math.floor(backendUser.height / 30.48)}' ${Math.round((backendUser.height % 30.48) / 2.54)}"`
        : 'Not set',
      gender: backendUser.gender ? GENDER_LABELS[backendUser.gender] || backendUser.gender : 'Not set',
      activityLevel: backendUser.activity_level
        ? ACTIVITY_LEVEL_LABELS[backendUser.activity_level] || backendUser.activity_level
        : 'Not set',
      pregnancyStatus: backendUser.pregnancy_status || 'N/A',
    };
  }, [clerkUser, backendUser]);

  // Convert lbs to kg
  const lbsToKg = (lbs: number): number => {
    return lbs / 2.20462;
  };

  // Convert feet/inches to cm
  const feetInchesToCm = (feet: number, inches: number): number => {
    return feet * 30.48 + inches * 2.54;
  };

  return {
    profile,
    backendUser,
    clerkUser,
    updateUserProfile,
    loading,
    error,
    lbsToKg,
    feetInchesToCm,
  };
}
