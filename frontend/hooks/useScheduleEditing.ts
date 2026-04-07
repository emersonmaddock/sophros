import type {
  Day,
  PlannedEventCreate,
  PlannedEventUpdate,
  SavedMealPlanResponse,
} from '@/api/types.gen';
import {
  useAddEventMutation,
  useDeleteEventMutation,
  useSaveMealPlanMutation,
  useUpdateEventMutation,
} from '@/lib/queries/mealPlan';
import type { WeeklyScheduleItem } from '@/types/schedule';
import { displayTimeToApiTime, mapDailyPlanToScheduleItems } from '@/utils/mealPlanMapper';
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

function inferSlotName(hour: number): PlannedEventCreate['slot_name'] {
  if (hour < 11) return 'Breakfast';
  if (hour < 15) return 'Lunch';
  return 'Dinner';
}

function parseHourFromDisplayTime(displayTime: string): number {
  const [timePart, period] = displayTime.split(' ');
  const [hours] = timePart.split(':').map(Number);
  let h = hours;
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h;
}

export function useScheduleEditing(
  savedPlan: SavedMealPlanResponse | null | undefined,
  weekStartStr: string
) {
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const saveMutation = useSaveMealPlanMutation();
  const addEventMutation = useAddEventMutation();
  const updateEventMutation = useUpdateEventMutation();
  const deleteEventMutation = useDeleteEventMutation();

  // Reset dirty state when savedPlan changes (e.g. after save + refetch)
  useEffect(() => {
    if (savedPlan) {
      setIsDirty(false);
      setSaveStatus('idle');
    }
  }, [savedPlan]);

  const planId = savedPlan?.id;

  const removeItem = useCallback(
    async (dayName: Day, itemId: string) => {
      const numId = parseInt(itemId);
      if (isNaN(numId)) return;
      try {
        await deleteEventMutation.mutateAsync(numId);
      } catch {
        // Query invalidation will handle UI update
      }
    },
    [deleteEventMutation]
  );

  const addItem = useCallback(
    async (dayName: Day, item: WeeklyScheduleItem) => {
      if (!planId) return;

      const hour = parseHourFromDisplayTime(item.time);
      const apiTime = displayTimeToApiTime(item.time);

      const event: PlannedEventCreate = {
        day: dayName,
        event_type: item.type,
        time: apiTime,
        title: item.title,
        duration_minutes: parseInt(item.duration) || undefined,
      };

      if (item.type === 'meal') {
        event.slot_name = inferSlotName(hour);
        event.calories = item.calories || 0;
        event.protein = item.protein || 0;
        event.carbohydrates = item.carbs || 0;
        event.fat = item.fat || 0;
      } else if (item.type === 'workout') {
        event.exercise_category = item.workoutType || 'Cardio';
        event.calories_burned = item.calories;
      } else if (item.type === 'sleep') {
        event.target_hours = item.targetHours;
      }

      try {
        await addEventMutation.mutateAsync({ planId, event });
      } catch {
        // Query invalidation will handle UI update
      }
    },
    [planId, addEventMutation]
  );

  const editItem = useCallback(
    async (dayName: Day, oldItemId: string, updatedItem: WeeklyScheduleItem) => {
      const numId = parseInt(oldItemId);
      if (isNaN(numId)) return;

      const updates: PlannedEventUpdate = {
        title: updatedItem.title,
        time: displayTimeToApiTime(updatedItem.time),
      };

      if (updatedItem.type === 'meal') {
        updates.calories = updatedItem.calories || 0;
        updates.protein = updatedItem.protein || 0;
        updates.carbohydrates = updatedItem.carbs || 0;
        updates.fat = updatedItem.fat || 0;
      } else if (updatedItem.type === 'workout') {
        updates.exercise_category = updatedItem.workoutType;
        updates.calories_burned = updatedItem.calories;
      } else if (updatedItem.type === 'sleep') {
        updates.target_hours = updatedItem.targetHours;
      }

      try {
        await updateEventMutation.mutateAsync({ eventId: numId, updates });
      } catch {
        // Query invalidation will handle UI update
      }
    },
    [updateEventMutation]
  );

  // save() is only for the initial generation flow (saving a full WeeklyMealPlan)
  const save = useCallback(async () => {
    if (!savedPlan?.plan_data || !isDirty) return;
    setSaveStatus('saving');
    try {
      await saveMutation.mutateAsync({
        week_start_date: weekStartStr,
        plan_data: savedPlan.plan_data as unknown as import('@/api/types.gen').WeeklyMealPlanInput,
      });
      setIsDirty(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  }, [savedPlan, isDirty, weekStartStr, saveMutation]);

  const getScheduleItems = useCallback(
    (dayIndex: number): WeeklyScheduleItem[] => {
      if (!savedPlan?.plan_data) return [];
      const dayName = DAY_ORDER[dayIndex];
      const dailyPlan = savedPlan.plan_data.daily_plans?.find((p) => p.day === dayName);
      if (!dailyPlan) return [];
      return mapDailyPlanToScheduleItems(dailyPlan);
    },
    [savedPlan]
  );

  const statusText = useMemo(() => {
    if (
      addEventMutation.isPending ||
      updateEventMutation.isPending ||
      deleteEventMutation.isPending
    ) {
      return 'Saving...';
    }
    switch (saveStatus) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'Changes saved';
      case 'error':
        return 'Error saving';
      default:
        return 'AI-optimized';
    }
  }, [
    saveStatus,
    addEventMutation.isPending,
    updateEventMutation.isPending,
    deleteEventMutation.isPending,
  ]);

  return {
    planId,
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
