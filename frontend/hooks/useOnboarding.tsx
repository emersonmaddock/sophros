import type { UserCreate } from '@/api/types.gen';
import { VALIDATION_RULES } from '@/constants/onboarding';
import { useUser } from '@/contexts/UserContext';
import { createUser } from '@/lib/api-client';
import { useAuth, useUser as useClerkUser } from '@clerk/clerk-expo';
import React, { createContext, useContext, useState } from 'react';

export interface OnboardingData {
  age: string;
  gender: string;
  weight: string; // kg
  height: string; // cm
  weightUnit: 'kg' | 'lbs';
  heightUnit: 'cm' | 'ft';
  pregnancyStatus?: string;
  activityLevel: string;
}

interface ValidationErrors {
  age?: string;
  weight?: string;
  height?: string;
}

interface OnboardingContextType {
  data: OnboardingData;
  updateField: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  errors: ValidationErrors;
  loading: boolean;
  error: string | null;
  submit: () => Promise<boolean>;
  validate: () => boolean;
  isSection1Complete: () => boolean;
  isSection2Complete: () => boolean;
  isSection3Complete: () => boolean;
  isSection4Complete: () => boolean;
  canSubmit: () => boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const { user } = useClerkUser();
  const { refreshUser } = useUser();

  const [data, setData] = useState<OnboardingData>({
    age: '',
    gender: '',
    weight: '',
    height: '',
    weightUnit: 'lbs',
    heightUnit: 'ft',
    pregnancyStatus: undefined,
    activityLevel: '',
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Check if a section is complete
  const isSection1Complete = () => {
    return data.age !== '' && data.gender !== '' && !validateAge(data.age);
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
      return data.pregnancyStatus !== undefined && data.pregnancyStatus !== '';
    }
    return true; // Skip for non-females
  };

  const isSection4Complete = () => {
    return data.activityLevel !== '';
  };

  const canSubmit = () => {
    return (
      isSection1Complete() && isSection2Complete() && isSection3Complete() && isSection4Complete()
    );
  };

  // Submit the onboarding data
  const submit = async (): Promise<boolean> => {
    if (!validate()) {
      return false;
    }

    if (!user?.id || !user?.primaryEmailAddress?.emailAddress) {
      setError('User information is not available. Please try signing in again.');
      return false;
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
        gender: data.gender,
        activity_level: data.activityLevel,
      };

      // Only include pregnancy status for females
      if (data.gender === 'female' && data.pregnancyStatus) {
        payload.pregnancy_status = data.pregnancyStatus;
      }

      await createUser(payload, token);

      // Refresh user context to update isOnboarded status
      await refreshUser();

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create user profile';
      setError(errorMessage);
      return false;
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
