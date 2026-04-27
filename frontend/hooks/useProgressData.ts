/**
 * useProgressData — reads progress logs from the backend DB and the current
 * user profile and returns a fully-computed ProgressSnapshot (or null while
 * loading).
 *
 * Responsibilities:
 *   1. Purge future-dated entries on the server whenever `now` changes.
 *   2. Seed a baseline weight entry if the DB has no weight log yet.
 *   3. Read the active goal snapshot from user.goal_start_date / goal_start_weight_kg
 *      and detect when it changes (saving the new snapshot via PUT /users/me).
 *   4. Detect goal completion and archive the summary to the DB.
 *   5. Compute goal mode, chart data, and confidence score.
 *
 * `reload()` triggers a re-run without waiting for the next date tick.
 */
import { getSleepLogCount } from '@/components/SleepWakePrompt';
import { useNow } from '@/hooks/useNow';
import { useUpdateUserMutation, useUserQuery } from '@/lib/queries/user';
import { useWeekScheduleQuery } from '@/lib/queries/schedule';
import {
  archiveGoal,
  getLatestArchivedGoal,
  getStoredGoalTarget,
  getWeightLog,
  localDateStr,
  purgeFutureProgressData,
  setStoredGoalTarget,
  upsertWeightEntry,
} from '@/lib/progress/storage';
import type { GoalSnapshot } from '@/lib/progress/storage';
import {
  buildArchivedGoalSummary,
  computeConfidenceScore,
  goalId,
  inferGoalMode,
  isGoalComplete,
  toConfidenceLevel,
} from '@/lib/progress/compute';
import type { ProgressSnapshot } from '@/lib/progress/compute';
import { mondayOf } from '@/utils/date';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ScheduleItemRead } from '@/api/types.gen';

