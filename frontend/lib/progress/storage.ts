/**
 * progress/storage — local-first persistence for the progress feature.
 *
 * All time-dependent operations accept a `now: Date` parameter rather than
 * calling `new Date()` directly so that dev-time override works correctly.
 *
 * Call `purgeFutureProgressData(now)` whenever `now` changes (including when
 * the dev override moves backward) before reading any progress data. This
 * removes entries that are ahead of the current local date, ensuring
 * time-travel backward re-enables prompts and removes impossible future points.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WeightLogEntry = {
  date: string; // YYYY-MM-DD
  weightKg: number;
  source: 'prompt' | 'manual' | 'baseline';
};

export type BodyFatLogEntry = {
  date: string; // YYYY-MM-DD
  bodyFatPercent: number;
  source: 'manual';
};

export type GoalSnapshot = {
  startWeightKg: number;
  targetWeightKg: number;
  targetBodyFat: number | null;
  targetDate: string; // YYYY-MM-DD
  startDate: string; // YYYY-MM-DD — when this goal period started
};

export type ArchivedGoalSummary = {
  id: string;
  goalSnapshot: GoalSnapshot;
  endDate: string; // YYYY-MM-DD
  finalWeightKg: number | null;
  finalBodyFatPercent: number | null;
  weightChangeKg: number | null;
  archivedAt: string; // YYYY-MM-DD
};

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const KEYS = {
  WEIGHT_LOG: 'progress_weight_log',
  BODY_FAT_LOG: 'progress_body_fat_log',
  GOAL_SNAPSHOT: 'progress_goal_snapshot',
  ARCHIVED_GOALS: 'progress_archived_goals',
  /** The date (YYYY-MM-DD) the user dismissed the weight prompt without logging. */
  WEIGHT_PROMPT_DISMISSED: 'progress_weight_prompt_dismissed_date',
} as const;

// ---------------------------------------------------------------------------
// Date helper (local date, not UTC — consistent with sleep/streak modules)
// ---------------------------------------------------------------------------

export function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ---------------------------------------------------------------------------
// Weight log
// ---------------------------------------------------------------------------

export async function getWeightLog(): Promise<WeightLogEntry[]> {
  const raw = await AsyncStorage.getItem(KEYS.WEIGHT_LOG);
  if (!raw) return [];
  return JSON.parse(raw) as WeightLogEntry[];
}

/**
 * Upserts a weight entry for its date — one entry per local date.
 * If an entry already exists for that date it is replaced.
 */
export async function upsertWeightEntry(entry: WeightLogEntry): Promise<void> {
  const log = await getWeightLog();
  const idx = log.findIndex((e) => e.date === entry.date);
  if (idx >= 0) {
    log[idx] = entry;
  } else {
    log.push(entry);
    log.sort((a, b) => a.date.localeCompare(b.date));
  }
  await AsyncStorage.setItem(KEYS.WEIGHT_LOG, JSON.stringify(log));
}

export async function saveWeightLog(entries: WeightLogEntry[]): Promise<void> {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  await AsyncStorage.setItem(KEYS.WEIGHT_LOG, JSON.stringify(sorted));
}

/** Returns the YYYY-MM-DD of the most recent weight entry, or null. */
export async function getLastWeightLogDate(): Promise<string | null> {
  const log = await getWeightLog();
  if (log.length === 0) return null;
  return log[log.length - 1].date;
}

// ---------------------------------------------------------------------------
// Body fat log
// ---------------------------------------------------------------------------

export async function getBodyFatLog(): Promise<BodyFatLogEntry[]> {
  const raw = await AsyncStorage.getItem(KEYS.BODY_FAT_LOG);
  if (!raw) return [];
  return JSON.parse(raw) as BodyFatLogEntry[];
}

/**
 * Upserts a body-fat entry for its date — one entry per local date.
 */
export async function upsertBodyFatEntry(entry: BodyFatLogEntry): Promise<void> {
  const log = await getBodyFatLog();
  const idx = log.findIndex((e) => e.date === entry.date);
  if (idx >= 0) {
    log[idx] = entry;
  } else {
    log.push(entry);
    log.sort((a, b) => a.date.localeCompare(b.date));
  }
  await AsyncStorage.setItem(KEYS.BODY_FAT_LOG, JSON.stringify(log));
}

// ---------------------------------------------------------------------------
// Goal snapshot
// ---------------------------------------------------------------------------

