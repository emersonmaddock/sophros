import { OnboardingData, initialOnboardingData } from '@/types/onboarding';
import React, { ReactNode, createContext, useCallback, useContext, useState } from 'react';

interface OnboardingContextType {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;
  resetOnboarding: () => void;
  completeOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OnboardingData>(initialOnboardingData);

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const nextStep = useCallback(() => {
    setData((prev) => {
      const newCompletedSteps = prev.completedSteps.includes(prev.currentStep)
        ? prev.completedSteps
        : [...prev.completedSteps, prev.currentStep];

      return {
        ...prev,
        currentStep: prev.currentStep + 1,
        completedSteps: newCompletedSteps,
      };
    });
  }, []);

  const previousStep = useCallback(() => {
    setData((prev) => ({
      ...prev,
      currentStep: Math.max(1, prev.currentStep - 1),
    }));
  }, []);

  const goToStep = useCallback((step: number) => {
    setData((prev) => ({
      ...prev,
      currentStep: step,
    }));
  }, []);

  const resetOnboarding = useCallback(() => {
    setData(initialOnboardingData);
  }, []);

  const completeOnboarding = useCallback(() => {
    setData((prev) => ({
      ...prev,
      isComplete: true,
    }));
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        data,
        updateData,
        nextStep,
        previousStep,
        goToStep,
        resetOnboarding,
        completeOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
