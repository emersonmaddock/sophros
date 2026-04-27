/**
 * progress/compute — pure functions that derive view-ready progress state
 * from raw local logs and the current user profile.
 *
 * No AsyncStorage access here — all I/O is handled by storage.ts and
 * useProgressData.ts. These functions are pure so they're easy to test.
 */
import type { WeightLogEntry, GoalSnapshot, ArchivedGoalSummary } from './storage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GoalMode = 'lose' | 'gain';
export type ConfidenceLevel = 'low' | 'medium' | 'high';

export type ProgressSnapshot = {
  goalMode: GoalMode;
  startDate: string; // YYYY-MM-DD — when this goal period started
  startWeightKg: number;
  latestWeightKg: number;
  targetWeightKg: number;
  targetDate: string;
  weightHistory: WeightLogEntry[];
  confidenceScore: number;
  confidenceLevel: ConfidenceLevel;
  goalComplete: boolean;
  archivedGoal: ArchivedGoalSummary | null;
  /** True when target_weight or target_date is missing on the user profile. */
  missingGoalData: boolean;
};

// ---------------------------------------------------------------------------
// Goal mode
// ---------------------------------------------------------------------------

export function inferGoalMode(startWeightKg: number, targetWeightKg: number): GoalMode {
  return targetWeightKg >= startWeightKg ? 'gain' : 'lose';
}

// ---------------------------------------------------------------------------
// Confidence score
// ---------------------------------------------------------------------------

/**
 * Computes a 0–100 confidence score based on recent logging completeness
 * over the rolling `windowDays` window (default 14 days).
 *
 * Components (each worth 25 points):
 *   - Weight recency: at least one log per 7-day sub-window
 *   - Sleep: daily sleep logs
 *   - Meals confirmed: approximate daily coverage (3 meals/day)
 *   - Workouts confirmed: approximate weekly coverage (3/week)
 */
export function computeConfidenceScore(params: {
  weightHistory: WeightLogEntry[];
  sleepLogCount: number;
  mealConfirmedCount: number;
  workoutConfirmedCount: number;
  now: Date;
  windowDays?: number;
}): number {
  const {
    weightHistory,
    sleepLogCount,
    mealConfirmedCount,
    workoutConfirmedCount,
    now,
    windowDays = 14,
  } = params;

  const today = localDateStr(now);
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - windowDays);
  const cutoffStr = localDateStr(cutoff);

  // Weight: expect at least one log per 7-day sub-window
  const recentWeightEntries = weightHistory.filter(
    (e) => e.date >= cutoffStr && e.date <= today
  ).length;
  const expectedWeightLogs = Math.ceil(windowDays / 7);
  const weightScore = Math.min(1, recentWeightEntries / expectedWeightLogs) * 25;

  // Sleep: roughly daily
  const sleepScore = Math.min(1, sleepLogCount / windowDays) * 25;

  // Meals: ~3 per day
  const mealScore = Math.min(1, mealConfirmedCount / (windowDays * 3)) * 25;

  // Workouts: ~3 per week
  const workoutScore = Math.min(1, workoutConfirmedCount / Math.ceil((windowDays / 7) * 3)) * 25;

  return Math.round(weightScore + sleepScore + mealScore + workoutScore);
}

export function toConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 75) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export function confidenceLevelLabel(level: ConfidenceLevel): string {
  switch (level) {
    case 'high':
      return 'High confidence';
    case 'medium':
      return 'Medium confidence';
    case 'low':
      return 'Low confidence';
  }
}

export function confidenceExplainerText(level: ConfidenceLevel): string {
  switch (level) {
    case 'high':
      return 'Consistent logging of meals, workouts, sleep, and weight.';
    case 'medium':
      return 'Some recent logs are missing — log more consistently for accuracy.';
    case 'low':
      return 'Not enough recent data to assess your trend. Start logging regularly.';
  }
}

// ---------------------------------------------------------------------------
// Goal completion
// ---------------------------------------------------------------------------

export function isGoalComplete(targetDate: string, now: Date): boolean {
  return localDateStr(now) > targetDate;
}

// ---------------------------------------------------------------------------
// Goal archival
// ---------------------------------------------------------------------------

/**
 * Builds an ArchivedGoalSummary from the active local history.
 * `id` should be derived via `goalId()` for stability.
 */
export function buildArchivedGoalSummary(
  id: string,
  goalSnapshot: GoalSnapshot,
  weightHistory: WeightLogEntry[],
  now: Date
): ArchivedGoalSummary {
  const sorted = [...weightHistory].sort((a, b) => a.date.localeCompare(b.date));
  const finalWeight = sorted.length > 0 ? sorted[sorted.length - 1].weightKg : null;

  return {
    id,
    goalSnapshot,
    endDate: goalSnapshot.targetDate,
    finalWeightKg: finalWeight,
    weightChangeKg: finalWeight !== null ? finalWeight - goalSnapshot.startWeightKg : null,
    archivedAt: localDateStr(now),
  };
}

/**
 * Returns a stable ID for a goal derived from its start + target dates.
 * Changing either field constitutes a new goal.
 */
export function goalId(snapshot: GoalSnapshot): string {
  return `${snapshot.startDate}_${snapshot.targetDate}`;
}

/**
 * Returns true when the new backend goal definition differs from the stored
 * snapshot in a way that should start a new goal period.
 */
export function hasGoalChanged(
  stored: GoalSnapshot,
  backendTargetWeight: number,
  backendTargetDate: string
): boolean {
  return (
    Math.abs(stored.targetWeightKg - backendTargetWeight) > 0.01 ||
    stored.targetDate !== backendTargetDate
  );
}

// ---------------------------------------------------------------------------
// Progress label helpers
// ---------------------------------------------------------------------------

export function weightProgressLabel(
  goalMode: GoalMode,
  startKg: number,
  latestKg: number,
  targetKg: number,
  showImperial: boolean
): string {
  const fmt = (kg: number) =>
    showImperial ? `${kgToLbs(kg).toFixed(1)} lbs` : `${kg.toFixed(1)} kg`;

  const totalNeeded = Math.abs(targetKg - startKg);
  const progress = Math.abs(latestKg - startKg);
  const remaining = Math.abs(targetKg - latestKg);

  if (totalNeeded < 0.01) return `At target weight (${fmt(latestKg)})`;

  const pct = Math.min(100, Math.round((progress / totalNeeded) * 100));
  const direction = goalMode === 'lose' ? 'lost' : 'gained';
  return `${pct}% to goal · ${fmt(Math.abs(latestKg - startKg))} ${direction} · ${fmt(remaining)} to go`;
}

// Inline to avoid circular dep — mirrors utils/units.ts
function kgToLbs(kg: number): number {
  return kg / 0.453592;
}

// ---------------------------------------------------------------------------
// Internal date helper (duplicated from storage to keep this module pure)
// ---------------------------------------------------------------------------

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}
