import type { DriOutput } from '@/api/types.gen';
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

function makeDailyTotals(
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
): { total_calories: number; total_protein: number; total_carbs: number; total_fat: number } {
  return {
    total_calories: calories,
    total_protein: protein,
    total_carbs: carbs,
    total_fat: fat,
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
    const totals = makeDailyTotals(2000, 150, 250, 65);
    const targets = makeDri(2000, 150, 250, 65);
    const result = calculateHealthScore(totals, targets, null, true);
    expect(result.nutrition.score).toBe(100);
  });

  it('returns 0 when todayPlan is undefined', () => {
    const targets = makeDri(2000, 150, 250, 65);
    const result = calculateHealthScore(undefined, targets, null, true);
    expect(result.nutrition.score).toBe(0);
  });

  it('returns 0 when targets are undefined', () => {
    const totals = makeDailyTotals(2000, 150, 250, 65);
    const result = calculateHealthScore(totals, undefined, null, true);
    expect(result.nutrition.score).toBe(0);
  });

  it('clamps individual macro adherence to 0 (no negative scores)', () => {
    // actual = 0, target = 2000 → adherence = 100 - (2000/2000)*100 = 0
    // All macros at 0 → nutrition score = 0
    const totals = makeDailyTotals(0, 0, 0, 0);
    const targets = makeDri(2000, 150, 250, 65);
    const result = calculateHealthScore(totals, targets, null, true);
    expect(result.nutrition.score).toBe(0);
  });

  it('clamps individual macro adherence to 100 (no over-100 scores)', () => {
    // actual = 1.5x target for all → adherence = 100 - 50 = 50 → nutrition score = 50
    const totals = makeDailyTotals(3000, 225, 375, 97.5);
    const targets = makeDri(2000, 150, 250, 65);
    const result = calculateHealthScore(totals, targets, null, true);
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
  it('returns 70 when hasPlan is true', () => {
    const totals = makeDailyTotals(2000, 150, 250, 65);
    const result = calculateHealthScore(totals, undefined, null, true);
    expect(result.exercise.score).toBe(70);
  });

  it('returns 0 when hasPlan is false', () => {
    const result = calculateHealthScore(undefined, undefined, null, false);
    expect(result.exercise.score).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Status labels
// ---------------------------------------------------------------------------

describe('calculateHealthScore – status labels', () => {
  it('returns "Excellent" overall for score >= 90', () => {
    // nutrition=100, exercise=70, sleep=100 → round(40 + 21 + 30) = 91
    const totals = makeDailyTotals(2000, 150, 250, 65);
    const targets = makeDri(2000, 150, 250, 65);
    const result = calculateHealthScore(
      totals,
      targets,
      { sleep_time: '23:00', wake_up_time: '07:00' },
      true
    );
    expect(result.overall).toBe(91);
    expect(result.nutrition.status).toBe('Excellent');
    expect(result.exercise.status).toBe('Good');
    expect(result.sleep.status).toBe('Excellent');
  });

  it('returns "Good" for score >= 70 and < 90', () => {
    // nutrition=100, exercise=0 (hasPlan=false), sleep=100 → overall = 40+0+30 = 70
    const totals = makeDailyTotals(2000, 150, 250, 65);
    const targets = makeDri(2000, 150, 250, 65);
    const result = calculateHealthScore(
      totals,
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
    // nutrition=100, exercise=0 (hasPlan=false), sleep=75 → 40 + 0 + 22.5 = 62.5 → 63
    const totals = makeDailyTotals(2000, 150, 250, 65);
    const targets = makeDri(2000, 150, 250, 65);
    const result = calculateHealthScore(
      totals,
      targets,
      { sleep_time: '01:00', wake_up_time: '07:00' },
      false
    );
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
    // nutrition=100, exercise=70, sleep=75 → round(40 + 21 + 22.5) = 84
    const totals = makeDailyTotals(2000, 150, 250, 65);
    const targets = makeDri(2000, 150, 250, 65);
    const result = calculateHealthScore(
      totals,
      targets,
      { sleep_time: '01:00', wake_up_time: '07:00' },
      true
    );
    expect(result.overall).toBe(84);
  });

  it('computes overall = 21 for all-zero scenario (nutrition=0, exercise=0, sleep=70)', () => {
    const result = calculateHealthScore(undefined, undefined, null, false);
    expect(result.overall).toBe(Math.round(0 * 0.4 + 0 * 0.3 + 70 * 0.3));
  });
});
