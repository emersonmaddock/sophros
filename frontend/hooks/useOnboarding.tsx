import type {
  ActivityLevel,
  Allergy,
  Cuisine,
  PregnancyStatus,
  Sex,
  UserCreate,
} from '@/api/types.gen';
import { VALIDATION_RULES } from '@/constants/onboarding';
import { useUser } from '@/contexts/UserContext';
import { createUser } from '@/lib/api-client';
import { useAuth, useUser as useClerkUser } from '@clerk/expo';
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
  targetDate: string; // YYYY-MM-DD
  targetBodyFat: string; // percentage
  wakeUpTime: string; // HH:MM
  sleepTime: string; // HH:MM
  allergies: Allergy[];
  includeCuisine: Cuisine[];
  excludeCuisine: Cuisine[];
  isGlutenFree: boolean;
  isKetogenic: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  isPescatarian: boolean;
}

interface ValidationErrors {
  age?: string;
  weight?: string;
  height?: string;
  gender?: string;
  activityLevel?: string;
  targetWeight?: string;
  targetDate?: string;
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
  isSection5Complete: () => boolean;
  isSection6Complete: () => boolean;
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
    targetDate: '',
    targetBodyFat: '',
    wakeUpTime: '07:00',
    sleepTime: '23:00',
    allergies: [],
    includeCuisine: [],
    excludeCuisine: [],
    isGlutenFree: false,
    isKetogenic: false,
    isVegetarian: false,
    isVegan: false,
    isPescatarian: false,
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

    const targetWeightKg = parseFloat(data.targetWeight);
    if (!data.targetWeight || isNaN(targetWeightKg) || targetWeightKg <= 0) {
      newErrors.targetWeight = 'Target weight is required';
    }

    if (!data.targetDate) {
      newErrors.targetDate = 'Target date is required';
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
    const weightNum = parseFloat(data.targetWeight);
    if (!data.targetWeight || isNaN(weightNum) || weightNum <= 0) return false;
    if (!data.targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(data.targetDate)) return false;
    const bodyFat = parseFloat(data.targetBodyFat);
    if (!data.targetBodyFat || isNaN(bodyFat) || bodyFat < 3 || bodyFat > 60) return false;
    const targetWeightKg = parseFloat(data.targetWeight);
    return !isNaN(targetWeightKg) && targetWeightKg > 0 && data.targetDate !== '';
  };

  const isSection6Complete = () => {
    // All dietary fields are optional
    return true;
  };

  const canSubmit = () => {
    return (
      isSection1Complete() &&
      isSection2Complete() &&
      isSection3Complete() &&
      isSection4Complete() &&
      isSection5Complete()
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
        gender: data.gender as Sex, // Validated in validate()
        activity_level: data.activityLevel as ActivityLevel, // Validated in validate()
        show_imperial: data.showImperial,
      };

      // Only include pregnancy status for females
      if (data.gender === 'female' && data.pregnancyStatus) {
        payload.pregnancy_status = data.pregnancyStatus;
      }

      // Include required goal fields
      const targetWeightKg = parseFloat(data.targetWeight);
      payload.target_weight = targetWeightKg;
      payload.target_date = data.targetDate;
      payload.target_body_fat = parseFloat(data.targetBodyFat);
      // Include target weight (now required)
      payload.target_weight = parseFloat(data.targetWeight);

      // Include target date (now required)
      payload.target_date = data.targetDate;

      // Include wake/sleep times
      if (data.wakeUpTime) {
        payload.wake_up_time = `${data.wakeUpTime}:00`;
      }
      if (data.sleepTime) {
        payload.sleep_time = `${data.sleepTime}:00`;
      }

      // Include dietary preferences
      if (data.allergies.length > 0) {
        payload.allergies = data.allergies;
      }
      if (data.includeCuisine.length > 0) {
        payload.include_cuisine = data.includeCuisine;
      }
      if (data.excludeCuisine.length > 0) {
        payload.exclude_cuisine = data.excludeCuisine;
      }
      payload.is_gluten_free = data.isGlutenFree;
      payload.is_ketogenic = data.isKetogenic;
      payload.is_vegetarian = data.isVegetarian;
      payload.is_vegan = data.isVegan;
      payload.is_pescatarian = data.isPescatarian;

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
    isSection5Complete,
    isSection6Complete,
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
