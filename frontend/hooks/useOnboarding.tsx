import type { ActivityLevel, PregnancyStatus, Sex, UserCreate } from '@/api/types.gen';
import { VALIDATION_RULES } from '@/constants/onboarding';
import { useUser } from '@/contexts/UserContext';
import { createUser } from '@/lib/api-client';
import { useAuth, useUser as useClerkUser } from '@clerk/clerk-expo';
import React, { createContext, useContext, useState } from 'react';

export interface OnboardingData {
  age: string;
  gender: Sex | null;
  weight: string; // kg
  height: string; // cm
  showImperial: boolean;
  pregnancyStatus?: PregnancyStatus;
  activityLevel: ActivityLevel | null;
  targetWeight: string; // kg (stored in metric regardless of display)
  wakeUpTime: string; // HH:MM
  sleepTime: string; // HH:MM
}

interface ValidationErrors {
  age?: string;
  weight?: string;
  height?: string;
  gender?: string;
  activityLevel?: string;
}

interface OnboardingContextType {
  data: OnboardingData;
  updateField: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  errors: ValidationErrors;
  loading: boolean;
  error: string | null;
  submit: () => Promise<{ success: boolean; error?: string }>;
  validate: () => boolean;
  isSection1Complete: () => boolean;
  isSection2Complete: () => boolean;
  isSection3Complete: () => boolean;
  isSection4Complete: () => boolean;
  isSection5Complete: () => boolean;
  canSubmit: () => boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const { user } = useClerkUser();
  const { refreshUser } = useUser();

