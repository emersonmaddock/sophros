/**
 * useStreak — tracks how many consecutive calendar days the user has opened
 * the app (up to and including today).
 *
 * Persisted in AsyncStorage as { streak, lastDate }.
 *
 * - Increments by 1 when today is exactly one day after the last recorded date.
 * - Resets to 1 when there is a gap (missed day) or when the stored date is in
 *   the future relative to `now` (handles dev time going backwards).
 * - Re-evaluates whenever the current date changes (useNow ticks or override).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNow } from '@/hooks/useNow';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'login_streak';

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Returns the date string for `dateStr` + `n` days (local time). */
function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + n);
  return localDateStr(date);
}

export function useStreak(): number {
  const now = useNow();
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const today = localDateStr(now);

    async function update() {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const stored: { streak: number; lastDate: string } | null = raw ? JSON.parse(raw) : null;

      let newStreak: number;

      if (!stored || stored.lastDate > today) {
        // No previous data, or stored date is in the future (time went backwards) — reset.
        newStreak = 1;
      } else if (stored.lastDate === today) {
        // Already recorded today — no change.
        newStreak = stored.streak;
      } else if (addDays(stored.lastDate, 1) === today) {
        // Yesterday was the last login — extend the streak.
        newStreak = stored.streak + 1;
      } else {
        // There's a gap; streak is broken.
        newStreak = 1;
      }

      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ streak: newStreak, lastDate: today })
      );
      setStreak(newStreak);
    }

    update();
  }, [now.toDateString()]); // eslint-disable-line react-hooks/exhaustive-deps

  return streak;
}
