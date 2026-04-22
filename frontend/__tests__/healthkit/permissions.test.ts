import { permissionsFor } from '@/lib/healthkit/permissions';

describe('permissionsFor', () => {
  it('returns empty toRead and toShare arrays for off', () => {
    const p = permissionsFor('off');
    expect(p.toRead).toEqual([]);
    expect(p.toShare).toEqual([]);
  });

  it('returns all 10 read types and no writes for read', () => {
    const p = permissionsFor('read');
    expect(p.toRead).toEqual(
      expect.arrayContaining([
        'HKQuantityTypeIdentifierStepCount',
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        'HKCategoryTypeIdentifierSleepAnalysis',
        'HKWorkoutTypeIdentifier',
        'HKQuantityTypeIdentifierBodyMass',
        'HKQuantityTypeIdentifierBodyFatPercentage',
        'HKQuantityTypeIdentifierDietaryEnergyConsumed',
        'HKQuantityTypeIdentifierDietaryProtein',
        'HKQuantityTypeIdentifierDietaryFatTotal',
        'HKQuantityTypeIdentifierDietaryCarbohydrates',
      ])
    );
    expect(p.toRead).toHaveLength(10);
    expect(p.toShare).toEqual([]);
  });

  it('returns reads plus Body Mass, Workout, and 4 dietary macros for readWrite', () => {
    const p = permissionsFor('readWrite');
    expect(p.toRead).toHaveLength(10);
    expect(p.toShare).toEqual(
      expect.arrayContaining([
        'HKQuantityTypeIdentifierBodyMass',
        'HKWorkoutTypeIdentifier',
        'HKQuantityTypeIdentifierDietaryEnergyConsumed',
        'HKQuantityTypeIdentifierDietaryProtein',
        'HKQuantityTypeIdentifierDietaryFatTotal',
        'HKQuantityTypeIdentifierDietaryCarbohydrates',
      ])
    );
    expect(p.toShare).toHaveLength(6);
  });
});
