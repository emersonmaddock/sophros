import type { Direction } from './types';

export interface HealthKitPermissionsSpec {
  permissions: {
    read: string[];
    write: string[];
  };
}

const READS: string[] = [
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
];

const WRITES: string[] = ['Weight', 'Workout', 'Carbohydrates'];

export function permissionsFor(direction: Direction): HealthKitPermissionsSpec {
  switch (direction) {
    case 'off':
      return { permissions: { read: [], write: [] } };
    case 'read':
      return { permissions: { read: [...READS], write: [] } };
    case 'readWrite':
      return { permissions: { read: [...READS], write: [...WRITES] } };
  }
}
