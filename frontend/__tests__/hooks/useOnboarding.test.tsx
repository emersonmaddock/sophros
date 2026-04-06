import { OnboardingProvider, useOnboarding } from '@/hooks/useOnboarding';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

// Mocks
jest.mock('@/contexts/UserContext', () => ({
  useUser: jest.fn(() => ({ refreshUser: jest.fn() })),
}));
jest.mock('@/lib/api-client', () => ({
  createUser: jest.fn().mockResolvedValue({}),
}));

import { createUser } from '@/lib/api-client';

const mockCreateUser = createUser as jest.MockedFunction<typeof createUser>;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <OnboardingProvider>{children}</OnboardingProvider>
);

function renderOnboarding() {
  return renderHook(() => useOnboarding(), { wrapper });
}

// Valid data for all sections (age 25-120, weight 20-300, height 100-250)
const VALID_AGE = '25';
const VALID_WEIGHT = '70';
const VALID_HEIGHT = '170';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- initial state ---

  it('has correct initial state', () => {
    const { result } = renderOnboarding();
    expect(result.current.data.age).toBe('');
    expect(result.current.data.gender).toBeNull();
    expect(result.current.errors).toEqual({});
    expect(result.current.loading).toBe(false);
  });

  // --- updateField ---

  it('updateField("age", "25") updates data.age', () => {
    const { result } = renderOnboarding();
    act(() => {
      result.current.updateField('age', '25');
    });
    expect(result.current.data.age).toBe('25');
  });

  it('updating a field clears its existing error', async () => {
    const { result } = renderOnboarding();

    // First trigger an error on age
    act(() => {
      result.current.validate();
    });
    expect(result.current.errors.age).toBeDefined();

    // Now update age — error should clear
    act(() => {
      result.current.updateField('age', '25');
    });
    expect(result.current.errors.age).toBeUndefined();
  });

  // --- validate ---

  it('validate() with all empty fields returns false and sets errors', () => {
    const { result } = renderOnboarding();
    let isValid: boolean;
    act(() => {
      isValid = result.current.validate();
    });
    expect(isValid!).toBe(false);
    expect(result.current.errors.age).toBeDefined();
    expect(result.current.errors.weight).toBeDefined();
    expect(result.current.errors.height).toBeDefined();
    expect(result.current.errors.gender).toBeDefined();
    expect(result.current.errors.activityLevel).toBeDefined();
    expect(result.current.errors.targetWeight).toBeDefined();
    expect(result.current.errors.targetDate).toBeDefined();
  });

  it('validate() with valid values returns true and no errors', () => {
    const { result } = renderOnboarding();
    act(() => {
      result.current.updateField('age', VALID_AGE);
      result.current.updateField('weight', VALID_WEIGHT);
      result.current.updateField('height', VALID_HEIGHT);
      result.current.updateField('gender', 'male');
      result.current.updateField('activityLevel', 'moderate');
      result.current.updateField('targetWeight', '65');
      result.current.updateField('targetDate', '2026-12-31');
    });
    let isValid: boolean;
    act(() => {
      isValid = result.current.validate();
    });
    expect(isValid!).toBe(true);
    expect(result.current.errors).toEqual({});
  });

  // --- section completion ---

  it('isSection1Complete() is false when age is empty', () => {
    const { result } = renderOnboarding();
    expect(result.current.isSection1Complete()).toBe(false);
  });

  it('isSection1Complete() is true when age is valid and gender is set', () => {
    const { result } = renderOnboarding();
    act(() => {
      result.current.updateField('age', VALID_AGE);
      result.current.updateField('gender', 'male');
    });
    expect(result.current.isSection1Complete()).toBe(true);
  });

  it('isSection2Complete() is false when weight and height are empty', () => {
    const { result } = renderOnboarding();
    expect(result.current.isSection2Complete()).toBe(false);
  });

  it('isSection2Complete() is true when weight and height are valid', () => {
    const { result } = renderOnboarding();
    act(() => {
      result.current.updateField('weight', VALID_WEIGHT);
      result.current.updateField('height', VALID_HEIGHT);
    });
    expect(result.current.isSection2Complete()).toBe(true);
  });

  it('isSection3Complete() is true for male (non-female)', () => {
    const { result } = renderOnboarding();
    act(() => {
      result.current.updateField('gender', 'male');
    });
    expect(result.current.isSection3Complete()).toBe(true);
  });

  it('isSection3Complete() is false for female when pregnancyStatus is not set', () => {
    const { result } = renderOnboarding();
    act(() => {
      result.current.updateField('gender', 'female');
    });
    expect(result.current.isSection3Complete()).toBe(false);
  });

  it('isSection3Complete() is true for female when pregnancyStatus is set', () => {
    const { result } = renderOnboarding();
    act(() => {
      result.current.updateField('gender', 'female');
      result.current.updateField('pregnancyStatus', 'not_pregnant');
    });
    expect(result.current.isSection3Complete()).toBe(true);
  });

  it('canSubmit() is true only when all sections are complete', () => {
    const { result } = renderOnboarding();

    // Start with incomplete
    expect(result.current.canSubmit()).toBe(false);

    // Fill all required fields
    act(() => {
      result.current.updateField('age', VALID_AGE);
      result.current.updateField('gender', 'male');
      result.current.updateField('weight', VALID_WEIGHT);
      result.current.updateField('height', VALID_HEIGHT);
      result.current.updateField('activityLevel', 'moderate');
      result.current.updateField('targetWeight', '65');
      result.current.updateField('targetDate', '2026-12-31');
    });

    expect(result.current.canSubmit()).toBe(true);
  });

  // --- submit ---

  it('submit() with valid data calls createUser and returns true', async () => {
    mockCreateUser.mockResolvedValueOnce({} as any);
    const { result } = renderOnboarding();

    act(() => {
      result.current.updateField('age', VALID_AGE);
      result.current.updateField('gender', 'male');
      result.current.updateField('weight', VALID_WEIGHT);
      result.current.updateField('height', VALID_HEIGHT);
      result.current.updateField('activityLevel', 'moderate');
      result.current.updateField('targetWeight', '65');
      result.current.updateField('targetDate', '2026-12-31');
    });

    let submitResult: boolean;
    await act(async () => {
      submitResult = await result.current.submit();
    });

    expect(submitResult!).toBe(true);
    expect(mockCreateUser).toHaveBeenCalledTimes(1);
    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@example.com',
        age: 25,
        weight: 70,
        height: 170,
        gender: 'male',
        activity_level: 'moderate',
      }),
      'mock-token'
    );
  });

  it('submit() with invalid data does NOT call createUser and returns false', async () => {
    const { result } = renderOnboarding();

    let submitResult: boolean;
    await act(async () => {
      submitResult = await result.current.submit();
    });

    expect(submitResult!).toBe(false);
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it('submit() sets error when createUser throws', async () => {
    mockCreateUser.mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderOnboarding();

    // Set all required fields to valid values first
    act(() => {
      result.current.updateField('age', VALID_AGE);
      result.current.updateField('gender', 'male');
      result.current.updateField('weight', VALID_WEIGHT);
      result.current.updateField('height', VALID_HEIGHT);
      result.current.updateField('activityLevel', 'moderate');
      result.current.updateField('targetWeight', '65');
      result.current.updateField('targetDate', '2026-12-31');
    });

    let success: boolean;
    await act(async () => {
      success = await result.current.submit();
    });

    expect(success!).toBe(false);
    expect(result.current.error).toBe('Network error');
  });
});
