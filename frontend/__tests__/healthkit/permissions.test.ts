import { permissionsFor } from '@/lib/healthkit/permissions';

describe('permissionsFor', () => {
  it('returns empty read and write arrays for off', () => {
    const p = permissionsFor('off');
    expect(p.permissions.read).toEqual([]);
    expect(p.permissions.write).toEqual([]);
  });

  it('returns all 10 read types and no writes for read', () => {
    const p = permissionsFor('read');
    expect(p.permissions.read).toEqual(
      expect.arrayContaining([
        'Steps',
        'ActiveEnergyBurned',
        'SleepAnalysis',
        'Workout',
        'Weight',
        'BodyFatPercentage',
        'EnergyConsumed',
        'Protein',
        'FatTotal',
        'Carbohydrates',
      ])
    );
    expect(p.permissions.read).toHaveLength(10);
    expect(p.permissions.write).toEqual([]);
  });

  it('returns reads plus Weight, Workout, Carbohydrates for readWrite', () => {
    const p = permissionsFor('readWrite');
    expect(p.permissions.read).toHaveLength(10);
    expect(p.permissions.write).toEqual(
      expect.arrayContaining(['Weight', 'Workout', 'Carbohydrates'])
    );
    expect(p.permissions.write).toHaveLength(3);
  });
});
