import type { DaySchedule, UserPreferences, WeekPlan, WeeklyScheduleItem } from '@/types/schedule';

// Mock data pools
const MEAL_OPTIONS = [
  {
    title: 'Greek Yogurt Bowl',
    calories: 380,
    description: 'with berries and granola',
  },
  {
    title: 'Avocado Toast',
    calories: 420,
    description: 'with poached eggs',
  },
  {
    title: 'Protein Smoothie',
    calories: 340,
    description: 'banana, spinach, protein powder',
  },
  {
    title: 'Oatmeal',
    calories: 310,
    description: 'with nuts and honey',
  },
  {
    title: 'Grilled Chicken Salad',
    calories: 520,
    description: 'with mixed greens',
  },
  {
    title: 'Salmon Bowl',
    calories: 580,
    description: 'with quinoa and vegetables',
  },
  {
    title: 'Turkey Wrap',
    calories: 460,
    description: 'whole wheat with veggies',
  },
  {
    title: 'Buddha Bowl',
    calories: 490,
    description: 'chickpeas, sweet potato, tahini',
  },
  {
    title: 'Grilled Salmon',
    calories: 640,
    description: 'with roasted vegetables',
  },
  {
    title: 'Chicken Stir Fry',
    calories: 610,
    description: 'with brown rice',
  },
  {
    title: 'Veggie Pasta',
    calories: 560,
    description: 'whole wheat with marinara',
  },
  {
    title: 'Lean Beef Tacos',
    calories: 590,
    description: 'with black beans',
  },
  {
    title: 'Protein Bar',
    calories: 180,
    description: 'chocolate peanut butter',
  },
  {
    title: 'Apple with Almond Butter',
    calories: 200,
    description: '2 tbsp almond butter',
  },
  {
    title: 'Trail Mix',
    calories: 220,
    description: 'nuts and dried fruit',
  },
  {
    title: 'Cottage Cheese',
    calories: 160,
    description: 'with pineapple',
  },
];

const WORKOUT_OPTIONS = [
  { type: 'HIIT Training', duration: '45 min' },
  { type: 'Strength Training', duration: '60 min' },
  { type: 'Yoga', duration: '50 min' },
  { type: 'Running', duration: '40 min' },
  { type: 'Swimming', duration: '45 min' },
  { type: 'Cycling', duration: '50 min' },
  { type: 'Pilates', duration: '45 min' },
  { type: 'CrossFit', duration: '60 min' },
  { type: 'Boxing', duration: '50 min' },
  { type: 'Dance Cardio', duration: '45 min' },
];

const LIGHT_ACTIVITY_OPTIONS = [
  { type: 'Morning Stretch', duration: '15 min' },
  { type: 'Evening Walk', duration: '30 min' },
  { type: 'Mobility Work', duration: '20 min' },
  { type: 'Light Yoga', duration: '25 min' },
];

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateMeal(
  time: string,
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  calorieRange: [number, number]
): WeeklyScheduleItem {
  const filteredMeals = MEAL_OPTIONS.filter(
    (m) => m.calories >= calorieRange[0] && m.calories <= calorieRange[1]
  );
  const meal = filteredMeals[Math.floor(Math.random() * filteredMeals.length)];

  const alternatives = getRandomItems(
    filteredMeals.filter((m) => m.title !== meal.title),
    3
  ).map((alt) => ({
    id: generateId(),
    time,
    title: alt.title,
    subtitle: `${alt.description} (${alt.calories} cal)`,
    duration: type === 'snack' ? '10 min' : type === 'breakfast' ? '20 min' : '30 min',
    type: 'meal' as const,
    calories: alt.calories,
  }));

  return {
    id: generateId(),
    time,
    title: meal.title,
    subtitle: `${meal.description} (${meal.calories} cal)`,
    duration: type === 'snack' ? '10 min' : type === 'breakfast' ? '20 min' : '30 min',
    type: 'meal',
    calories: meal.calories,
    alternatives,
  };
}

function generateWorkout(time: string, intense: boolean = true): WeeklyScheduleItem {
  const options = intense ? WORKOUT_OPTIONS : LIGHT_ACTIVITY_OPTIONS;
  const workout = options[Math.floor(Math.random() * options.length)];

  const alternatives = getRandomItems(
    options.filter((w) => w.type !== workout.type),
    3
  ).map((alt) => ({
    id: generateId(),
    time,
    title: alt.type,
    duration: alt.duration,
    type: 'workout' as const,
    workoutType: alt.type,
  }));

  return {
    id: generateId(),
    time,
    title: workout.type,
    duration: workout.duration,
    type: 'workout',
    workoutType: workout.type,
    alternatives,
  };
}

