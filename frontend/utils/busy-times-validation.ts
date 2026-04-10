import { timeToMins } from './sleep-validation';

/**
 * Calculates meal windows relative to wake time.
 * Returns [start_mins, end_mins] for each meal
 */
function getMealWindows(wakeUpTime: string, sleepTime: string): Record<string, [number, number]> {
  const wakeMins = timeToMins(wakeUpTime);
  const sleepMins = timeToMins(sleepTime);

  // Define meal windows relative to wake time (in minutes)
  return {
    Breakfast: [
      wakeMins + Math.round(0.5 * 60), // wake + 30 min
      wakeMins + Math.round(2 * 60), // wake + 2 hours
    ],
    Lunch: [
      wakeMins + Math.round(4.5 * 60), // wake + 4.5 hours
      wakeMins + Math.round(7.5 * 60), // wake + 7.5 hours
    ],
    Dinner: [
      wakeMins + Math.round(9.5 * 60), // wake + 9.5 hours
      Math.min(
        wakeMins + Math.round(13 * 60), // wake + 13 hours
        sleepMins - Math.round(3 * 60) // sleep - 3 hours
      ),
    ],
  };
}

/**
 * Checks if a meal window has at least one available 30-min slot
 * not blocked by busy times.
 */
function isMealWindowAvailable(
  windowStart: number,
  windowEnd: number,
  busyIntervals: Array<[number, number]>
): boolean {
  const duration = 30;
  let currentTime = windowStart;

  while (currentTime + duration <= windowEnd) {
    let conflict = false;
    const slotEnd = currentTime + duration;

    for (const [bStart, bEnd] of busyIntervals) {
      // Check for overlap
      if (currentTime < bEnd && slotEnd > bStart) {
        conflict = true;
        currentTime = Math.max(currentTime, bEnd);
        break;
      }
    }

    if (!conflict) {
      return true; // Found a free slot
    }

    if (currentTime === windowStart) {
      currentTime += 15; // Increment by 15 if no progress
    }
  }

  return false;
}

/**
 * Validates busy times against meal scheduling windows.
 * Returns list of meals that cannot be scheduled, or null if all OK.
 */
export function validateBusyTimes(
  wakeUpTime: string | undefined,
  sleepTime: string | undefined,
  busyTimes: Array<{ start: string; end: string }> | undefined
): string | null {
  if (!wakeUpTime || !sleepTime || !busyTimes || busyTimes.length === 0) {
    return null; // Can't validate without complete data
  }

  const mealWindows = getMealWindows(wakeUpTime, sleepTime);
  const conflictingMeals: string[] = [];

  // Convert busy times to minutes for all days (since we check each meal across all days)
  const busyIntervals: Array<[number, number]> = busyTimes.map((bt) => [
    timeToMins(bt.start),
    timeToMins(bt.end),
  ]);
  busyIntervals.sort((a, b) => a[0] - b[0]);

  // Check each meal type
  for (const [mealName, [windowStart, windowEnd]] of Object.entries(mealWindows)) {
    if (!isMealWindowAvailable(windowStart, windowEnd, busyIntervals)) {
      conflictingMeals.push(mealName);
    }
  }

  if (conflictingMeals.length > 0) {
    return `Busy times conflict with: ${conflictingMeals.join(', ')}. Please adjust your schedule.`;
  }

  return null;
}

/**
 * Returns a human-readable warning if busy times prevent meal scheduling.
 * Mirrors the getSleepWarning API.
 */
export function getBusyTimesWarning(
  wakeUpTime: string | undefined,
  sleepTime: string | undefined,
  busyTimes: Array<{ start: string; end: string }> | undefined
): string | null {
  return validateBusyTimes(wakeUpTime, sleepTime, busyTimes);
}