export function useProgressData(): {
  snapshot: ProgressSnapshot | null;
  isLoading: boolean;
  reload: () => void;
} {
  const now = useNow();
  const { data: user, isLoading: isUserLoading, isError: isUserError } = useUserQuery();
  const updateUser = useUpdateUserMutation();
  const [snapshot, setSnapshot] = useState<ProgressSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const lastLoadDate = useRef<string | null>(null);
  const scheduleItemsRef = useRef<ScheduleItemRead[]>([]);

  // Fetch current + previous week of schedule items to count confirmed
  // meals and workouts for the 14-day confidence score window.
  const currentWeekStart = useMemo(() => mondayOf(now), [now.toDateString()]); // eslint-disable-line react-hooks/exhaustive-deps
  const prevWeekStart = useMemo(() => {
    const d = new Date(currentWeekStart + 'T00:00:00');
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  }, [currentWeekStart]);

  const { data: currentWeekItems = [] } = useWeekScheduleQuery(currentWeekStart);
  const { data: prevWeekItems = [] } = useWeekScheduleQuery(prevWeekStart);

  const scheduleItems = useMemo(
    () => [...currentWeekItems, ...prevWeekItems],
    [currentWeekItems, prevWeekItems]
  );
  scheduleItemsRef.current = scheduleItems;

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      setIsLoading(false);
      return;
    }

    const today = localDateStr(now);
    // Include the goal target in the key so changing target_date or target_weight
    // always forces a fresh load, even when the calendar date hasn't changed.
    const runKey = `${today}:${reloadKey}:${user.target_date ?? ''}:${user.target_weight ?? ''}`;
    if (lastLoadDate.current === runKey) return;
    lastLoadDate.current = runKey;

    let cancelled = false;

    async function load() {
      setIsLoading(true);

      // Step 1: fetch weight log and sleep count in parallel
      const [rawWeightLog, rawSleepCount] = await Promise.all([
        getWeightLog(),
        getSleepLogCount(),
      ]);

      // Step 1b: purge future entries using already-fetched data — fire-and-forget
      void purgeFutureProgressData(now, { weightLog: rawWeightLog });

      // Filter future-dated entries out of the local data used for rendering.
      const weightLog = rawWeightLog.filter((e) => e.date <= today);

      // Step 2: check if goal data is complete
      const targetWeightKg = user!.target_weight ?? null;
      const targetDate = user!.target_date
        ? typeof user!.target_date === 'string'
          ? user!.target_date
          : (user!.target_date as Date).toISOString().slice(0, 10)
        : null;

      if (targetWeightKg === null || targetDate === null) {
        if (!cancelled) {
          setSnapshot({
            goalMode: 'gain',
            startDate: today,
            startWeightKg: user!.weight,
            latestWeightKg: user!.weight,
            targetWeightKg: user!.weight,
            targetDate: '',
            weightHistory: [],
            confidenceScore: 0,
            confidenceLevel: 'low',
            goalComplete: false,
            archivedGoal: null,
            missingGoalData: true,
          });
          setIsLoading(false);
        }
        return;
      }

      // Step 3: seed baseline from user weight if no weight log exists
      let finalWeightLog = weightLog;
      if (weightLog.length === 0) {
        const baseline = { date: today, weightKg: user!.weight, source: 'baseline' as const };
        await upsertWeightEntry(baseline);
        finalWeightLog = [baseline];
      }

      // Step 4: manage goal snapshot.
      // goal_start_date / goal_start_weight_kg live on the User record and record
      // when the current goal period started and the weight at that time.
      //
      // To detect when the user has changed their goal (new target_date / target_weight),
      // we compare against a locally-stored "goal target at last period start". This is
      // necessary because the user record only stores the *current* target, not the one
      // that was active when the goal period began.
      const cachedUser = user as {
        goal_start_date?: string | null;
        goal_start_weight_kg?: number | null;
      };
      const storedStartDate = cachedUser.goal_start_date ?? null;
      const storedStartWeight = cachedUser.goal_start_weight_kg ?? null;

      const storedGoalTarget = await getStoredGoalTarget();
      const goalChanged =
        storedStartDate !== null &&
        storedGoalTarget !== null &&
        (storedGoalTarget.targetDate !== targetDate ||
          Math.abs(storedGoalTarget.targetWeightKg - targetWeightKg) > 0.01);

      let activeSnapshot: GoalSnapshot | null = null;

      if (storedStartDate !== null && storedStartWeight !== null && !goalChanged) {
        activeSnapshot = {
          startWeightKg: storedStartWeight,
          targetWeightKg,
          targetDate,
          startDate: storedStartDate,
        };
      }

      if (activeSnapshot === null || goalChanged) {
        const startWeight = finalWeightLog[finalWeightLog.length - 1].weightKg;
        activeSnapshot = {
          startWeightKg: startWeight,
          targetWeightKg,
          targetDate,
          startDate: today,
        };
        // Persist new goal period start and the target it was started for.
        await Promise.all([
          updateUser.mutateAsync({
            goal_start_date: activeSnapshot.startDate,
            goal_start_weight_kg: activeSnapshot.startWeightKg,
          }),
          setStoredGoalTarget(targetDate, targetWeightKg),
        ]);
      } else if (storedGoalTarget === null) {
        // First run after this logic was introduced — seed the stored target
        // without resetting the goal period so existing users are unaffected.
        await setStoredGoalTarget(targetDate, targetWeightKg);
      }

      // Step 5: detect goal completion and archive
      const complete = isGoalComplete(targetDate, now);
      let archivedGoal = null;

      if (complete) {
        const id = goalId(activeSnapshot!);
        const existing = await getLatestArchivedGoal();
        if (!existing || existing.id !== id) {
          const summary = buildArchivedGoalSummary(id, activeSnapshot!, finalWeightLog, now);
          await archiveGoal(summary);
          archivedGoal = summary;
        } else {
          archivedGoal = existing;
        }
      }

      // Step 6: count confirmed meals/workouts from the 2-week schedule window
      const mealsConfirmed = scheduleItemsRef.current.filter(
        (i) => i.is_completed === true && i.activity_type === 'meal'
      ).length;
      const workoutsConfirmed = scheduleItemsRef.current.filter(
        (i) => i.is_completed === true && i.activity_type === 'exercise'
      ).length;

      // Step 7: compute display values
      const latestWeight =
        finalWeightLog.length > 0
          ? finalWeightLog[finalWeightLog.length - 1].weightKg
          : user!.weight;
      const startWeight = activeSnapshot!.startWeightKg;
      const goalMode = inferGoalMode(startWeight, targetWeightKg);

      const confidenceScore = computeConfidenceScore({
        weightHistory: finalWeightLog,
        sleepLogCount: rawSleepCount,
        mealConfirmedCount: mealsConfirmed,
        workoutConfirmedCount: workoutsConfirmed,
        now,
      });
      const confLevel = toConfidenceLevel(confidenceScore);

      if (!cancelled) {
        setSnapshot({
          goalMode,
          startDate: activeSnapshot!.startDate,
          startWeightKg: startWeight,
          latestWeightKg: latestWeight,
          targetWeightKg,
          targetDate,
          weightHistory: finalWeightLog,
          confidenceScore,
          confidenceLevel: confLevel,
          goalComplete: complete,
          archivedGoal,
          missingGoalData: false,
        });
        setIsLoading(false);
      }
    }

    load().catch(console.error);
    return () => {
      cancelled = true;
    };
    // Depend on stable scalar fields from `user` rather than the object reference
    // itself, so React Query background refetches don't spuriously re-trigger load().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    now.toDateString(),
    user?.id,
    user?.target_weight,
    user?.target_date,
    user?.goal_start_date,
    user?.goal_start_weight_kg,
    isUserLoading,
    isUserError,
    reloadKey,
  ]);

  return { snapshot, isLoading: isLoading || isUserLoading, reload };
}
