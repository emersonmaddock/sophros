import type { ExerciseCategory } from '@/api/types.gen';

export type ItemType = 'meal' | 'workout' | 'sleep';

export type WeeklyScheduleItem = {
  id: string;
  time: string;
  title: string;
  subtitle?: string;
  duration: string;
  type: ItemType;
  status?: 'completed' | 'current' | 'upcoming';
  workoutType?: string;
  exerciseCategory?: ExerciseCategory | null;
  targetHours?: number;
  alternatives?: WeeklyScheduleItem[];
  recipe?: Record<string, unknown>;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
};

export type DaySchedule = {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  date: Date;
  items: WeeklyScheduleItem[];
};

export type WeekPlan = {
  weekStart: Date;
  days: DaySchedule[];
};

export type UserPreferences = {
  wakeUpTime: string;
  sleepTime: string;
  mealsPerDay: number;
  workoutsPerWeek: number;
  calorieTarget: number;
  dietaryRestrictions: string[];
  preferredWorkoutTypes: string[];
};
