import AppleHealthKit from 'react-native-health';
import * as client from '@/lib/healthkit/client';

// Access the mock's per-method override map (set up in jest.setup.ts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockImpl = (AppleHealthKit as any).__mockImpl as Record<string, unknown>;

describe('healthkit client wrappers', () => {
  beforeEach(() => {
    // Reset to no-op-style defaults before each test.
    mockImpl.initHealthKit = (_o: unknown, cb: (e: string | null) => void) => cb(null);
  });

  it('initAuthorization resolves on success', async () => {
    mockImpl.initHealthKit = (_o: unknown, cb: (e: string | null) => void) => cb(null);
    await expect(client.initAuthorization('read')).resolves.toBeUndefined();
  });

  it('initAuthorization rejects when the bridge returns an error', async () => {
    mockImpl.initHealthKit = (_o: unknown, cb: (e: string | null) => void) => cb('boom');
    await expect(client.initAuthorization('read')).rejects.toThrow('boom');
  });

  it('getStepsToday returns { valueToday, sampledAt }', async () => {
    mockImpl.getStepCount = (_o: unknown, cb: (e: string | null, r: { value: number }) => void) =>
      cb(null, { value: 7421 });
    const r = await client.getStepsToday();
    expect(r.valueToday).toBe(7421);
    expect(typeof r.sampledAt).toBe('string');
  });

  it('getActiveEnergyToday returns { kcalToday, sampledAt }', async () => {
    mockImpl.getActiveEnergyBurned = (
      _o: unknown,
      cb: (e: string | null, r: { value: number }) => void
    ) => cb(null, { value: 312.5 });
    const r = await client.getActiveEnergyToday();
    expect(r.kcalToday).toBeCloseTo(312.5);
  });

  it('getLatestWeight returns null when no sample', async () => {
    mockImpl.getLatestWeight = (
      _o: unknown,
      cb: (e: string | null, r: { value: number } | null) => void
    ) => cb(null, null);
    const r = await client.getLatestWeight();
    expect(r).toBeNull();
  });

  it('saveWeight calls the bridge with kg unit', async () => {
    let captured: { value: number; unit: string } | null = null;
    mockImpl.saveWeight = (
      opts: { value: number; unit: string },
      cb: (e: string | null, r: string) => void
    ) => {
      captured = opts;
      cb(null, 'ok');
    };
    await client.saveWeight({ weightKg: 75, recordedAtISO: new Date().toISOString() });
    expect(captured).not.toBeNull();
    expect(captured!.value).toBe(75);
    expect(captured!.unit).toBe('gram');
  });
});
