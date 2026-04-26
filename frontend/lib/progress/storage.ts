/**
 * progress/storage — API-backed persistence for the progress feature.
 *
 * Weight log, body fat log, goal snapshot, and archived goals are stored in
 * the database via /api/v1/users/me/progress/* endpoints.
 *
 * The weight-prompt-dismissed state is a pure UI concern (did the user
 * dismiss today's weight prompt?) and remains in AsyncStorage.
 *
 * `purgeFutureProgressData` is now a no-op for the API-backed data since the
 * backend returns the full log and the caller filters by date as needed.
 * The dismissed-date check still purges the local AsyncStorage value.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { client } from '@/api/client.gen';
import type { WeightLogEntryRead, BodyFatLogEntryRead, ArchivedGoalRead } from '@/types/progress';

// Raw client calls don't go through sdk.gen.ts so they don't pick up the
// security option automatically. We must pass it explicitly so hey-api calls
// setAuthParams and adds the Authorization header.
const BEARER: { security: { scheme: 'bearer'; type: 'http' }[] } = {
  security: [{ scheme: 'bearer', type: 'http' }],
};

// ---------------------------------------------------------------------------
// Types (re-exported so callers don't change their imports)
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
  startDate: string; // YYYY-MM-DD
};

export type ArchivedGoalSummary = {
  id: string;
  goalSnapshot: GoalSnapshot;
  endDate: string;
  finalWeightKg: number | null;
  finalBodyFatPercent: number | null;
  weightChangeKg: number | null;
  archivedAt: string;
};

// ---------------------------------------------------------------------------
// Internal converters between API shape and local shape
// ---------------------------------------------------------------------------

function toLocalWeight(r: WeightLogEntryRead): WeightLogEntry {
  return { date: r.date, weightKg: r.weight_kg, source: r.source as WeightLogEntry['source'] };
}

function toLocalBodyFat(r: BodyFatLogEntryRead): BodyFatLogEntry {
  return { date: r.date, bodyFatPercent: r.body_fat_percent, source: 'manual' };
}

function toLocalArchivedGoal(r: ArchivedGoalRead): ArchivedGoalSummary {
  return {
    id: r.id,
    goalSnapshot: {
      startWeightKg: r.start_weight_kg,
      targetWeightKg: r.target_weight_kg,
      targetBodyFat: r.target_body_fat ?? null,
      targetDate: r.target_date,
      startDate: r.start_date,
    },
    endDate: r.end_date,
    finalWeightKg: r.final_weight_kg ?? null,
    finalBodyFatPercent: r.final_body_fat_percent ?? null,
    weightChangeKg: r.weight_change_kg ?? null,
    archivedAt: r.archived_at,
  };
}

function toApiArchivedGoal(s: ArchivedGoalSummary): ArchivedGoalRead {
  return {
    id: s.id,
    start_date: s.goalSnapshot.startDate,
    target_date: s.goalSnapshot.targetDate,
    start_weight_kg: s.goalSnapshot.startWeightKg,
    target_weight_kg: s.goalSnapshot.targetWeightKg,
    target_body_fat: s.goalSnapshot.targetBodyFat,
    end_date: s.endDate,
    final_weight_kg: s.finalWeightKg,
    final_body_fat_percent: s.finalBodyFatPercent,
    weight_change_kg: s.weightChangeKg,
    archived_at: s.archivedAt,
  };
}

// ---------------------------------------------------------------------------
// Date helper
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
  const res = await client.get({ url: '/api/v1/users/me/progress/weight-log', ...BEARER });
  if (res.error) return [];
  return ((res.data as WeightLogEntryRead[]) ?? []).map(toLocalWeight);
}

export async function upsertWeightEntry(entry: WeightLogEntry): Promise<boolean> {
  const res = await client.post({
    url: '/api/v1/users/me/progress/weight-log',
    body: { date: entry.date, weight_kg: entry.weightKg, source: entry.source },
    ...BEARER,
  });
  return !res.error;
}

export async function saveWeightLog(entries: WeightLogEntry[]): Promise<void> {
  // Bulk-upsert: called when purging future entries. Send each entry.
  await Promise.all(entries.map(upsertWeightEntry));
}

export async function getLastWeightLogDate(): Promise<string | null> {
  const log = await getWeightLog();
  if (log.length === 0) return null;
  return log[log.length - 1].date;
}

// ---------------------------------------------------------------------------
// Body fat log
// ---------------------------------------------------------------------------

export async function getBodyFatLog(): Promise<BodyFatLogEntry[]> {
  const res = await client.get({ url: '/api/v1/users/me/progress/body-fat-log', ...BEARER });
  if (res.error) return [];
  return ((res.data as BodyFatLogEntryRead[]) ?? []).map(toLocalBodyFat);
}

export async function upsertBodyFatEntry(entry: BodyFatLogEntry): Promise<void> {
  await client.post({
    url: '/api/v1/users/me/progress/body-fat-log',
    body: { date: entry.date, body_fat_percent: entry.bodyFatPercent, source: 'manual' },
    ...BEARER,
  });
}

// ---------------------------------------------------------------------------
// Goal snapshot — stored on the User record via PATCH /users/me
// ---------------------------------------------------------------------------

/**
 * goalSnapshot is now derived from the User record's goal_start_date and
 * goal_start_weight_kg fields (plus target_* fields).
 * The caller (useProgressData) passes the user object in directly, so these
 * functions are no-ops / thin adapters to keep the hook's logic unchanged.
 */
