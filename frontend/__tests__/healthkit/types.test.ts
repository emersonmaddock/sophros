import { activityTypeToHK, type Direction, type MetricKey } from '@/lib/healthkit/types';

describe('healthkit types', () => {
  it('has three valid Direction values', () => {
    const directions: Direction[] = ['off', 'read', 'readWrite'];
    expect(directions).toHaveLength(3);
  });

  it('lists all 10 metric keys', () => {
    const keys: MetricKey[] = [
      'steps',
      'activeEnergy',
      'sleep',
      'workouts',
      'weight',
      'bodyFat',
      'dietaryEnergy',
      'dietaryProtein',
      'dietaryFat',
      'dietaryCarbs',
    ];
    expect(keys).toHaveLength(10);
  });

  it('maps backend ExerciseCategory values to HealthKit activity names', () => {
    expect(activityTypeToHK('Cardio')).toBe('Running');
    expect(activityTypeToHK('Weight Lifting')).toBe('TraditionalStrengthTraining');
    expect(activityTypeToHK('toString')).toBe('Other');
    expect(activityTypeToHK('unknown' as never)).toBe('Other');
  });
});
