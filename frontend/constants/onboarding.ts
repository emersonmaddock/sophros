// Onboarding Constants

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
] as const;

export const PREGNANCY_STATUS_OPTIONS = [
  {
    value: 'not_pregnant',
    label: 'Not Pregnant or Breastfeeding',
    description: 'Standard nutritional requirements',
  },
  {
    value: 'pregnant',
    label: 'Pregnant',
    description: 'Increased nutritional needs for pregnancy',
  },
  {
    value: 'breastfeeding_exclusive',
    label: 'Exclusively Breastfeeding',
    description: '0 to 6 months postpartum',
  },
  {
    value: 'breastfeeding_partial',
    label: 'Partially Breastfeeding',
    description: '7 to 12 months postpartum',
  },
] as const;

// USDA Physical Activity Levels
// Based on activities beyond Activities of Daily Living (ADLs)
// For Total Daily Energy Expenditure (TDEE) calculation
// https://goldenplains.extension.colostate.edu/wp-content/uploads/sites/56/2020/12/Basal-Metabolic-Rate-Eating-Plan.pdf
export const ACTIVITY_LEVEL_OPTIONS = [
  {
    value: 'sedentary',
    label: 'Sedentary',
    description: 'Little to no exercise',
  },
  {
    value: 'light',
    label: 'Lightly Active',
    description: 'Light exercise 3-5 times a week',
  },
  {
    value: 'moderate',
    label: 'Moderately Active',
    description: 'Moderate exercise 3-5 times a week',
  },
  {
    value: 'active',
    label: 'Active',
    description: 'Hard exercise 4-6 times a week',
  },
  {
    value: 'very_active',
    label: 'Very Active',
    description: 'Hard daily exercise (or twice a day)',
  },
] as const;

// Validation Rules
export const VALIDATION_RULES = {
  age: {
    min: 13,
    max: 120,
  },
  weight: {
    min: 20, // kg
    max: 300, // kg
  },
  height: {
    min: 100, // cm
    max: 250, // cm
  },
} as const;

// Unit Conversion Factors
export const UNIT_CONVERSION = {
  // Weight
  LBS_TO_KG: 0.453592,
  KG_TO_LBS: 2.20462,

  // Height
  CM_TO_INCHES: 0.393701,
  INCHES_TO_CM: 2.54,
  CM_TO_FEET: 0.0328084,
  FEET_TO_CM: 30.48,
} as const;

// Helper functions
export function lbsToKg(lbs: number): number {
  return lbs * UNIT_CONVERSION.LBS_TO_KG;
}

export function kgToLbs(kg: number): number {
  return kg * UNIT_CONVERSION.KG_TO_LBS;
}

export function cmToInches(cm: number): number {
  return cm * UNIT_CONVERSION.CM_TO_INCHES;
}

export function inchesToCm(inches: number): number {
  return inches * UNIT_CONVERSION.INCHES_TO_CM;
}

export function cmToFeetAndInches(cm: number): { feet: number; inches: number } {
  const totalInches = cmToInches(cm);
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
}

export function feetAndInchesToCm(feet: number, inches: number): number {
  return inchesToCm(feet * 12 + inches);
}