  const [data, setData] = useState<OnboardingData>({
    age: '',
    gender: null,
    weight: '',
    height: '',
    showImperial: true,
    pregnancyStatus: undefined,
    activityLevel: null,
    targetWeight: '',
    wakeUpTime: '07:00',
    sleepTime: '23:00',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update a single field
  const updateField = <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
    // Clear error for this field when user starts typing
    if (key in errors) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key as keyof ValidationErrors];
        return newErrors;
      });
    }
  };

  // Validate individual fields
  const validateAge = (age: string): string | undefined => {
    const ageNum = parseInt(age, 10);
    if (!age || isNaN(ageNum)) {
      return 'Age is required';
    }
    if (ageNum < VALIDATION_RULES.age.min) {
      return `Age must be at least ${VALIDATION_RULES.age.min}`;
    }
    if (ageNum > VALIDATION_RULES.age.max) {
      return `Age must be less than ${VALIDATION_RULES.age.max}`;
    }
    return undefined;
  };

  const validateWeight = (weight: string): string | undefined => {
    const weightNum = parseFloat(weight);
    if (!weight || isNaN(weightNum)) {
      return 'Weight is required';
    }
    if (weightNum < VALIDATION_RULES.weight.min) {
      return `Weight must be at least ${VALIDATION_RULES.weight.min} kg`;
    }
    if (weightNum > VALIDATION_RULES.weight.max) {
      return `Weight must be less than ${VALIDATION_RULES.weight.max} kg`;
    }
    return undefined;
  };

  const validateHeight = (height: string): string | undefined => {
    const heightNum = parseFloat(height);
    if (!height || isNaN(heightNum)) {
      return 'Height is required';
    }
    if (heightNum < VALIDATION_RULES.height.min) {
      return `Height must be at least ${VALIDATION_RULES.height.min} cm`;
    }
    if (heightNum > VALIDATION_RULES.height.max) {
      return `Height must be less than ${VALIDATION_RULES.height.max} cm`;
    }
    return undefined;
  };

  // Validate all fields
  const validate = (): boolean => {
    const newErrors: ValidationErrors = {};

    const ageError = validateAge(data.age);
    if (ageError) newErrors.age = ageError;

    const weightError = validateWeight(data.weight);
    if (weightError) newErrors.weight = weightError;

    const heightError = validateHeight(data.height);
    if (heightError) newErrors.height = heightError;

    if (data.gender === null) {
      newErrors.gender = 'Gender is required';
    }

    if (data.activityLevel === null) {
      newErrors.activityLevel = 'Activity level is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Check if a section is complete
  const isSection1Complete = () => {
    return data.age !== '' && data.gender !== null && !validateAge(data.age);
  };

  const isSection2Complete = () => {
    return (
      data.weight !== '' &&
      data.height !== '' &&
      !validateWeight(data.weight) &&
      !validateHeight(data.height)
    );
  };

  const isSection3Complete = () => {
    // Only required for females
    if (data.gender === 'female') {
      return data.pregnancyStatus !== undefined;
    }
    return true; // Skip for non-females
  };

  const isSection4Complete = () => {
    return data.activityLevel !== undefined;
  };

  const isSection5Complete = () => {
    // All fields are optional/pre-filled, so always complete
    return true;
  };

  const canSubmit = () => {
    return (
      isSection1Complete() && isSection2Complete() && isSection3Complete() && isSection4Complete()
    );
  };

  // Submit the onboarding data
  const submit = async (): Promise<{ success: boolean; error?: string }> => {
    if (data.wakeUpTime && data.sleepTime) {
      if (data.wakeUpTime === data.sleepTime) {
        return { success: false, error: 'Wake up and sleep time cannot be exactly identical.' };
      }

      const [wakeH, wakeM] = data.wakeUpTime.split(':').map(Number);
      const [sleepH, sleepM] = data.sleepTime.split(':').map(Number);

      let sleepDurationMinutes = (wakeH * 60 + wakeM) - (sleepH * 60 + sleepM);
      if (sleepDurationMinutes <= 0) sleepDurationMinutes += 24 * 60;

      const sleepHours = sleepDurationMinutes / 60;
      if (sleepHours <= 5) {
        return { success: false, error: `Your schedule only allows ${sleepHours} hours of sleep. Please schedule more than 5 hours.` };
      }
      if (sleepHours > 10) {
        return { success: false, error: `Your schedule has ${sleepHours} hours of sleep. Please limit it to 10 hours or less to leave room for meals.` };
      }
    }

    if (!validate()) {
      return { success: false, error: 'Please ensure all previous profile fields (Age, Weight, Height, etc.) are filled out correctly.' };
    }

    if (!user?.id || !user?.primaryEmailAddress?.emailAddress) {
      const msg = 'User information is not available. Please try signing in again.';
      setError(msg);
      return { success: false, error: msg };
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Could not get authentication token');
      }

      const payload: UserCreate = {
        email: user.primaryEmailAddress.emailAddress,
        age: parseInt(data.age, 10),
        weight: parseFloat(data.weight), // Already in kg
        height: parseFloat(data.height), // Already in cm
        gender: data.gender as Sex, // Validated in validate()
        activity_level: data.activityLevel as ActivityLevel, // Validated in validate()
        show_imperial: data.showImperial,
      };

      // Only include pregnancy status for females
      if (data.gender === 'female' && data.pregnancyStatus) {
        payload.pregnancy_status = data.pregnancyStatus;
      }

      // Include target weight if provided
      const targetWeightKg = parseFloat(data.targetWeight);
      if (!isNaN(targetWeightKg) && targetWeightKg > 0) {
        payload.target_weight = targetWeightKg;
      }

      // Helper to parse time string into HH:MM:00 format
      const parseTimeString = (timeStr: string): string => {
        const cleanStr = timeStr.trim().toLowerCase();
        const match = cleanStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
        if (!match) throw new Error(`Invalid time format: ${timeStr}. Please use HH:MM (e.g., 07:00 or 7:00 AM)`);

        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2] || '0', 10);
        const ampm = match[3];

        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          throw new Error(`Invalid time values: ${timeStr}`);
        }

        if (ampm === 'pm' && hours < 12) hours += 12;
        else if (ampm === 'am' && hours === 12) hours = 0;

        const hh = hours.toString().padStart(2, '0');
        const mm = minutes.toString().padStart(2, '0');
        return `${hh}:${mm}:00`;
      };

      // Include wake/sleep times
      if (data.wakeUpTime) {
        payload.wake_up_time = parseTimeString(data.wakeUpTime);
      }
      if (data.sleepTime) {
        payload.sleep_time = parseTimeString(data.sleepTime);
      }

      await createUser(payload, token);

      // Refresh user context to update isOnboarded status
      await refreshUser();

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create user profile';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    data,
    updateField,
    errors,
    loading,
    error,
    submit,
    validate,
    isSection1Complete,
    isSection2Complete,
    isSection3Complete,
    isSection4Complete,
    isSection5Complete,
    canSubmit,
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
