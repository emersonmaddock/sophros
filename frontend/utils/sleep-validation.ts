export const MIN_SLEEP_HOURS = 5;
export const MAX_SLEEP_HOURS = 10;
export const MIN_SLEEP_MINUTES = MIN_SLEEP_HOURS * 60;
export const MAX_SLEEP_MINUTES = MAX_SLEEP_HOURS * 60;

/**
 * Parses time string (HH:MM or HH:MM:SS) to minutes from midnight.
 */
export function timeToMins(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Calculates sleep duration in minutes, handling midnight crossing.
 */
export function getSleepDuration(wakeUpTime: string, sleepTime: string): number {
  const wakeMins = timeToMins(wakeUpTime);
  const sleepMins = timeToMins(sleepTime);

  if (wakeMins === sleepMins) return 0;

  // If wakeMins <= sleepMins, we assume wake is on the NEXT day
  // (e.g. sleep 23:00, wake 07:00 -> 420 + 1440 - 1380 = 480 mins)
  let duration = wakeMins - sleepMins;
  if (duration <= 0) {
    duration += 1440;
  }
  return duration;
}

/**
 * Returns a human readable error if sleep duration is invalid.
 */
export function getSleepWarning(wakeUpTime: string, sleepTime: string): string | null {
  if (!wakeUpTime || !sleepTime) return null;
  const duration = getSleepDuration(wakeUpTime, sleepTime);
  const hours = (duration / 60).toFixed(1);

  if (duration === 0) {
    return 'Wake up time and sleep time cannot be identical.';
  }

  if (duration < MIN_SLEEP_MINUTES) {
    return `That's only ${hours} hours of sleep — we recommend at least ${MIN_SLEEP_HOURS} hours for health.`;
  }

  if (duration > MAX_SLEEP_MINUTES) {
    return `Sleep duration is ${hours} hours — please keep it under ${MAX_SLEEP_HOURS} hours to leave room for nutrition and exercise.`;
  }

  return null;
}