export async function getGoalSnapshot(): Promise<GoalSnapshot | null> {
  // Now sourced from user.goal_start_date / goal_start_weight_kg in useProgressData
  return null;
}

export async function saveGoalSnapshot(snapshot: GoalSnapshot): Promise<void> {
  await client.put({
    url: '/api/v1/users/me',
    body: {
      goal_start_date: snapshot.startDate,
      goal_start_weight_kg: snapshot.startWeightKg,
    },
    ...BEARER,
  });
}

export async function clearGoalSnapshot(): Promise<void> {
  await client.put({
    url: '/api/v1/users/me',
    body: { goal_start_date: null, goal_start_weight_kg: null },
    ...BEARER,
  });
}

// ---------------------------------------------------------------------------
// Archived goals
// ---------------------------------------------------------------------------

export async function getArchivedGoals(): Promise<ArchivedGoalSummary[]> {
  const res = await client.get({ url: '/api/v1/users/me/progress/archived-goals', ...BEARER });
  if (res.error) return [];
  return ((res.data as ArchivedGoalRead[]) ?? []).map(toLocalArchivedGoal);
}

export async function archiveGoal(summary: ArchivedGoalSummary): Promise<void> {
  await client.post({
    url: '/api/v1/users/me/progress/archived-goals',
    body: toApiArchivedGoal(summary),
    ...BEARER,
  });
}

export async function getLatestArchivedGoal(): Promise<ArchivedGoalSummary | null> {
  const goals = await getArchivedGoals();
  return goals.length > 0 ? goals[0] : null;
}

// ---------------------------------------------------------------------------
// Weight prompt dismissed state — stays in AsyncStorage (UI-only)
// ---------------------------------------------------------------------------

const WEIGHT_PROMPT_DISMISSED_KEY = 'progress_weight_prompt_dismissed_date';
const GOAL_TARGET_KEY = 'progress_goal_target';

export async function getWeightPromptState(now: Date): Promise<'urgent' | 'optional'> {
  const today = localDateStr(now);
  const lastDate = await getLastWeightLogDate();
  if (!lastDate) return 'urgent';
  const lastMs = new Date(`${lastDate}T12:00:00`).getTime();
  const todayMs = new Date(`${today}T12:00:00`).getTime();
  const daysDiff = Math.floor((todayMs - lastMs) / (1000 * 60 * 60 * 24));
  return daysDiff >= 7 ? 'urgent' : 'optional';
}

export async function setWeightPromptDismissedToday(now: Date): Promise<void> {
  await AsyncStorage.setItem(WEIGHT_PROMPT_DISMISSED_KEY, localDateStr(now));
}

// ---------------------------------------------------------------------------
// Goal target — tracks the target at the time the current goal period started.
// Used to detect when the user has changed their goal, since the user record
// only stores the *current* target_date / target_weight (not the per-period one).
// ---------------------------------------------------------------------------

type StoredGoalTarget = { targetDate: string; targetWeightKg: number };

export async function getStoredGoalTarget(): Promise<StoredGoalTarget | null> {
  const raw = await AsyncStorage.getItem(GOAL_TARGET_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredGoalTarget;
  } catch {
    return null;
  }
}

export async function setStoredGoalTarget(targetDate: string, targetWeightKg: number): Promise<void> {
  await AsyncStorage.setItem(GOAL_TARGET_KEY, JSON.stringify({ targetDate, targetWeightKg }));
}

export async function isWeightPromptDismissedToday(now: Date): Promise<boolean> {
  const stored = await AsyncStorage.getItem(WEIGHT_PROMPT_DISMISSED_KEY);
  return stored === localDateStr(now);
}

// ---------------------------------------------------------------------------
// Future-data purge — delete entries with date > today from the server
// ---------------------------------------------------------------------------

/**
 * Purge future-dated log entries.  Accepts already-fetched log data so the
 * caller can avoid a redundant network round-trip when it has the data in hand.
 * If prefetched data is not provided the function fetches it itself (legacy path).
 */
export async function purgeFutureProgressData(
  now: Date,
  prefetched?: { weightLog: WeightLogEntry[]; bfLog: BodyFatLogEntry[] }
): Promise<void> {
  const today = localDateStr(now);

  const weightLog = prefetched?.weightLog ?? (await getWeightLog());
  const bfLog = prefetched?.bfLog ?? (await getBodyFatLog());

  await Promise.all([
    ...weightLog
      .filter((e) => e.date > today)
      .map((e) => client.delete({ url: `/api/v1/users/me/progress/weight-log/${e.date}`, ...BEARER })),
    ...bfLog
      .filter((e) => e.date > today)
      .map((e) =>
        client.delete({ url: `/api/v1/users/me/progress/body-fat-log/${e.date}`, ...BEARER })
      ),
  ]);

  // Dismissed date (AsyncStorage — unrelated to the API logs)
  const dismissed = await AsyncStorage.getItem(WEIGHT_PROMPT_DISMISSED_KEY);
  if (dismissed && dismissed > today) {
    await AsyncStorage.removeItem(WEIGHT_PROMPT_DISMISSED_KEY);
  }
}
