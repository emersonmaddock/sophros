export type ItemType = 'meal' | 'workout' | 'sleep';

export type WeeklyScheduleItem = {
  id: string;
  time: string;
  title: string;
  subtitle?: string;
  duration: string;
  type: ItemType;
  calories?: number;
  workoutType?: string;
  targetHours?: number;
  alternatives?: WeeklyScheduleItem[];
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
