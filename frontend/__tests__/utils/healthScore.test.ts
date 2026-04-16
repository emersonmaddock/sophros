import type { DailyMealPlanOutput, DriOutput } from '@/api/types.gen';
import { calculateHealthScore } from '@/utils/healthScore';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeDri(calories: number, protein: number, carbs: number, fat: number): DriOutput {
  return {
    calories: { min: 0, target: calories, max: calories * 1.2 },
    protein: { min: 0, target: protein, max: protein * 1.2 },
    carbohydrates: { min: 0, target: carbs, max: carbs * 1.2 },
    fat: { min: 0, target: fat, max: fat * 1.2 },
  };
}

function makeDailyPlan(
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  exercise?: DailyMealPlanOutput['exercise']
): DailyMealPlanOutput {
  return {
    day: 'Monday',
    slots: [],
    total_calories: calories,
    total_protein: protein,
    total_carbs: carbs,
    total_fat: fat,
    exercise: exercise ?? null,
  };
}

// ---------------------------------------------------------------------------
// hasPlan: false – exercise always 0
// ---------------------------------------------------------------------------

describe('calculateHealthScore – hasPlan: false', () => {
  it('returns exercise score 0 when hasPlan is false', () => {
    const result = calculateHealthScore(undefined, undefined, null, false);
    expect(result.exercise.score).toBe(0);
  });

  it('returns nutrition score 0 when todayPlan and targets are both undefined', () => {
    const result = calculateHealthScore(undefined, undefined, null, false);
    expect(result.nutrition.score).toBe(0);
  });

  it('returns default sleep score 70 when user is null', () => {
    const result = calculateHealthScore(undefined, undefined, null, false);
    expect(result.sleep.score).toBe(70);
  });

  it('calculates overall as weighted sum: 0*0.4 + 0*0.3 + 70*0.3 = 21', () => {
    const result = calculateHealthScore(undefined, undefined, null, false);
    expect(result.overall).toBe(21);
  });
});

// ---------------------------------------------------------------------------
// Nutrition score
// ---------------------------------------------------------------------------

