import { ActivityLevel, Sex } from '@/api';
import { useUser } from '@/contexts/UserContext';
import { cmToFeetAndInches, kgToLbs } from '@/utils/units';
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

const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary',
  light: 'Lightly Active',
  moderate: 'Moderately Active',
  active: 'Active',
  very_active: 'Very Active',
};

const SEX_LABELS: Record<Sex, string> = {
  male: 'Male',
  female: 'Female',
};

export function useUserProfile() {
  const { user: clerkUser } = useClerkUser();
  const { user: backendUser, updateUserProfile, loading, error } = useUser();

  const profile = useMemo<FormattedUserProfile | null>(() => {
    if (!clerkUser || !backendUser) return null;
    const showImperial = backendUser.show_imperial;

    const formattedWeight = showImperial
      ? `${kgToLbs(backendUser.weight).toFixed(1)} lbs`
      : `${backendUser.weight.toFixed(1)} kg`;

    const formattedHeight = showImperial
      ? (() => {
          const { feet, inches } = cmToFeetAndInches(backendUser.height);
          return `${feet}' ${inches}"`;
        })()
      : `${backendUser.height.toFixed(0)} cm`;

    return {
      firstName: clerkUser.firstName || '',
      lastName: clerkUser.lastName || '',
      fullName: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User',
      email: backendUser.email,
      age: backendUser.age?.toString(),
      weight: formattedWeight,
      height: formattedHeight,
      gender: SEX_LABELS[backendUser.gender],
      activityLevel: ACTIVITY_LEVEL_LABELS[backendUser.activity_level],
      pregnancyStatus: backendUser.pregnancy_status || 'N/A',
    };
  }, [clerkUser, backendUser]);

  return {
    profile,
    backendUser,
    clerkUser,
    updateUserProfile,
    loading,
    error,
  };
}
