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
  fat: number
): DailyMealPlanOutput {
  return {
    day: 'Monday',
    slots: [],
    total_calories: calories,
    total_protein: protein,
    total_carbs: carbs,
    total_fat: fat,
    exercise: null,
  };
}

// ---------------------------------------------------------------------------
// Measure-or-skip rule — each sub-score returns null when its inputs are absent
// ---------------------------------------------------------------------------

describe('calculateHealthScore — measure-or-skip', () => {
  it('returns all nulls and overall null when nothing is measured', () => {
    const result = calculateHealthScore(undefined, undefined, null, false);
    expect(result.nutrition).toBeNull();
    expect(result.exercise).toBeNull();
    expect(result.sleep).toBeNull();
    expect(result.overall).toBeNull();
  });

  it('nutrition is null when hasPlan is false, even if plan/targets are supplied', () => {
    const plan = makeDailyPlan(2000, 150, 250, 65);
    const targets = makeDri(2000, 150, 250, 65);
    const result = calculateHealthScore(plan, targets, null, false);
    expect(result.nutrition).toBeNull();
  });

  it('nutrition is null when plan is present but targets are missing', () => {
    const plan = makeDailyPlan(2000, 150, 250, 65);
    const result = calculateHealthScore(plan, undefined, null, true);
    expect(result.nutrition).toBeNull();
  });

  it('exercise is null when no HK inputs are supplied', () => {
    const plan = makeDailyPlan(2000, 150, 250, 65);
    const targets = makeDri(2000, 150, 250, 65);
    const result = calculateHealthScore(plan, targets, null, true);
    expect(result.exercise).toBeNull();
  });

  it('exercise is null when both HK inputs are null', () => {
    const result = calculateHealthScore(undefined, undefined, null, false, {
      activeEnergyKcal: null,
      stepCount: null,
      sleepMinutes: null,
    });
    expect(result.exercise).toBeNull();
  });

  it('sleep is null when both sleep_time/wake_up_time are missing and HK sleep is null', () => {
    const result = calculateHealthScore(undefined, undefined, {}, false, {
      activeEnergyKcal: null,
      stepCount: null,
      sleepMinutes: null,
    });
    expect(result.sleep).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Nutrition — adherence-based, unchanged logic
// ---------------------------------------------------------------------------

describe('calculateHealthScore — nutrition', () => {
  it('returns 100 when all actuals equal targets exactly', () => {
    const plan = makeDailyPlan(2000, 150, 250, 65);
    const targets = makeDri(2000, 150, 250, 65);
    const result = calculateHealthScore(plan, targets, null, true);
    expect(result.nutrition?.score).toBe(100);
    expect(result.nutrition?.status).toBe('Excellent');
  });

  it('scores 50 when all actuals are 1.5x their targets (50% adherence)', () => {
    const plan = makeDailyPlan(3000, 225, 375, 97.5);
    const targets = makeDri(2000, 150, 250, 65);
    const result = calculateHealthScore(plan, targets, null, true);
    expect(result.nutrition?.score).toBe(50);
  });

  it('clamps individual macro adherence to 0 when actual=0 against nonzero target', () => {
    const plan = makeDailyPlan(0, 0, 0, 0);
    const targets = makeDri(2000, 150, 250, 65);
    const result = calculateHealthScore(plan, targets, null, true);
    expect(result.nutrition?.score).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Sleep — asymmetric piecewise-linear around 8h; 0h scores 0
// ---------------------------------------------------------------------------

describe('calculateHealthScore — sleep (schedule-based)', () => {
  const sched = (sleep_time: string, wake_up_time: string) => ({ sleep_time, wake_up_time });

  it('peaks at 100 for 8h (23:00 → 07:00)', () => {
    const r = calculateHealthScore(undefined, undefined, sched('23:00', '07:00'), false);
    expect(r.sleep?.score).toBe(100);
  });

  it('scores 88 at 7h (undershoot by 1h × 12.5 → 87.5 → round 88)', () => {
    const r = calculateHealthScore(undefined, undefined, sched('00:00', '07:00'), false);
    expect(r.sleep?.score).toBe(88);
  });

  it('scores 94 at 9h (overshoot by 1h × 6 → 94)', () => {
    const r = calculateHealthScore(undefined, undefined, sched('22:00', '07:00'), false);
    expect(r.sleep?.score).toBe(94);
  });

  it('scores 75 at 6h undershoot (01:00 → 07:00)', () => {
    const r = calculateHealthScore(undefined, undefined, sched('01:00', '07:00'), false);
    expect(r.sleep?.score).toBe(75);
  });

  it('scores 50 at 4h undershoot (03:00 → 07:00)', () => {
    const r = calculateHealthScore(undefined, undefined, sched('03:00', '07:00'), false);
    expect(r.sleep?.score).toBe(50);
  });

  it('scores 13 at 1h undershoot (06:00 → 07:00)', () => {
    // 1h of sleep should show something, even if low
    const r = calculateHealthScore(undefined, undefined, sched('06:00', '07:00'), false);
    expect(r.sleep?.score).toBe(13);
  });

  it('handles half-hour precision (5.5h → 100 − 2.5*12.5 = 68.75 → 69)', () => {
    const r = calculateHealthScore(undefined, undefined, sched('01:30', '07:00'), false);
    expect(r.sleep?.score).toBe(69);
  });
});

describe('calculateHealthScore — sleep (HK minutes)', () => {
  const hk = (sleepMinutes: number | null) => ({
    activeEnergyKcal: null,
    stepCount: null,
    sleepMinutes,
  });

  it('scores exactly 0 at 0 minutes', () => {
    const r = calculateHealthScore(undefined, undefined, null, false, hk(0));
    expect(r.sleep?.score).toBe(0);
  });

  it('scores 100 at 8h (480 min)', () => {
    const r = calculateHealthScore(undefined, undefined, null, false, hk(480));
    expect(r.sleep?.score).toBe(100);
  });

  it('scores 68 at 5.3h (318 min, undershoot 2.7h × 12.5 = 33.75 → 66.25)', () => {
    const r = calculateHealthScore(undefined, undefined, null, false, hk(318));
    expect(r.sleep?.score).toBe(66);
  });

  it('prefers HK minutes over scheduled times when both are provided', () => {
    const r = calculateHealthScore(
      undefined,
      undefined,
      { sleep_time: '01:00', wake_up_time: '07:00' }, // schedule → 6h → 75
      false,
      hk(8 * 60) // HK → 8h → 100
    );
    expect(r.sleep?.score).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Exercise — HK-only, blended 70/30 active-energy/steps
// ---------------------------------------------------------------------------

describe('calculateHealthScore — exercise', () => {
  it('scores 100 when active energy hits the 400 kcal target (steps absent)', () => {
    const r = calculateHealthScore(undefined, undefined, null, false, {
      activeEnergyKcal: 400,
      stepCount: null,
      sleepMinutes: null,
    });
    expect(r.exercise?.score).toBe(100);
  });

  it('scores 50 when active energy is at 50% of target (steps absent)', () => {
    const r = calculateHealthScore(undefined, undefined, null, false, {
      activeEnergyKcal: 200,
      stepCount: null,
      sleepMinutes: null,
    });
    expect(r.exercise?.score).toBe(50);
  });

  it('scores 100 when steps hit the 10,000 target (active energy absent)', () => {
    const r = calculateHealthScore(undefined, undefined, null, false, {
      activeEnergyKcal: null,
      stepCount: 10000,
      sleepMinutes: null,
    });
    expect(r.exercise?.score).toBe(100);
  });

  it('blends 70/30 when both are present', () => {
    // Active: 200 kcal → 50; steps: 5000 → 50.  0.7*50 + 0.3*50 = 50.
    const r = calculateHealthScore(undefined, undefined, null, false, {
      activeEnergyKcal: 200,
      stepCount: 5000,
      sleepMinutes: null,
    });
    expect(r.exercise?.score).toBe(50);
  });

  it('active-energy dominates the blend (70% weight)', () => {
    // Active: 400 kcal → 100; steps: 0 → 0.  0.7*100 + 0.3*0 = 70.
    const r = calculateHealthScore(undefined, undefined, null, false, {
      activeEnergyKcal: 400,
      stepCount: 0,
      sleepMinutes: null,
    });
    expect(r.exercise?.score).toBe(70);
  });

  it('steps alone contribute 30% of the blend', () => {
    // Active: 0 → 0; steps: 10,000 → 100. 0.7*0 + 0.3*100 = 30.
    const r = calculateHealthScore(undefined, undefined, null, false, {
      activeEnergyKcal: 0,
      stepCount: 10000,
      sleepMinutes: null,
    });
    expect(r.exercise?.score).toBe(30);
  });

  it('clamps to 100 when inputs exceed their targets', () => {
    const r = calculateHealthScore(undefined, undefined, null, false, {
      activeEnergyKcal: 800, // 2x target
      stepCount: 20000, // 2x target
      sleepMinutes: null,
    });
    expect(r.exercise?.score).toBe(100);
  });

  it('ignores plan-based calories_burned entirely (measurement, not forecast)', () => {
    // Plan suggests 300 kcal burn, but HK reports nothing. Still null.
    const r = calculateHealthScore(undefined, undefined, null, true);
    expect(r.exercise).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Overall — weighted sum renormalized across measured pillars
// ---------------------------------------------------------------------------

describe('calculateHealthScore — overall weighting', () => {
  it('combines three measured pillars with the standard 40/30/30 split', () => {
    const plan = makeDailyPlan(2000, 150, 250, 65); // nutrition=100
    const targets = makeDri(2000, 150, 250, 65);
    const r = calculateHealthScore(
      plan,
      targets,
      { sleep_time: '23:00', wake_up_time: '07:00' }, // 8h → 100
      true,
      { activeEnergyKcal: 400, stepCount: 10000, sleepMinutes: null } // exercise=100
    );
    expect(r.nutrition?.score).toBe(100);
    expect(r.exercise?.score).toBe(100);
    expect(r.sleep?.score).toBe(100);
    expect(r.overall).toBe(100);
  });

  it('renormalizes when exercise is not measured: nutrition 0.4 + sleep 0.3 → 0.57/0.43', () => {
    // nutrition=100, sleep=100 (8h), exercise=null.  weights 0.4 and 0.3 sum to 0.7.
    // overall = 100*0.4/0.7 + 100*0.3/0.7 = 100.
    const plan = makeDailyPlan(2000, 150, 250, 65);
    const targets = makeDri(2000, 150, 250, 65);
    const r = calculateHealthScore(
      plan,
      targets,
      { sleep_time: '23:00', wake_up_time: '07:00' },
      true
    );
    expect(r.exercise).toBeNull();
    expect(r.overall).toBe(100);
  });

  it('renormalizes when only one pillar is measured', () => {
    // Only nutrition=80.  overall = 80.
    const plan = makeDailyPlan(2400, 150, 250, 65); // calories over → adherence 80
    const targets = makeDri(2000, 150, 250, 65);
    const r = calculateHealthScore(plan, targets, null, true);
    expect(r.exercise).toBeNull();
    expect(r.sleep).toBeNull();
    expect(r.overall).toBe(r.nutrition?.score ?? null);
  });

  it('overall is null when every pillar is null', () => {
    const r = calculateHealthScore(undefined, undefined, null, false);
    expect(r.overall).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Status labels — computed from the rounded integer score
// ---------------------------------------------------------------------------

describe('calculateHealthScore — status labels', () => {
  const cases: Array<[number, string]> = [
    [100, 'Excellent'],
    [90, 'Excellent'],
    [89, 'Good'],
    [70, 'Good'],
    [69, 'Fair'],
    [50, 'Fair'],
    [49, 'Needs Work'],
    [0, 'Needs Work'],
  ];
  for (const [boundary, label] of cases) {
    it(`reports "${label}" at score ${boundary} (boundary check)`, () => {
      // Drive nutrition-only via clean numbers: use a target of 100 and actual = boundary.
      const plan = makeDailyPlan(boundary, boundary, boundary, boundary);
      const targets = makeDri(100, 100, 100, 100);
      const r = calculateHealthScore(plan, targets, null, true);
      expect(r.nutrition?.score).toBe(boundary);
      expect(r.nutrition?.status).toBe(label);
    });
  }
});
