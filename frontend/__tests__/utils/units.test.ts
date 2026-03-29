import {
  UNIT_CONVERSION,
  cmToFeetAndInches,
  cmToInches,
  feetAndInchesToCm,
  inchesToCm,
  kgToLbs,
  lbsToKg,
} from '@/utils/units';

describe('UNIT_CONVERSION constants', () => {
  it('exposes LBS_TO_KG', () => {
    expect(UNIT_CONVERSION.LBS_TO_KG).toBe(0.453592);
  });

  it('exposes INCHES_TO_CM', () => {
    expect(UNIT_CONVERSION.INCHES_TO_CM).toBe(2.54);
  });

  it('exposes FEET_TO_CM', () => {
    expect(UNIT_CONVERSION.FEET_TO_CM).toBe(30.48);
  });
});

describe('lbsToKg', () => {
  it('converts 1 lb to ~0.4536 kg', () => {
    expect(lbsToKg(1)).toBeCloseTo(0.453592, 5);
  });

  it('converts 0 lbs to 0 kg', () => {
    expect(lbsToKg(0)).toBe(0);
  });

  it('converts 150 lbs correctly', () => {
    expect(lbsToKg(150)).toBeCloseTo(150 * 0.453592, 4);
  });
});

describe('kgToLbs', () => {
  it('converts 80 kg to ~176.37 lbs', () => {
    expect(kgToLbs(80)).toBeCloseTo(176.37, 1);
  });

  it('converts 0 kg to 0 lbs', () => {
    expect(kgToLbs(0)).toBe(0);
  });

  it('converts 1 kg to ~2.2046 lbs', () => {
    expect(kgToLbs(1)).toBeCloseTo(2.2046, 3);
  });
});

describe('lbsToKg / kgToLbs round-trip', () => {
  it('round-trips 80 kg', () => {
    expect(lbsToKg(kgToLbs(80))).toBeCloseTo(80, 5);
  });

  it('round-trips 150 lbs', () => {
    expect(kgToLbs(lbsToKg(150))).toBeCloseTo(150, 5);
  });
});

describe('cmToInches', () => {
  it('converts 2.54 cm to 1 inch', () => {
    expect(cmToInches(2.54)).toBeCloseTo(1, 5);
  });

  it('converts 0 cm to 0 inches', () => {
    expect(cmToInches(0)).toBe(0);
  });

  it('converts 180 cm to ~70.87 inches', () => {
    expect(cmToInches(180)).toBeCloseTo(70.866, 2);
  });
});

describe('inchesToCm', () => {
  it('converts 1 inch to 2.54 cm', () => {
    expect(inchesToCm(1)).toBeCloseTo(2.54, 5);
  });

  it('converts 0 inches to 0 cm', () => {
    expect(inchesToCm(0)).toBe(0);
  });

  it('converts 12 inches to ~30.48 cm', () => {
    expect(inchesToCm(12)).toBeCloseTo(30.48, 5);
  });
});

describe('cmToInches / inchesToCm round-trip', () => {
  it('round-trips 180 cm', () => {
    expect(inchesToCm(cmToInches(180))).toBeCloseTo(180, 5);
  });

  it('round-trips 71 inches', () => {
    expect(cmToInches(inchesToCm(71))).toBeCloseTo(71, 5);
  });
});

describe('cmToFeetAndInches', () => {
  it('converts 180 cm to 5 feet 11 inches', () => {
    expect(cmToFeetAndInches(180)).toEqual({ feet: 5, inches: 11 });
  });

  it('converts 182.88 cm (exactly 6 feet) to 6 feet 0 inches', () => {
    expect(cmToFeetAndInches(182.88)).toEqual({ feet: 6, inches: 0 });
  });

  it('normalizes a value that would produce 5\'12" into 6\'0"', () => {
    // 181.7 cm → totalInches ≈ 71.535 → feet=5, remainder≈11.5 → rounds to 12 → normalizes to 6'0"
    expect(cmToFeetAndInches(181.7)).toEqual({ feet: 6, inches: 0 });
  });

  it('converts 0 cm to 0 feet 0 inches', () => {
    expect(cmToFeetAndInches(0)).toEqual({ feet: 0, inches: 0 });
  });
});

describe('feetAndInchesToCm', () => {
  it('converts 5\'11" to ~180.34 cm', () => {
    expect(feetAndInchesToCm(5, 11)).toBeCloseTo(180.34, 1);
  });

  it('converts 6\'0" to ~182.88 cm', () => {
    expect(feetAndInchesToCm(6, 0)).toBeCloseTo(182.88, 2);
  });

  it('converts 0\'0" to 0 cm', () => {
    expect(feetAndInchesToCm(0, 0)).toBe(0);
  });
});

describe('feetAndInchesToCm / cmToFeetAndInches round-trip', () => {
  it('round-trips 5\'11"', () => {
    const cm = feetAndInchesToCm(5, 11);
    expect(cmToFeetAndInches(cm)).toEqual({ feet: 5, inches: 11 });
  });

  it('round-trips 6\'0"', () => {
    const cm = feetAndInchesToCm(6, 0);
    expect(cmToFeetAndInches(cm)).toEqual({ feet: 6, inches: 0 });
  });
});
