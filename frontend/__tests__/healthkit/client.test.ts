import * as HealthKit from '@kingstinct/react-native-healthkit';
import * as client from '@/lib/healthkit/client';

// Access the mock's per-method override map (set up in jest.setup.ts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockImpl = (HealthKit as any).__mockImpl as Record<string, (...args: unknown[]) => unknown>;

describe('healthkit client wrappers', () => {
  beforeEach(() => {
    mockImpl.requestAuthorization = async () => true;
    mockImpl.queryQuantitySamples = async () => [];
    mockImpl.getMostRecentQuantitySample = async () => undefined;
    mockImpl.saveQuantitySample = async () => ({ uuid: 'test' });
  });

  it('initAuthorization resolves on success', async () => {
    mockImpl.requestAuthorization = async () => true;
    await expect(client.initAuthorization('read')).resolves.toBeUndefined();
  });

  it('initAuthorization rejects when the bridge throws', async () => {
    mockImpl.requestAuthorization = async () => {
      throw new Error('boom');
    };
    await expect(client.initAuthorization('read')).rejects.toThrow('boom');
  });

  it('getStepsToday sums quantity samples and returns { valueToday, sampledAt }', async () => {
    mockImpl.queryQuantitySamples = async () => [{ quantity: 4000 }, { quantity: 3421 }];
    const r = await client.getStepsToday();
    expect(r.valueToday).toBe(7421);
    expect(typeof r.sampledAt).toBe('string');
  });

  it('getActiveEnergyToday sums kcal samples', async () => {
    mockImpl.queryQuantitySamples = async () => [{ quantity: 200 }, { quantity: 112.5 }];
    const r = await client.getActiveEnergyToday();
    expect(r.kcalToday).toBeCloseTo(312.5);
  });

  it('getLatestWeight returns null when no sample', async () => {
    mockImpl.getMostRecentQuantitySample = async () => undefined;
    const r = await client.getLatestWeight();
    expect(r).toBeNull();
  });

  it('saveWeight writes kg directly (no grams conversion)', async () => {
    let captured: { identifier: string; unit: string; value: number } | null = null;
    mockImpl.saveQuantitySample = async (...args: unknown[]) => {
      captured = {
        identifier: args[0] as string,
        unit: args[1] as string,
        value: args[2] as number,
      };
      return { uuid: 'ok' };
    };
    await client.saveWeight({ weightKg: 75, recordedAtISO: new Date().toISOString() });
    expect(captured).not.toBeNull();
    expect(captured!.identifier).toBe('HKQuantityTypeIdentifierBodyMass');
    expect(captured!.unit).toBe('kg');
    expect(captured!.value).toBe(75);
  });
});
