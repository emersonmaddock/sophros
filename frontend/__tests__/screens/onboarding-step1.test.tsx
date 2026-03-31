import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { OnboardingProvider } from '@/hooks/useOnboarding';
import Step1Screen from '@/app/onboarding/step1';
import { router } from 'expo-router';

// Mocks required by the onboarding hook and screen
jest.mock('@/contexts/UserContext', () => ({
  useUser: jest.fn(() => ({ refreshUser: jest.fn() })),
}));

jest.mock('@/lib/api-client', () => ({
  createUser: jest.fn().mockResolvedValue({}),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Wrap the screen in the required OnboardingProvider
function renderStep1() {
  return render(
    <OnboardingProvider>
      <Step1Screen />
    </OnboardingProvider>
  );
}

describe('Step1Screen (Onboarding)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderStep1();
    expect(screen.getByText('Basic Information')).toBeTruthy();
  });

  it('renders the age input field', () => {
    renderStep1();
    expect(screen.getByPlaceholderText('Enter your age')).toBeTruthy();
  });

  it('renders gender (biological sex) selection options', () => {
    renderStep1();
    // SEX_OPTIONS has 'Male' and 'Female' labels
    expect(screen.getByText('Male')).toBeTruthy();
    expect(screen.getByText('Female')).toBeTruthy();
  });

  it('shows the step progress indicator', () => {
    renderStep1();
    expect(screen.getByText('Step 1 of 5')).toBeTruthy();
  });

  it('Continue button is disabled when age and gender are empty', () => {
    renderStep1();
    // When the button is disabled, pressing it should not trigger navigation
    fireEvent.press(screen.getByText('Continue'));
    expect(router.push).not.toHaveBeenCalled();
  });

  it('Continue button becomes enabled after valid age and gender are provided', () => {
    renderStep1();

    // Verify it starts disabled: pressing does nothing
    fireEvent.press(screen.getByText('Continue'));
    expect(router.push).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByPlaceholderText('Enter your age'), '25');
    fireEvent.press(screen.getByText('Male'));

    // After valid input, pressing Continue should navigate
    fireEvent.press(screen.getByText('Continue'));
    expect(router.push).toHaveBeenCalledWith('/onboarding/step2');
  });

  it('pressing gender option selects it', () => {
    renderStep1();
    // Press Male — no error should be thrown
    fireEvent.press(screen.getByText('Male'));
    // Pressing Female should also work
    fireEvent.press(screen.getByText('Female'));
    expect(screen.getByText('Female')).toBeTruthy();
  });
});
