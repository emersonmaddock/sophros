/**
 * useProgressData — reads local progress logs + current user profile and
 * returns a fully-computed ProgressSnapshot (or null while loading).
 *
 * Responsibilities:
 *   1. Purge future-dated entries whenever `now` changes (including dev override).
 *   2. Seed a baseline weight entry from the backend user profile on first use.
 *   3. Snapshot the active goal definition and detect when it changes.
 *   4. Detect goal completion and archive the summary locally.
 *   5. Compute goal mode, chart data, confidence, and maintain-mode band.
 *
 * `reload()` can be called after any local write (weight log, body fat log)
 * to trigger a re-read without waiting for the next `now` tick.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSleepLogCount } from '@/components/SleepWakePrompt';
import { useNow } from '@/hooks/useNow';
import { useUserQuery } from '@/lib/queries/user';
import {
  archiveGoal,
  getBodyFatLog,
  getGoalSnapshot,
  getLatestArchivedGoal,
  getWeightLog,
  localDateStr,
  purgeFutureProgressData,
  saveGoalSnapshot,
  upsertWeightEntry,
} from '@/lib/progress/storage';
import {
  buildArchivedGoalSummary,
  computeConfidenceScore,
  computeStabilityBand,
  goalId,
  hasGoalChanged,
  inferGoalMode,
  isGoalComplete,
  isMaintainInRange,
  toConfidenceLevel,
} from '@/lib/progress/compute';
import type { ProgressSnapshot } from '@/lib/progress/compute';
import { useCallback, useEffect, useRef, useState } from 'react';

const ACHIEVEMENTS_KEY = 'achievements_data';

type AchievementsData = {
  mealsConfirmed: number;
  workoutsConfirmed: number;
};

async function readAchievementsData(): Promise<AchievementsData> {
  const raw = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
  if (!raw) return { mealsConfirmed: 0, workoutsConfirmed: 0 };
  return JSON.parse(raw) as AchievementsData;
}

export function useProgressData(): {
  snapshot: ProgressSnapshot | null;
  isLoading: boolean;
  reload: () => void;
} {
  const now = useNow();
  const { data: user, isLoading: isUserLoading } = useUserQuery();
  const [snapshot, setSnapshot] = useState<ProgressSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Increment to trigger a manual reload
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // Track the last date we loaded for so we can skip redundant runs
  const lastLoadDate = useRef<string | null>(null);

  useEffect(() => {
    if (isUserLoading || !user) return;

    const today = localDateStr(now);

    // Skip if same date and same reload key as previous run
    const runKey = `${today}:${reloadKey}`;
    if (lastLoadDate.current === runKey) return;
    lastLoadDate.current = runKey;

    let cancelled = false;

    async function load() {
      setIsLoading(true);

      // Step 1: purge future entries (handles time-travel backward)
      await purgeFutureProgressData(now);

      // Step 2: check if goal data is complete
      const targetWeightKg = user!.target_weight ?? null;
      const targetDate = user!.target_date ?? null;

      if (targetWeightKg === null || targetDate === null) {
        if (!cancelled) {
          setSnapshot({
            goalMode: 'maintain',
            startDate: today,
            startWeightKg: user!.weight,
            latestWeightKg: user!.weight,
            targetWeightKg: user!.weight,
            targetDate: '',
            weightHistory: [],
            bodyFatHistory: [],
            confidenceScore: 0,
            confidenceLevel: 'low',
            goalComplete: false,
            archivedGoal: null,
            stabilityBand: null,
            maintainInRange: null,
            hasBodyFatData: false,
            missingGoalData: true,
          });
          setIsLoading(false);
        }
        return;
      }

      // Step 3: load logs
      const [weightLog, bfLog, storedSnapshot, achievements, sleepCount] =
        await Promise.all([
          getWeightLog(),
          getBodyFatLog(),
          getGoalSnapshot(),
          readAchievementsData(),
          getSleepLogCount(),
        ]);

      // Step 4: seed baseline from backend user weight if no local weight log exists
      let finalWeightLog = weightLog;
      if (weightLog.length === 0) {
        const baseline = {
          date: today,
          weightKg: user!.weight,
          source: 'baseline' as const,
        };
        await upsertWeightEntry(baseline);
        finalWeightLog = [baseline];
      }

      // Step 5: manage goal snapshot
      let activeSnapshot = storedSnapshot;
      const goalChanged =
        storedSnapshot !== null &&
        hasGoalChanged(storedSnapshot, targetWeightKg, targetDate);

      if (storedSnapshot === null || goalChanged) {
        // First use or goal changed — start a new goal period
        activeSnapshot = {
          startWeightKg: finalWeightLog[finalWeightLog.length - 1].weightKg,
          targetWeightKg,
          targetBodyFat: user!.target_body_fat ?? null,
          targetDate,
          startDate: today,
        };
        await saveGoalSnapshot(activeSnapshot);
      }

      // Step 6: detect goal completion and archive
      const complete = isGoalComplete(targetDate, now);
      let archivedGoal = null;

      if (complete) {
        const id = goalId(activeSnapshot!);
        const existing = await getLatestArchivedGoal();
        if (!existing || existing.id !== id) {
          // First detection of completion — build and store the summary
          const summary = buildArchivedGoalSummary(
            id,
            activeSnapshot!,
            finalWeightLog,
            bfLog,
            now
          );
          await archiveGoal(summary);
          archivedGoal = summary;
        } else {
          archivedGoal = existing;
        }
      }

      // Step 7: compute display values
      const latestWeight =
        finalWeightLog.length > 0
          ? finalWeightLog[finalWeightLog.length - 1].weightKg
          : user!.weight;
      const startWeight = activeSnapshot!.startWeightKg;
      const goalMode = inferGoalMode(startWeight, targetWeightKg);

      const confidenceScore = computeConfidenceScore({
        weightHistory: finalWeightLog,
        sleepLogCount: sleepCount,
        mealConfirmedCount: achievements.mealsConfirmed,
        workoutConfirmedCount: achievements.workoutsConfirmed,
        now,
      });
      const confLevel = toConfidenceLevel(confidenceScore);

      const band = goalMode === 'maintain' ? computeStabilityBand(targetWeightKg) : null;
      const maintainInRange =
        band !== null ? isMaintainInRange(latestWeight, band) : null;

      if (!cancelled) {
        setSnapshot({
          goalMode,
          startDate: activeSnapshot!.startDate,
          startWeightKg: startWeight,
          latestWeightKg: latestWeight,
          targetWeightKg,
          targetDate,
          weightHistory: finalWeightLog,
          bodyFatHistory: bfLog,
          confidenceScore,
          confidenceLevel: confLevel,
          goalComplete: complete,
          archivedGoal,
          stabilityBand: band,
          maintainInRange,
          hasBodyFatData: bfLog.length > 0,
          missingGoalData: false,
        });
        setIsLoading(false);
      }
    }

    load().catch(console.error);

    return () => {
      cancelled = true;
    };
    // Re-run whenever date changes, user changes, or reload is triggered
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now.toDateString(), user, isUserLoading, reloadKey]);

  return { snapshot, isLoading: isLoading || isUserLoading, reload };
}
