/**
 * Calculates sleep duration treating sleepTime as "after" wakeTime,
 * handling midnight-crossing correctly.
 *
 * @returns null if times are valid, or a human-readable error string.
 */
export function validateSleepDuration(wakeUpTime: string, sleepTime: string): string | null {
  if (!wakeUpTime || !sleepTime) return null;
  if (wakeUpTime === sleepTime) {
    return 'Wake up time and sleep time cannot be identical.';
  }

  const [wakeH, wakeM] = wakeUpTime.split(':').map(Number);
  const [sleepH, sleepM] = sleepTime.split(':').map(Number);

  // Minutes elapsed from midnight to each time
  const wakeMinutes = wakeH * 60 + wakeM;
  const sleepMinutes = sleepH * 60 + sleepM;

  // Sleep duration = how much time until wake from sleep
  // If sleep is earlier on the clock than wake → crossing midnight
  let durationMinutes = wakeMinutes - sleepMinutes;
  if (durationMinutes <= 0) durationMinutes += 24 * 60;

  const hours = durationMinutes / 60;

  if (hours <= 5) {
    return `That's only ${hours.toFixed(1)} hours of sleep — please schedule more than 5 hours.`;
  }
  if (hours > 10) {
    return `That's ${hours.toFixed(1)} hours of sleep — please keep it to 10 hours or less to leave room for meals.`;
  }

  return null;
}
