import type { Day, SavedMealPlanResponse, WeeklyMealPlanOutput } from '@/api/types.gen';
import { useSaveMealPlanMutation } from '@/lib/queries/mealPlan';
import type { WeeklyScheduleItem } from '@/types/schedule';
import {
  addItemToRawPlan,
  mapDailyPlanToScheduleItems,
  removeItemFromRawPlan,
} from '@/utils/mealPlanMapper';
import { useCallback, useEffect, useMemo, useState } from 'react';

const DAY_ORDER: Day[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useScheduleEditing(
  savedPlan: SavedMealPlanResponse | null | undefined,
  weekStartStr: string
) {
  const [rawPlan, setRawPlan] = useState<WeeklyMealPlanOutput | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const saveMutation = useSaveMealPlanMutation();

  // Initialize / reset rawPlan when savedPlan changes
  useEffect(() => {
    if (savedPlan?.plan_data) {
      setRawPlan(savedPlan.plan_data);
      setIsDirty(false);
      setSaveStatus('idle');
    } else {
      setRawPlan(null);
    }
  }, [savedPlan]);

  const removeItem = useCallback(
    (dayName: Day, itemId: string) => {
      if (!rawPlan) return;
      setRawPlan(removeItemFromRawPlan(rawPlan, dayName, itemId));
      setIsDirty(true);
      setSaveStatus('idle');
    },
    [rawPlan]
  );

  const addItem = useCallback(
    (dayName: Day, item: WeeklyScheduleItem) => {
      if (!rawPlan) return;
      setRawPlan(addItemToRawPlan(rawPlan, dayName, item));
      setIsDirty(true);
      setSaveStatus('idle');
    },
    [rawPlan]
  );

  const editItem = useCallback(
    (dayName: Day, oldItemId: string, updatedItem: WeeklyScheduleItem) => {
      if (!rawPlan) return;
      const afterRemove = removeItemFromRawPlan(rawPlan, dayName, oldItemId);
      const afterAdd = addItemToRawPlan(afterRemove, dayName, updatedItem);
      setRawPlan(afterAdd);
      setIsDirty(true);
      setSaveStatus('idle');
    },
    [rawPlan]
  );

  const save = useCallback(async () => {
    if (!rawPlan || !isDirty) return;
    setSaveStatus('saving');
    try {
      // WeeklyMealPlanOutput and WeeklyMealPlanInput have identical shapes
      await saveMutation.mutateAsync({
        week_start_date: weekStartStr,
        plan_data: rawPlan as unknown as import('@/api/types.gen').WeeklyMealPlanInput,
      });
      setIsDirty(false);
      setSaveStatus('saved');
      // Reset status after a delay
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  }, [rawPlan, isDirty, weekStartStr, saveMutation]);

  const getScheduleItems = useCallback(
    (dayIndex: number): WeeklyScheduleItem[] => {
      if (!rawPlan) return [];
      const dayName = DAY_ORDER[dayIndex];
      const dailyPlan = rawPlan.daily_plans?.find((p) => p.day === dayName);
      if (!dailyPlan) return [];
      return mapDailyPlanToScheduleItems(dailyPlan);
    },
    [rawPlan]
  );

  const statusText = useMemo(() => {
    switch (saveStatus) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'Changes saved';
      case 'error':
        return 'Error saving';
      default:
        return '';
    }
  }, [saveStatus]);

  return {
    rawPlan,
    isDirty,
    saveStatus,
    statusText,
    save,
    removeItem,
    addItem,
    editItem,
    getScheduleItems,
  };
}
