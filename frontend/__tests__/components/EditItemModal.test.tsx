import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { EditItemModal } from '@/components/EditItemModal';

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  return {
    BottomSheetModal: React.forwardRef(
      ({ children }: { children: React.ReactNode }, _ref: unknown) => <>{children}</>
    ),
    BottomSheetBackdrop: () => null,
    BottomSheetScrollView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// TimePickerInput renders a labeled control; we assert via its label.
jest.mock('@/components/TimePickerInput', () => ({
  TimePickerInput: ({ label, value }: { label: string; value: string }) => {
    const { View, Text } = require('react-native');
    return (
      <View accessibilityLabel={label}>
        <Text>{label}</Text>
        <Text>{value}</Text>
      </View>
    );
  },
}));

jest.mock('@/components/DurationPickerInput', () => ({
  DurationPickerInput: ({ label, value }: { label: string; value: string }) => {
    const { View, Text } = require('react-native');
    return (
      <View accessibilityLabel={label}>
        <Text>{label}</Text>
        <Text>{value}</Text>
      </View>
    );
  },
}));

describe('EditItemModal — meal add mode', () => {
  it('renders title, time, duration, and four nutrition inputs, all editable', () => {
    render(
      <EditItemModal
        visible
        onClose={jest.fn()}
        item={null}
        onSave={jest.fn()}
        mode="add"
        itemType="meal"
      />
    );
    expect(screen.getByText('Title')).toBeTruthy();
    expect(screen.getByText('Time')).toBeTruthy();
    expect(screen.getByText('Duration')).toBeTruthy();
    expect(screen.getByText('Calories')).toBeTruthy();
    expect(screen.getByText('Protein (g)')).toBeTruthy();
    expect(screen.getByText('Carbs (g)')).toBeTruthy();
    expect(screen.getByText('Fat (g)')).toBeTruthy();
    // The "Set by the recipe — cannot be edited here." note must be gone.
    expect(screen.queryByText(/Set by the recipe/i)).toBeNull();
  });

  it('saves with title, duration, and parsed nutrition fields', () => {
    const onSave = jest.fn();
    render(
      <EditItemModal
        visible
        onClose={jest.fn()}
        item={null}
        onSave={onSave}
        mode="add"
        itemType="meal"
      />
    );
    fireEvent.changeText(screen.getByPlaceholderText('e.g., Greek Yogurt Bowl'), 'Avocado Toast');
    fireEvent.changeText(screen.getByPlaceholderText('Calories'), '350');
    fireEvent.changeText(screen.getByPlaceholderText('Protein'), '12');
    fireEvent.changeText(screen.getByPlaceholderText('Carbs'), '40');
    fireEvent.changeText(screen.getByPlaceholderText('Fat'), '15');
    fireEvent.press(screen.getByText('Save'));

    expect(onSave).toHaveBeenCalledTimes(1);
    const arg = onSave.mock.calls[0][0];
    expect(arg.title).toBe('Avocado Toast');
    expect(arg.calories).toBe(350);
    expect(arg.protein).toBe(12);
    expect(arg.carbs).toBe(40);
    expect(arg.fat).toBe(15);
    expect(arg.type).toBe('meal');
  });

  it('blocks save when title is empty', () => {
    const onSave = jest.fn();
    render(
      <EditItemModal
        visible
        onClose={jest.fn()}
        item={null}
        onSave={onSave}
        mode="add"
        itemType="meal"
      />
    );
    fireEvent.press(screen.getByText('Save'));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Title is required')).toBeTruthy();
  });
});

describe('EditItemModal — meal edit mode', () => {
  const existingMeal = {
    id: '42',
    time: '9:00 AM',
    title: 'Existing Meal',
    duration: '30 min',
    type: 'meal' as const,
    calories: 400,
    protein: 25,
    carbs: 50,
    fat: 10,
  };

  it('renders only the time picker; no title, no duration, no nutrition fields', () => {
    render(
      <EditItemModal
        visible
        onClose={jest.fn()}
        item={existingMeal}
        onSave={jest.fn()}
        mode="edit"
        itemType="meal"
      />
    );
    expect(screen.getByText('Time')).toBeTruthy();
    expect(screen.queryByText('Title')).toBeNull();
    expect(screen.queryByText('Duration')).toBeNull();
    expect(screen.queryByText('Calories')).toBeNull();
    expect(screen.queryByText('Protein (g)')).toBeNull();
    expect(screen.queryByText('Carbs (g)')).toBeNull();
    expect(screen.queryByText('Fat (g)')).toBeNull();
  });

  it('saves only the time field', () => {
    const onSave = jest.fn();
    render(
      <EditItemModal
        visible
        onClose={jest.fn()}
        item={existingMeal}
        onSave={onSave}
        mode="edit"
        itemType="meal"
      />
    );
    fireEvent.press(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledTimes(1);
    const arg = onSave.mock.calls[0][0];
    expect(arg.time).toBe('9:00 AM');
    expect(arg.type).toBe('meal');
    expect(arg.id).toBe('42');
  });
});

describe('EditItemModal — workout edit mode (regression)', () => {
  it('still renders Title and Workout Type fields', () => {
    render(
      <EditItemModal
        visible
        onClose={jest.fn()}
        item={{
          id: '7',
          time: '6:00 PM',
          title: 'HIIT',
          duration: '45 min',
          type: 'workout',
          workoutType: 'HIIT',
        }}
        onSave={jest.fn()}
        mode="edit"
        itemType="workout"
      />
    );
    expect(screen.getByText('Title')).toBeTruthy();
    expect(screen.getByText('Workout Type')).toBeTruthy();
    expect(screen.getByText('Duration')).toBeTruthy();
  });
});
