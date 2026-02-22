export type LogEntryType = 'meal' | 'exercise' | 'sleep';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type ExerciseType = 'cardio' | 'strength' | 'yoga' | 'walk' | 'other';

export interface MealLogEntry {
  id: string;
  type: 'meal';
  mealType: MealType;
  name: string;
  calories: number;
  notes?: string;
  loggedAt: Date;
}

export interface ExerciseLogEntry {
  id: string;
  type: 'exercise';
  exerciseType: ExerciseType;
  name: string;
  durationMinutes: number;
  notes?: string;
  loggedAt: Date;
}

export interface SleepLogEntry {
  id: string;
  type: 'sleep';
  bedtime: string;
  wakeTime: string;
  quality: number; // 1-5
  notes?: string;
  loggedAt: Date;
}

export type LogEntry = MealLogEntry | ExerciseLogEntry | SleepLogEntry;