function generateSleep(time: string, targetHours: number = 8): WeeklyScheduleItem {
  const alternatives = [7, 7.5, 8, 8.5, 9]
    .filter((h) => h !== targetHours)
    .map((hours) => ({
      id: generateId(),
      time,
      title: 'Sleep',
      subtitle: `Target: ${hours} hours`,
      duration: `${hours} hrs`,
      type: 'sleep' as const,
      targetHours: hours,
    }));

  return {
    id: generateId(),
    time,
    title: 'Sleep',
    subtitle: `Target: ${targetHours} hours`,
    duration: `${targetHours} hrs`,
    type: 'sleep',
    targetHours,
    alternatives: alternatives.slice(0, 3),
  };
}

export function generateDaySchedule(
  date: Date,
  preferences: UserPreferences,
  isWorkoutDay: boolean
): DaySchedule {
  const items: WeeklyScheduleItem[] = [];

  // Morning routine
  items.push(generateWorkout('7:00 AM', false)); // Light morning activity

  // Breakfast
  items.push(generateMeal('7:30 AM', 'breakfast', [300, 450]));

  // Morning workout (if workout day)
  if (isWorkoutDay) {
    items.push(generateWorkout('9:00 AM', true));
  }

  // Lunch
  items.push(generateMeal('12:30 PM', 'lunch', [450, 600]));

  // Afternoon snack
  if (preferences.mealsPerDay >= 4) {
    items.push(generateMeal('3:00 PM', 'snack', [150, 250]));
  }

  // Evening activity (if not workout day, add light activity)
  if (!isWorkoutDay) {
    items.push(generateWorkout('6:00 PM', false));
  }

  // Dinner
  items.push(generateMeal('7:00 PM', 'dinner', [550, 700]));

  // Sleep
  items.push(generateSleep(preferences.sleepTime, 8));

  return {
    dayOfWeek: date.getDay(),
    date,
    items: items.sort((a, b) => {
      const timeA = a.time.includes('AM')
        ? parseInt(a.time) + (a.time.includes('12:') ? 0 : 0)
        : parseInt(a.time) + (a.time.includes('12:') ? 12 : 12);
      const timeB = b.time.includes('AM')
        ? parseInt(b.time) + (b.time.includes('12:') ? 0 : 0)
        : parseInt(b.time) + (b.time.includes('12:') ? 12 : 12);
      return timeA - timeB;
    }),
  };
}

export function generateWeekPlan(preferences: UserPreferences): WeekPlan {
  const today = new Date();
  const nextWeekStart = new Date(today);
  nextWeekStart.setDate(today.getDate() + (7 - today.getDay())); // Next Sunday

  const days: DaySchedule[] = [];

  // Distribute workouts throughout the week
  const workoutDays = [1, 3, 5]; // Monday, Wednesday, Friday by default
  const actualWorkoutDays = workoutDays.slice(0, preferences.workoutsPerWeek);

  for (let i = 0; i < 7; i++) {
    const date = new Date(nextWeekStart);
    date.setDate(nextWeekStart.getDate() + i);

    const isWorkoutDay = actualWorkoutDays.includes(i);
    days.push(generateDaySchedule(date, preferences, isWorkoutDay));
  }

  return {
    weekStart: nextWeekStart,
    days,
  };
}

export function generateAlternatives(item: WeeklyScheduleItem): WeeklyScheduleItem[] {
  if (item.alternatives && item.alternatives.length > 0) {
    return item.alternatives;
  }

  // Generate new alternatives if none exist
  const alternatives: WeeklyScheduleItem[] = [];

  if (item.type === 'meal') {
    const calorieRange: [number, number] = item.calories
      ? [item.calories - 100, item.calories + 100]
      : [300, 600];
    for (let i = 0; i < 3; i++) {
      alternatives.push(
        generateMeal(item.time, 'lunch', calorieRange) // Type doesn't matter for alternatives
      );
    }
  } else if (item.type === 'workout') {
    for (let i = 0; i < 3; i++) {
      alternatives.push(generateWorkout(item.time, true));
    }
  } else if (item.type === 'sleep') {
    const targetHours = item.targetHours || 8;
    [7, 7.5, 8.5, 9]
      .filter((h) => h !== targetHours)
      .slice(0, 3)
      .forEach((hours) => {
        alternatives.push(generateSleep(item.time, hours));
      });
  }

  return alternatives;
}
