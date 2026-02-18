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
  let feet = Math.floor(totalInches / 12);
  let inches = Math.round(totalInches % 12);

  // Normalize values such as 5' 12" into 6' 0".
  if (inches === 12) {
    feet += 1;
    inches = 0;
  }

  return { feet, inches };
}

export function feetAndInchesToCm(feet: number, inches: number): number {
  return inchesToCm(feet * 12 + inches);
}
