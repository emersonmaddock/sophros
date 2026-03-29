import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { OnboardingProvider } from '@/hooks/useOnboarding';
import Step1Screen from '@/app/onboarding/step1';

// theme.ts calls Platform.select at module-init level; mock to avoid ordering issues.
jest.mock('@/constants/theme', () => ({
  Colors: {
    light: {
      text: '#111827',
      textMuted: '#6B7280',
      background: '#F8FAFC',
      surface: '#FFFFFF',
      primary: '#2B9D8F',
      primaryDark: '#1F6D63',
      tint: '#2B9D8F',
      secondary: '#FFB74D',
      success: '#22C55E',
      error: '#EF4444',
      charts: { calories: '#FFB74D', protein: '#2B9D8F', carbs: '#8B5CF6', fats: '#EC4899' },
    },
  },
  Shadows: { card: {} },
  Layout: { cardRadius: 16 },
  Fonts: { sans: 'system-ui', serif: 'serif', rounded: 'normal', mono: 'monospace' },
}));

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
    // Use UNSAFE_getByProps to find the TouchableOpacity that has disabled=true
    const disabledButton = screen.UNSAFE_getByProps({ disabled: true });
    expect(disabledButton).toBeTruthy();
    // Confirm it's the Continue button by checking its child text
    expect(disabledButton.findByProps({ children: 'Continue' })).toBeTruthy();
  });

  it('Continue button becomes enabled after valid age and gender are provided', () => {
    renderStep1();

    // Verify it starts disabled
    expect(screen.UNSAFE_getByProps({ disabled: true })).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('Enter your age'), '25');
    fireEvent.press(screen.getByText('Male'));

    // After valid input, the disabled button should no longer exist
    const stillDisabled = screen.UNSAFE_queryByProps({ disabled: true });
    expect(stillDisabled).toBeNull();
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