export async function getGoalSnapshot(): Promise<GoalSnapshot | null> {
  const raw = await AsyncStorage.getItem(KEYS.GOAL_SNAPSHOT);
  if (!raw) return null;
  return JSON.parse(raw) as GoalSnapshot;
}

export async function saveGoalSnapshot(snapshot: GoalSnapshot): Promise<void> {
  await AsyncStorage.setItem(KEYS.GOAL_SNAPSHOT, JSON.stringify(snapshot));
}

export async function clearGoalSnapshot(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.GOAL_SNAPSHOT);
}

// ---------------------------------------------------------------------------
// Archived goals
// ---------------------------------------------------------------------------

export async function getArchivedGoals(): Promise<ArchivedGoalSummary[]> {
  const raw = await AsyncStorage.getItem(KEYS.ARCHIVED_GOALS);
  if (!raw) return [];
  return JSON.parse(raw) as ArchivedGoalSummary[];
}

/**
 * Archives a completed goal summary.
 * Replaces an existing entry with the same id if present, otherwise prepends
 * (most recent first).
 */
export async function archiveGoal(summary: ArchivedGoalSummary): Promise<void> {
  const existing = await getArchivedGoals();
  const filtered = existing.filter((g) => g.id !== summary.id);
  await AsyncStorage.setItem(KEYS.ARCHIVED_GOALS, JSON.stringify([summary, ...filtered]));
}

/** Returns the most recently archived goal, if any. */
export async function getLatestArchivedGoal(): Promise<ArchivedGoalSummary | null> {
  const archived = await getArchivedGoals();
  return archived.length > 0 ? archived[0] : null;
}

// ---------------------------------------------------------------------------
// Weight prompt state
// ---------------------------------------------------------------------------

/**
 * Returns 'urgent' if the last weight log is ≥ 7 days old (or missing),
 * 'optional' otherwise.
 */
export async function getWeightPromptState(now: Date): Promise<'urgent' | 'optional'> {
  const today = localDateStr(now);
  const lastDate = await getLastWeightLogDate();
  if (!lastDate) return 'urgent';

  // Use noon-anchored timestamps to avoid DST drift
  const lastMs = new Date(`${lastDate}T12:00:00`).getTime();
  const todayMs = new Date(`${today}T12:00:00`).getTime();
  const daysDiff = Math.floor((todayMs - lastMs) / (1000 * 60 * 60 * 24));
  return daysDiff >= 7 ? 'urgent' : 'optional';
}

export async function setWeightPromptDismissedToday(now: Date): Promise<void> {
  await AsyncStorage.setItem(KEYS.WEIGHT_PROMPT_DISMISSED, localDateStr(now));
}

export async function isWeightPromptDismissedToday(now: Date): Promise<boolean> {
  const stored = await AsyncStorage.getItem(KEYS.WEIGHT_PROMPT_DISMISSED);
  return stored === localDateStr(now);
}

// ---------------------------------------------------------------------------
// Future-data purge
// ---------------------------------------------------------------------------

/**
 * Removes all progress entries strictly after the current local date.
 * Call this (and await it) before reading any progress data whenever `now`
 * changes — especially when the dev override moves backward in time.
 */
export async function purgeFutureProgressData(now: Date): Promise<void> {
  const today = localDateStr(now);

  // Weight log
  const weightLog = await getWeightLog();
  const prunedWeight = weightLog.filter((e) => e.date <= today);
  if (prunedWeight.length !== weightLog.length) {
    await saveWeightLog(prunedWeight);
  }

  // Body fat log
  const bfLog = await getBodyFatLog();
  const prunedBf = bfLog.filter((e) => e.date <= today);
  if (prunedBf.length !== bfLog.length) {
    await AsyncStorage.setItem(KEYS.BODY_FAT_LOG, JSON.stringify(prunedBf));
  }

  // Weight prompt dismissed date
  const dismissed = await AsyncStorage.getItem(KEYS.WEIGHT_PROMPT_DISMISSED);
  if (dismissed && dismissed > today) {
    await AsyncStorage.removeItem(KEYS.WEIGHT_PROMPT_DISMISSED);
  }

  // Archived goals created in the future
  const archived = await getArchivedGoals();
  const prunedArchived = archived.filter((g) => g.archivedAt <= today);
  if (prunedArchived.length !== archived.length) {
    await AsyncStorage.setItem(KEYS.ARCHIVED_GOALS, JSON.stringify(prunedArchived));
  }
}