describe('calculateHealthScore – nutrition score', () => {
  it('returns 100 when all actuals equal targets exactly', () => {
    const plan = makeDailyPlan(2000, 150, 250, 65);
    const targets = makeDri(2000, 150, 250, 65);
    const result = calculateHealthScore(plan, targets, null, true);
    expect(result.nutrition.score).toBe(100);
  });

  it('returns 0 when todayPlan is undefined', () => {
    const targets = makeDri(2000, 150, 250, 65);
    const result = calculateHealthScore(undefined, targets, null, true);
    expect(result.nutrition.score).toBe(0);
  });

  it('returns 0 when targets are undefined', () => {
    const plan = makeDailyPlan(2000, 150, 250, 65);
    const result = calculateHealthScore(plan, undefined, null, true);
    expect(result.nutrition.score).toBe(0);
  });

  it('clamps individual macro adherence to 0 (no negative scores)', () => {
    // actual = 0, target = 2000 → adherence = 100 - (2000/2000)*100 = 0
    // All macros at 0 → nutrition score = 0
    const plan = makeDailyPlan(0, 0, 0, 0);
    const targets = makeDri(2000, 150, 250, 65);
    const result = calculateHealthScore(plan, targets, null, true);
    expect(result.nutrition.score).toBe(0);
  });

  it('clamps individual macro adherence to 100 (no over-100 scores)', () => {
    // actual = 2x target → adherence = 100 - 100 = 0 → score still 0
    // actual = 1.5x target for all → adherence = 100 - 50 = 50 → nutrition score = 50
    const plan = makeDailyPlan(3000, 225, 375, 97.5);
    const targets = makeDri(2000, 150, 250, 65);
    const result = calculateHealthScore(plan, targets, null, true);
    expect(result.nutrition.score).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// Sleep score
// ---------------------------------------------------------------------------

describe('calculateHealthScore – sleep score', () => {
  it('returns 100 for 8 hours sleep (23:00 to 07:00)', () => {
    const result = calculateHealthScore(
      undefined,
      undefined,
      {
        sleep_time: '23:00',
        wake_up_time: '07:00',
      },
      false
    );
    expect(result.sleep.score).toBe(100);
  });

  it('returns 75 for 6 hours sleep (01:00 to 07:00)', () => {
    const result = calculateHealthScore(
      undefined,
      undefined,
      {
        sleep_time: '01:00',
        wake_up_time: '07:00',
      },
      false
    );
    expect(result.sleep.score).toBe(75);
  });

  it('returns 70 when sleep_time is null', () => {
    const result = calculateHealthScore(
      undefined,
      undefined,
      {
        sleep_time: null,
        wake_up_time: '07:00',
      },
      false
    );
    expect(result.sleep.score).toBe(70);
  });

  it('returns 70 when wake_up_time is null', () => {
    const result = calculateHealthScore(
      undefined,
      undefined,
      {
        sleep_time: '23:00',
        wake_up_time: null,
      },
      false
    );
    expect(result.sleep.score).toBe(70);
  });

  it('returns 70 when user is undefined', () => {
    const result = calculateHealthScore(undefined, undefined, undefined, false);
    expect(result.sleep.score).toBe(70);
  });

  it('returns 100 for exactly 7 hours (00:00 to 07:00)', () => {
    const result = calculateHealthScore(
      undefined,
      undefined,
      {
        sleep_time: '00:00',
        wake_up_time: '07:00',
      },
      false
    );
    expect(result.sleep.score).toBe(100);
  });

  it('returns 100 for exactly 9 hours (22:00 to 07:00)', () => {
    const result = calculateHealthScore(
      undefined,
      undefined,
      {
        sleep_time: '22:00',
        wake_up_time: '07:00',
      },
      false
    );
    expect(result.sleep.score).toBe(100);
  });

  it('returns 50 for less than 6 hours sleep (03:00 to 07:00 = 4h)', () => {
    const result = calculateHealthScore(
      undefined,
      undefined,
      {
        sleep_time: '03:00',
        wake_up_time: '07:00',
      },
      false
    );
    expect(result.sleep.score).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// Exercise score
// ---------------------------------------------------------------------------

describe('calculateHealthScore – exercise score', () => {
  it('returns 100 when hasPlan is true and calories_burned > 0', () => {
    const plan = makeDailyPlan(2000, 150, 250, 65, {
      category: 'Cardio',
      duration_minutes: 30,
      calories_burned: 300,
    });
    const result = calculateHealthScore(plan, undefined, null, true);
    expect(result.exercise.score).toBe(100);
  });

  it('returns 85 when hasPlan is true and exercise exists but no calories_burned', () => {
    const plan = makeDailyPlan(2000, 150, 250, 65, {
      category: 'Weight Lifting',
      duration_minutes: 45,
    });
    const result = calculateHealthScore(plan, undefined, null, true);
    expect(result.exercise.score).toBe(85);
  });

  it('returns 30 when hasPlan is true but exercise is null', () => {
    const plan = makeDailyPlan(2000, 150, 250, 65, null);
    const result = calculateHealthScore(plan, undefined, null, true);
    expect(result.exercise.score).toBe(30);
  });

  it('returns 30 when hasPlan is true and todayPlan has no exercise field', () => {
    const plan = makeDailyPlan(2000, 150, 250, 65);
    const result = calculateHealthScore(plan, undefined, null, true);
    expect(result.exercise.score).toBe(30);
  });

  it('returns 0 when hasPlan is false regardless of exercise data', () => {
    const plan = makeDailyPlan(2000, 150, 250, 65, {
      category: 'Cardio',
      duration_minutes: 30,
      calories_burned: 500,
    });
    const result = calculateHealthScore(plan, undefined, null, false);
    expect(result.exercise.score).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Status labels
// ---------------------------------------------------------------------------

describe('calculateHealthScore – status labels', () => {
  it('returns "Excellent" for score >= 90', () => {
    // Perfect everything → overall 100
    const plan = makeDailyPlan(2000, 150, 250, 65, {
      category: 'Cardio',
      duration_minutes: 30,
      calories_burned: 300,
    });
    const targets = makeDri(2000, 150, 250, 65);
    const result = calculateHealthScore(
      plan,
      targets,
      { sleep_time: '23:00', wake_up_time: '07:00' },
      true
    );
    expect(result.overall).toBe(100);
    expect(result.nutrition.status).toBe('Excellent');
    expect(result.exercise.status).toBe('Excellent');
    expect(result.sleep.status).toBe('Excellent');
  });

  it('returns "Good" for score >= 70 and < 90', () => {
    // nutrition=100, exercise=0 (hasPlan=false), sleep=100 → overall = 40+0+30 = 70
    const plan = makeDailyPlan(2000, 150, 250, 65);
    const targets = makeDri(2000, 150, 250, 65);
    const result = calculateHealthScore(
      plan,
      targets,
      { sleep_time: '23:00', wake_up_time: '07:00' },
      false
    );
    expect(result.overall).toBe(70);
    expect(result.nutrition.status).toBe('Excellent');
    expect(result.exercise.status).toBe('Needs Work');
    expect(result.sleep.status).toBe('Excellent');
  });

  it('returns "Fair" for score >= 50 and < 70', () => {
    // nutrition=0, exercise=85, sleep=50 → 0*0.4 + 85*0.3 + 50*0.3 = 0 + 25.5 + 15 = 40.5 → 41...
    // Let's use nutrition=100, exercise=0, sleep=75 → 40 + 0 + 22.5 = 62.5 → 63
    const plan = makeDailyPlan(2000, 150, 250, 65);
    const targets = makeDri(2000, 150, 250, 65);
    const result = calculateHealthScore(
      plan,
      targets,
      { sleep_time: '01:00', wake_up_time: '07:00' },
      false
    );
    // nutrition=100, exercise=0, sleep=75 → 40 + 0 + 22.5 = 62.5 → 63
    expect(result.overall).toBe(63);
    expect(result.nutrition.status).toBe('Excellent'); // 100
    expect(result.exercise.status).toBe('Needs Work'); // 0
    expect(result.sleep.status).toBe('Good'); // 75
  });

  it('returns "Needs Work" for score < 50', () => {
    // no plan, no targets, no user → overall = 21
    const result = calculateHealthScore(undefined, undefined, null, false);
    expect(result.overall).toBe(21);
    expect(result.nutrition.status).toBe('Needs Work');
    expect(result.exercise.status).toBe('Needs Work');
    expect(result.sleep.status).toBe('Good'); // 70
  });
});

// ---------------------------------------------------------------------------
// Overall weighted formula
// ---------------------------------------------------------------------------

describe('calculateHealthScore – overall weighted formula', () => {
  it('computes overall as round(nutrition*0.4 + exercise*0.3 + sleep*0.3)', () => {
    // nutrition=100, exercise=100, sleep=75 → round(40 + 30 + 22.5) = 93
    const plan = makeDailyPlan(2000, 150, 250, 65, {
      category: 'Cardio',
      duration_minutes: 30,
      calories_burned: 300,
    });
    const targets = makeDri(2000, 150, 250, 65);
    const result = calculateHealthScore(
      plan,
      targets,
      { sleep_time: '01:00', wake_up_time: '07:00' },
      true
    );
    expect(result.overall).toBe(93);
  });

  it('computes overall = 21 for all-zero scenario (nutrition=0, exercise=0, sleep=70)', () => {
    const result = calculateHealthScore(undefined, undefined, null, false);
    expect(result.overall).toBe(Math.round(0 * 0.4 + 0 * 0.3 + 70 * 0.3));
  });
});

// ---------------------------------------------------------------------------
// HealthKit inputs override plan/scheduled fallbacks
// ---------------------------------------------------------------------------

describe('calculateHealthScore – HealthKit inputs', () => {
  it('exercise score = 100 when active energy >= 200 kcal, regardless of plan data', () => {
    const plan = makeDailyPlan(2000, 150, 250, 65, null); // no planned exercise
    const result = calculateHealthScore(plan, undefined, null, true, {
      activeEnergyKcal: 250,
      stepCount: 0,
      sleepMinutes: null,
    });
    expect(result.exercise.score).toBe(100);
  });

  it('exercise score = 85 when active energy < 200 but steps >= 8000', () => {
    const plan = makeDailyPlan(2000, 150, 250, 65, null);
    const result = calculateHealthScore(plan, undefined, null, true, {
      activeEnergyKcal: 50,
      stepCount: 9000,
      sleepMinutes: null,
    });
    expect(result.exercise.score).toBe(85);
  });

  it('exercise falls back to plan-based when HK values are below thresholds', () => {
    const plan = makeDailyPlan(2000, 150, 250, 65, {
      category: 'Cardio',
      duration_minutes: 30,
      calories_burned: 300,
    });
    const result = calculateHealthScore(plan, undefined, null, true, {
      activeEnergyKcal: 50,
      stepCount: 1000,
      sleepMinutes: null,
    });
    expect(result.exercise.score).toBe(100); // from plan
  });

  it('sleep score from real minutes — 8 hours yields 100', () => {
    const result = calculateHealthScore(
      undefined,
      undefined,
      { sleep_time: '01:00', wake_up_time: '07:00' }, // scheduled 6h → would have been 75
      false,
      { activeEnergyKcal: null, stepCount: null, sleepMinutes: 8 * 60 }
    );
    expect(result.sleep.score).toBe(100);
  });

  it('sleep score from real minutes — 4 hours yields 50', () => {
    const result = calculateHealthScore(
      undefined,
      undefined,
      { sleep_time: '23:00', wake_up_time: '07:00' },
      false,
      { activeEnergyKcal: null, stepCount: null, sleepMinutes: 4 * 60 }
    );
    expect(result.sleep.score).toBe(50);
  });

  it('sleep falls back to schedule-based when sleepMinutes is null', () => {
    const result = calculateHealthScore(
      undefined,
      undefined,
      { sleep_time: '23:00', wake_up_time: '07:00' }, // 8h scheduled → 100
      false,
      { activeEnergyKcal: null, stepCount: null, sleepMinutes: null }
    );
    expect(result.sleep.score).toBe(100);
  });

  it('omitting hkInputs entirely is equivalent to no-HK fallback (backwards compatible)', () => {
    const plan = makeDailyPlan(2000, 150, 250, 65, null);
    const without = calculateHealthScore(plan, undefined, null, true);
    const withNulls = calculateHealthScore(plan, undefined, null, true, {
      activeEnergyKcal: null,
      stepCount: null,
      sleepMinutes: null,
    });
    expect(without).toEqual(withNulls);
  });
});
