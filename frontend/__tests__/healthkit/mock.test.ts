import * as HealthKit from '@kingstinct/react-native-healthkit';

describe('@kingstinct/react-native-healthkit mock', () => {
  it('exposes the Promise-based functions used by client.ts', () => {
    expect(typeof HealthKit.isHealthDataAvailable).toBe('function');
    expect(typeof HealthKit.requestAuthorization).toBe('function');
    expect(typeof HealthKit.queryQuantitySamples).toBe('function');
    expect(typeof HealthKit.getMostRecentQuantitySample).toBe('function');
    expect(typeof HealthKit.queryCategorySamples).toBe('function');
    expect(typeof HealthKit.queryWorkoutSamples).toBe('function');
    expect(typeof HealthKit.saveQuantitySample).toBe('function');
    expect(typeof HealthKit.saveWorkoutSample).toBe('function');
  });

  it('requestAuthorization resolves to a boolean by default', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (HealthKit.requestAuthorization as any)({ toRead: [], toShare: [] });
    expect(result).toBe(true);
  });

  it('queryQuantitySamples resolves to an array by default', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (HealthKit.queryQuantitySamples as any)(
      'HKQuantityTypeIdentifierStepCount',
      { limit: 0 }
    );
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});
