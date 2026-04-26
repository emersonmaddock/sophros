import type { Direction } from './types';

export interface PermissionsSpec {
  toRead: string[];
  toShare: string[];
}

const READS: string[] = [
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
];

const WRITES: string[] = [
  'HKQuantityTypeIdentifierBodyMass',
  'HKWorkoutTypeIdentifier',
  'HKQuantityTypeIdentifierDietaryEnergyConsumed',
  'HKQuantityTypeIdentifierDietaryProtein',
  'HKQuantityTypeIdentifierDietaryFatTotal',
  'HKQuantityTypeIdentifierDietaryCarbohydrates',
];

export function permissionsFor(direction: Direction): PermissionsSpec {
  switch (direction) {
    case 'off':
      return { toRead: [], toShare: [] };
    case 'read':
      return { toRead: [...READS], toShare: [] };
    case 'readWrite':
      return { toRead: [...READS], toShare: [...WRITES] };
  }
}
