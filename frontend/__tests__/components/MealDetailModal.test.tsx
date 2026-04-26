import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { MealDetailModal } from '@/components/MealDetailModal';

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

const baseMeal = {
  time: '8:00 AM',
  title: 'Avocado Toast',
  type: 'meal',
  meal: {
    id: 1,
    recipe_id: null,
    title: 'Avocado Toast',
    calories: 350,
    protein: 12,
    carbohydrates: 40,
    fat: 15,
    prep_time_minutes: 10,
    ingredients: [],
    tags: [],
    is_custom: true,
  },
};

describe('MealDetailModal', () => {
  it('shows a Reschedule button (renamed from Modify)', () => {
    render(
      <MealDetailModal
        visible
        onClose={jest.fn()}
        meal={baseMeal as any}
        onModify={jest.fn()}
        onRemove={jest.fn()}
      />
    );
    expect(screen.getByText('Reschedule')).toBeTruthy();
    expect(screen.queryByText('Modify')).toBeNull();
  });

  it('fires onModify when Reschedule is pressed', () => {
    const onModify = jest.fn();
    const onClose = jest.fn();
    render(
      <MealDetailModal
        visible
        onClose={onClose}
        meal={baseMeal as any}
        onModify={onModify}
        onRemove={jest.fn()}
      />
    );
    fireEvent.press(screen.getByText('Reschedule'));
    expect(onModify).toHaveBeenCalledTimes(1);
  });

  it('fires onRemove when Remove is pressed', () => {
    const onRemove = jest.fn();
    render(
      <MealDetailModal
        visible
        onClose={jest.fn()}
        meal={baseMeal as any}
        onModify={jest.fn()}
        onRemove={onRemove}
      />
    );
    fireEvent.press(screen.getByText('Remove'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
