# Apple Health Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable iOS HealthKit integration to the sophros frontend. Users opt in through a three-state setting (Off / Read-only / Read + Write). Reads power a real-data Health Score; the one wired write path is weight (on profile save). Workout and meal write hooks are exported for future UI triggers.

**Architecture:** A new module `frontend/lib/healthkit/` wraps `react-native-health` behind a `HealthKitProvider` plus per-metric React Query hooks and write mutations. Direction lives in SecureStore keyed by Clerk user ID. The provider listens on AppState and invalidates HK queries on foreground. `utils/healthScore.ts` gains an optional `HealthKitInputs` parameter that promotes real active-energy and sleep-minutes above the current plan-based fallbacks.

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript (strict), TanStack React Query 5, `react-native-health` 1.x, `expo-secure-store`, Clerk, Jest + `@testing-library/react-native`.

**Reference spec:** `docs/superpowers/specs/2026-04-16-apple-health-integration-design.md`.

---

## Conventions used by every task

- All frontend commands run from `/Users/etanase/Developer/sophros/frontend`. Use `pnpm`, never `npm`.
- Tests live under `frontend/__tests__/` mirroring source paths.
- Commits: no `Co-Authored-By` line, no Claude attribution, conventional-commits style (`feat:`, `test:`, `chore:`, `refactor:`). Stage only the files the task modifies.
- Each task ends with `pnpm test -- --findRelatedTests <paths>` and a commit. The final task runs the full suite and `pnpm check`.

---

## Task 1 — Install `react-native-health` and configure iOS natively

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/app.config.ts`
- Create: `frontend/docs/healthkit-build-notes.md` (short note; see step 4)

**Context:** `react-native-health` ships a config plugin that writes the HealthKit entitlement and the two Info.plist usage strings during `expo prebuild`. After merging this task, a fresh native build is required before the module will work.

- [ ] **Step 1: Install the dependency**

Run: `cd frontend && pnpm add react-native-health`

Expected: `package.json` now lists `"react-native-health": "^1.x.x"` under `dependencies`. `pnpm-lock.yaml` updated.

- [ ] **Step 2: Add the plugin and iOS config to `app.config.ts`**

Edit `frontend/app.config.ts`. Change the `plugins` array to include `react-native-health` with its options, and extend the `ios` block with `infoPlist` + `entitlements`.

Replace the `plugins: [ ... ]` block with:

```ts
  plugins: [
    '@clerk/expo',
    'expo-router',
    '@react-native-community/datetimepicker',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
    ],
    [
      'react-native-health',
      {
        healthSharePermission:
          'Sophros reads your activity, sleep, body metrics, and nutrition to tailor your daily health score.',
        healthUpdatePermission:
          'Sophros records completed workouts, weight, and meals back to Apple Health when you enable two-way sync.',
      },
    ],
  ],
```

Replace the `ios: { ... }` block with:

```ts
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.sophros.app',
    buildNumber: '1',
    infoPlist: {
      NSHealthShareUsageDescription:
        'Sophros reads your activity, sleep, body metrics, and nutrition to tailor your daily health score.',
      NSHealthUpdateUsageDescription:
        'Sophros records completed workouts, weight, and meals back to Apple Health when you enable two-way sync.',
    },
    entitlements: {
      'com.apple.developer.healthkit': true,
    },
  },
```

- [ ] **Step 3: Verify the config is still valid**

Run: `cd frontend && pnpm exec expo config --json > /tmp/expo-config.json && node -e "const c=require('/tmp/expo-config.json'); console.log(c.ios.infoPlist.NSHealthShareUsageDescription)"`

Expected: prints the health share permission string (no errors from `expo config`).

- [ ] **Step 4: Document the prebuild requirement**

Create `frontend/docs/healthkit-build-notes.md` with:

```markdown
# HealthKit — Build Notes

Adding HealthKit requires a fresh native build. After any change to `app.config.ts` HealthKit config:

1. `pnpm exec expo prebuild --platform ios --clean`
2. `pnpm exec eas build --platform ios --profile development` (or `production`)

Existing development builds will crash at app start until a new binary is installed. Expo Go does not support HealthKit; a dev client is required.

HealthKit is unavailable in some iOS Simulator data categories (StepCount, Workout). Manual testing on a physical device is required before submission.
```

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml frontend/app.config.ts frontend/docs/healthkit-build-notes.md
git commit -m "feat(healthkit): add react-native-health dep and iOS plugin config"
```

---

## Task 2 — Add a controllable Jest mock for `react-native-health`

**Files:**
- Modify: `frontend/jest.setup.ts`
- Create: `frontend/__tests__/healthkit/mock.test.ts`

**Context:** Every subsequent task needs a mocked `react-native-health`. The mock must support both callback-style invocation (the library uses `(options, callback)` throughout) and allow tests to control returned values per-method. We expose `__mockImpl` so tests can override.

- [ ] **Step 1: Write the failing test at `frontend/__tests__/healthkit/mock.test.ts`**

```ts
import AppleHealthKit from 'react-native-health';

describe('react-native-health mock', () => {
  it('exposes Constants.Permissions', () => {
    expect(AppleHealthKit.Constants).toBeDefined();
    expect(AppleHealthKit.Constants.Permissions.Steps).toBe('Steps');
    expect(AppleHealthKit.Constants.Permissions.ActiveEnergyBurned).toBe('ActiveEnergyBurned');
    expect(AppleHealthKit.Constants.Permissions.SleepAnalysis).toBe('SleepAnalysis');
    expect(AppleHealthKit.Constants.Permissions.Workout).toBe('Workout');
    expect(AppleHealthKit.Constants.Permissions.Weight).toBe('Weight');
    expect(AppleHealthKit.Constants.Permissions.BodyFatPercentage).toBe('BodyFatPercentage');
    expect(AppleHealthKit.Constants.Permissions.EnergyConsumed).toBe('EnergyConsumed');
    expect(AppleHealthKit.Constants.Permissions.Protein).toBe('Protein');
    expect(AppleHealthKit.Constants.Permissions.FatTotal).toBe('FatTotal');
    expect(AppleHealthKit.Constants.Permissions.Carbohydrates).toBe('Carbohydrates');
  });

  it('invokes initHealthKit callback with no error by default', (done) => {
    AppleHealthKit.initHealthKit({ permissions: { read: [], write: [] } }, (err) => {
      expect(err).toBeNull();
      done();
    });
  });

  it('invokes getStepCount callback with a HealthValue result by default', (done) => {
    AppleHealthKit.getStepCount(
      { startDate: new Date().toISOString() },
      (err, result) => {
        expect(err).toBeNull();
        expect(result).toEqual(expect.objectContaining({ value: expect.any(Number) }));
        done();
      }
    );
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails (module not mocked)**

Run: `cd frontend && pnpm test -- __tests__/healthkit/mock.test.ts`
Expected: FAIL — `Cannot find module 'react-native-health'` (or native module error).

- [ ] **Step 3: Add the mock to `frontend/jest.setup.ts`**

Append (do not replace existing content):

```ts
// Mock react-native-health — controllable stub used across HealthKit tests.
// Each method resolves via callback. Tests can override per-method behavior
// via (AppleHealthKit as any).__mockImpl.<methodName> = (opts, cb) => cb(...).
jest.mock('react-native-health', () => {
  const Permissions = {
    Steps: 'Steps',
    ActiveEnergyBurned: 'ActiveEnergyBurned',
    SleepAnalysis: 'SleepAnalysis',
    Workout: 'Workout',
    Weight: 'Weight',
    BodyFatPercentage: 'BodyFatPercentage',
    EnergyConsumed: 'EnergyConsumed',
    Protein: 'Protein',
    FatTotal: 'FatTotal',
    Carbohydrates: 'Carbohydrates',
  };
  const Activities = { Running: 'Running', TraditionalStrengthTraining: 'TraditionalStrengthTraining', Other: 'Other' };
  const defaults = {
    initHealthKit: (_opts: unknown, cb: (e: string | null) => void) => cb(null),
    getStepCount: (_opts: unknown, cb: (e: string | null, r: { value: number }) => void) =>
      cb(null, { value: 0 }),
    getActiveEnergyBurned: (_opts: unknown, cb: (e: string | null, r: { value: number }) => void) =>
      cb(null, { value: 0 }),
    getSleepSamples: (_opts: unknown, cb: (e: string | null, r: unknown[]) => void) => cb(null, []),
    getAnchoredWorkouts: (
      _opts: unknown,
      cb: (e: string | null, r: { data: unknown[]; anchor: string | null }) => void
    ) => cb(null, { data: [], anchor: null }),
    getLatestWeight: (_opts: unknown, cb: (e: string | null, r: { value: number } | null) => void) =>
      cb(null, null),
    getBodyFatPercentageSamples: (_opts: unknown, cb: (e: string | null, r: unknown[]) => void) =>
      cb(null, []),
    getEnergyConsumedSamples: (_opts: unknown, cb: (e: string | null, r: unknown[]) => void) =>
      cb(null, []),
    getProteinSamples: (_opts: unknown, cb: (e: string | null, r: unknown[]) => void) => cb(null, []),
    getFatTotalSamples: (_opts: unknown, cb: (e: string | null, r: unknown[]) => void) =>
      cb(null, []),
    getCarbohydratesSamples: (_opts: unknown, cb: (e: string | null, r: unknown[]) => void) =>
      cb(null, []),
    saveWeight: (_opts: unknown, cb: (e: string | null, r: string) => void) => cb(null, 'ok'),
    saveWorkout: (_opts: unknown, cb: (e: string | null, r: string) => void) => cb(null, 'ok'),
    saveFood: (_opts: unknown, cb: (e: string | null, r: string) => void) => cb(null, 'ok'),
    getAuthStatus: (
      _opts: unknown,
      cb: (e: string | null, r: { permissions: { read: number[]; write: number[] } }) => void
    ) => cb(null, { permissions: { read: [], write: [] } }),
  };
  const mockImpl: Record<string, (opts: unknown, cb: (...args: unknown[]) => void) => void> = {
    ...defaults,
  };
  const proxy = new Proxy(
    {
      Constants: { Permissions, Activities },
      __mockImpl: mockImpl,
    } as Record<string, unknown>,
    {
      get(target, prop: string) {
        if (prop in target) return target[prop];
        return (opts: unknown, cb: (...args: unknown[]) => void) => {
          const impl = mockImpl[prop] ?? defaults[prop as keyof typeof defaults];
          if (!impl) throw new Error(`react-native-health mock: no impl for ${prop}`);
          impl(opts, cb);
        };
      },
    }
  );
  return { __esModule: true, default: proxy };
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && pnpm test -- __tests__/healthkit/mock.test.ts`
Expected: PASS — all 3 assertions green.

- [ ] **Step 5: Commit**

```bash
git add frontend/jest.setup.ts frontend/__tests__/healthkit/mock.test.ts
git commit -m "test(healthkit): add controllable jest mock for react-native-health"
```

---

## Task 3 — Create `lib/healthkit/types.ts`

**Files:**
- Create: `frontend/lib/healthkit/types.ts`
- Create: `frontend/__tests__/healthkit/types.test.ts`

**Context:** Shared type surface for the module. `Direction` is the three-state setting. `MetricKey` identifies each read type. `activityTypeToHK` maps the app's `ActivityType` (from `domain/enums.py` → frontend OpenAPI as `ActivityType`) to HealthKit's workout activity names.

- [ ] **Step 1: Write the failing test at `frontend/__tests__/healthkit/types.test.ts`**

```ts
import { activityTypeToHK, type Direction, type MetricKey } from '@/lib/healthkit/types';

describe('healthkit types', () => {
  it('has three valid Direction values', () => {
    const directions: Direction[] = ['off', 'read', 'readWrite'];
    expect(directions).toHaveLength(3);
  });

  it('lists all 10 metric keys', () => {
    const keys: MetricKey[] = [
      'steps',
      'activeEnergy',
      'sleep',
      'workouts',
      'weight',
      'bodyFat',
      'dietaryEnergy',
      'dietaryProtein',
      'dietaryFat',
      'dietaryCarbs',
    ];
    expect(keys).toHaveLength(10);
  });

  it('maps app activity types to HealthKit activity names', () => {
    expect(activityTypeToHK('cardio')).toBe('Running');
    expect(activityTypeToHK('weightlifting')).toBe('TraditionalStrengthTraining');
    expect(activityTypeToHK('unknown' as never)).toBe('Other');
  });
});
```

- [ ] **Step 2: Run test, confirm it fails (module missing)**

Run: `cd frontend && pnpm test -- __tests__/healthkit/types.test.ts`
Expected: FAIL — `Cannot find module '@/lib/healthkit/types'`.

- [ ] **Step 3: Create `frontend/lib/healthkit/types.ts`**

```ts
export type Direction = 'off' | 'read' | 'readWrite';

export type MetricKey =
  | 'steps'
  | 'activeEnergy'
  | 'sleep'
  | 'workouts'
  | 'weight'
  | 'bodyFat'
  | 'dietaryEnergy'
  | 'dietaryProtein'
  | 'dietaryFat'
  | 'dietaryCarbs';

export interface StepsResult {
  valueToday: number;
  sampledAt: string;
}

export interface ActiveEnergyResult {
  kcalToday: number;
  sampledAt: string;
}

export interface SleepResult {
  minutesLastNight: number | null;
  startedAt: string | null;
  endedAt: string | null;
}

export interface WorkoutSample {
  id: string;
  activityName: string;
  startISO: string;
  endISO: string;
  calories: number | null;
}

export interface BodyMetricSample {
  value: number;
  unit: string;
  recordedAtISO: string;
}

export interface DietaryResult {
  totalToday: number;
}

export type AppActivityType = 'cardio' | 'weightlifting';

const ACTIVITY_MAP: Record<AppActivityType, string> = {
  cardio: 'Running',
  weightlifting: 'TraditionalStrengthTraining',
};

export function activityTypeToHK(t: AppActivityType | string): string {
  if (t in ACTIVITY_MAP) return ACTIVITY_MAP[t as AppActivityType];
  return 'Other';
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `cd frontend && pnpm test -- __tests__/healthkit/types.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/healthkit/types.ts frontend/__tests__/healthkit/types.test.ts
git commit -m "feat(healthkit): add shared types and activity mapping"
```

---

## Task 4 — Permission spec per direction (`lib/healthkit/permissions.ts`)

**Files:**
- Create: `frontend/lib/healthkit/permissions.ts`
- Create: `frontend/__tests__/healthkit/permissions.test.ts`

**Context:** `permissionsFor(direction)` returns the `HealthKitPermissions` object passed to `initHealthKit`. `off` = empty, `read` = all 10 reads + zero writes, `readWrite` = all 10 reads + 3 writes (Weight, Workout, Carbohydrates — meal writes use carb as the anchor + metadata). Snapshot-style test locks the shape.

- [ ] **Step 1: Write the failing test at `frontend/__tests__/healthkit/permissions.test.ts`**

```ts
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
```

- [ ] **Step 2: Run, confirm FAIL**

Run: `cd frontend && pnpm test -- __tests__/healthkit/permissions.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Create `frontend/lib/healthkit/permissions.ts`**

```ts
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
```

- [ ] **Step 4: Run, verify PASS**

Run: `cd frontend && pnpm test -- __tests__/healthkit/permissions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/healthkit/permissions.ts frontend/__tests__/healthkit/permissions.test.ts
git commit -m "feat(healthkit): permission spec per direction"
```

---

## Task 5 — Per-user direction storage (`lib/healthkit/storage.ts`)

**Files:**
- Create: `frontend/lib/healthkit/storage.ts`
- Create: `frontend/__tests__/healthkit/storage.test.ts`

**Context:** SecureStore key is `healthkit.direction.<clerkUserId>`. `loadDirection()` returns `'off'` if nothing stored or if the value is unrecognized. `saveDirection()` validates. `clearDirection()` removes.

- [ ] **Step 1: Write the failing test**

`frontend/__tests__/healthkit/storage.test.ts`:

```ts
import * as SecureStore from 'expo-secure-store';
import { loadDirection, saveDirection, clearDirection } from '@/lib/healthkit/storage';

const getMock = SecureStore.getItemAsync as jest.Mock;
const setMock = SecureStore.setItemAsync as jest.Mock;
const delMock = SecureStore.deleteItemAsync as jest.Mock;

describe('healthkit storage', () => {
  beforeEach(() => {
    getMock.mockReset();
    setMock.mockReset();
    delMock.mockReset();
  });

  it('loads a previously stored direction', async () => {
    getMock.mockResolvedValueOnce('readWrite');
    const d = await loadDirection('user-1');
    expect(getMock).toHaveBeenCalledWith('healthkit.direction.user-1');
    expect(d).toBe('readWrite');
  });

  it('defaults to off when nothing stored', async () => {
    getMock.mockResolvedValueOnce(null);
    const d = await loadDirection('user-1');
    expect(d).toBe('off');
  });

  it('defaults to off when stored value is unrecognized', async () => {
    getMock.mockResolvedValueOnce('garbage');
    const d = await loadDirection('user-1');
    expect(d).toBe('off');
  });

  it('saves a direction under the per-user key', async () => {
    setMock.mockResolvedValueOnce(undefined);
    await saveDirection('user-1', 'read');
    expect(setMock).toHaveBeenCalledWith('healthkit.direction.user-1', 'read');
  });

  it('clears the per-user key', async () => {
    delMock.mockResolvedValueOnce(undefined);
    await clearDirection('user-1');
    expect(delMock).toHaveBeenCalledWith('healthkit.direction.user-1');
  });
});
```

- [ ] **Step 2: Run, confirm FAIL**

Run: `cd frontend && pnpm test -- __tests__/healthkit/storage.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Create `frontend/lib/healthkit/storage.ts`**

```ts
import * as SecureStore from 'expo-secure-store';
import type { Direction } from './types';

const DIRECTIONS: ReadonlySet<Direction> = new Set(['off', 'read', 'readWrite']);

function keyFor(userId: string): string {
  return `healthkit.direction.${userId}`;
}

export async function loadDirection(userId: string): Promise<Direction> {
  const raw = await SecureStore.getItemAsync(keyFor(userId));
  if (raw && DIRECTIONS.has(raw as Direction)) return raw as Direction;
  return 'off';
}

export async function saveDirection(userId: string, direction: Direction): Promise<void> {
  await SecureStore.setItemAsync(keyFor(userId), direction);
}

export async function clearDirection(userId: string): Promise<void> {
  await SecureStore.deleteItemAsync(keyFor(userId));
}
```

- [ ] **Step 4: Run, verify PASS**

Run: `cd frontend && pnpm test -- __tests__/healthkit/storage.test.ts`
Expected: PASS — 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/healthkit/storage.ts frontend/__tests__/healthkit/storage.test.ts
git commit -m "feat(healthkit): per-user direction storage via expo-secure-store"
```

---

## Task 6 — Native client wrappers (`lib/healthkit/client.ts`)

**Files:**
- Create: `frontend/lib/healthkit/client.ts`
- Create: `frontend/__tests__/healthkit/client.test.ts`

**Context:** `client.ts` promisifies every `react-native-health` callback method we use, guards all methods on `Platform.OS === 'ios'`, and exposes one function per read and write operation. All functions return typed results from `types.ts`. Non-iOS callers get `null` for latest-samples and `0` for aggregates.

- [ ] **Step 1: Write the failing test**

`frontend/__tests__/healthkit/client.test.ts`:

```ts
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
    mockImpl.getStepCount = (
      _o: unknown,
      cb: (e: string | null, r: { value: number }) => void
    ) => cb(null, { value: 7421 });
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

  it('saveWeight converts kg to grams before calling the bridge', async () => {
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
    expect(captured!.value).toBe(75000);
    expect(captured!.unit).toBe('gram');
  });
});
```

- [ ] **Step 2: Run, confirm FAIL**

Run: `cd frontend && pnpm test -- __tests__/healthkit/client.test.ts`
Expected: FAIL — `Cannot find module '@/lib/healthkit/client'`.

- [ ] **Step 3: Create `frontend/lib/healthkit/client.ts`**

```ts
import { Platform } from 'react-native';
import AppleHealthKit from 'react-native-health';
import { permissionsFor } from './permissions';
import type {
  ActiveEnergyResult,
  BodyMetricSample,
  DietaryResult,
  Direction,
  SleepResult,
  StepsResult,
  WorkoutSample,
} from './types';

type Callback<T> = (err: string | null, result: T) => void;

function isIOS(): boolean {
  return Platform.OS === 'ios';
}

function promisify<T>(fn: (cb: Callback<T>) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    fn((err, result) => (err ? reject(new Error(err)) : resolve(result)));
  });
}

function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function nowISO(): string {
  return new Date().toISOString();
}

function lastNightWindow(): { start: string; end: string } {
  const end = new Date();
  end.setHours(12, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function initAuthorization(direction: Direction): Promise<void> {
  if (!isIOS()) return;
  const spec = permissionsFor(direction);
  await promisify<void>((cb) =>
    AppleHealthKit.initHealthKit(spec, (err: string | null) => cb(err, undefined as unknown as void))
  );
}

export async function getStepsToday(): Promise<StepsResult> {
  if (!isIOS()) return { valueToday: 0, sampledAt: nowISO() };
  const result = await promisify<{ value: number }>((cb) =>
    AppleHealthKit.getStepCount({ startDate: startOfTodayISO() }, cb)
  );
  return { valueToday: result?.value ?? 0, sampledAt: nowISO() };
}

export async function getActiveEnergyToday(): Promise<ActiveEnergyResult> {
  if (!isIOS()) return { kcalToday: 0, sampledAt: nowISO() };
  const result = await promisify<{ value: number }>((cb) =>
    AppleHealthKit.getActiveEnergyBurned({ startDate: startOfTodayISO() }, cb)
  );
  return { kcalToday: result?.value ?? 0, sampledAt: nowISO() };
}

export async function getSleepLastNight(): Promise<SleepResult> {
  if (!isIOS()) return { minutesLastNight: null, startedAt: null, endedAt: null };
  const { start, end } = lastNightWindow();
  const samples = await promisify<Array<{ startDate: string; endDate: string; value: string }>>(
    (cb) => AppleHealthKit.getSleepSamples({ startDate: start, endDate: end }, cb)
  );
  if (!samples || samples.length === 0) {
    return { minutesLastNight: null, startedAt: null, endedAt: null };
  }
  // Sum "asleep" segments. Values: INBED, ASLEEP, AWAKE, CORE, DEEP, REM.
  const asleep = samples.filter((s) => s.value !== 'INBED' && s.value !== 'AWAKE');
  const totalMs = asleep.reduce(
    (acc, s) => acc + (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()),
    0
  );
  const minutes = Math.round(totalMs / 60000);
  const startedAt = asleep[0]?.startDate ?? null;
  const endedAt = asleep[asleep.length - 1]?.endDate ?? null;
  return { minutesLastNight: minutes > 0 ? minutes : null, startedAt, endedAt };
}

export async function getRecentWorkouts(days: number): Promise<WorkoutSample[]> {
  if (!isIOS()) return [];
  const start = new Date();
  start.setDate(start.getDate() - days);
  const result = await promisify<{
    data: Array<{
      id?: string;
      activityName?: string;
      calories?: number;
      start: string;
      end: string;
    }>;
  }>((cb) =>
    AppleHealthKit.getAnchoredWorkouts({ startDate: start.toISOString(), type: 'Workout' }, cb)
  );
  return (result?.data ?? []).map((w, i) => ({
    id: w.id ?? `${w.start}-${i}`,
    activityName: w.activityName ?? 'Other',
    startISO: w.start,
    endISO: w.end,
    calories: typeof w.calories === 'number' ? w.calories : null,
  }));
}

export async function getLatestWeight(): Promise<BodyMetricSample | null> {
  if (!isIOS()) return null;
  const r = await promisify<{ value: number; startDate?: string } | null>((cb) =>
    AppleHealthKit.getLatestWeight({ unit: 'kg' }, cb)
  );
  if (!r) return null;
  return { value: r.value, unit: 'kg', recordedAtISO: r.startDate ?? nowISO() };
}

export async function getLatestBodyFat(): Promise<BodyMetricSample | null> {
  if (!isIOS()) return null;
  const samples = await promisify<Array<{ value: number; startDate: string }>>((cb) =>
    AppleHealthKit.getBodyFatPercentageSamples(
      { startDate: new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString(), limit: 1 },
      cb
    )
  );
  const s = samples?.[0];
  if (!s) return null;
  return { value: s.value, unit: '%', recordedAtISO: s.startDate };
}

async function sumSamplesToday(
  method:
    | 'getEnergyConsumedSamples'
    | 'getProteinSamples'
    | 'getFatTotalSamples'
    | 'getCarbohydratesSamples'
): Promise<DietaryResult> {
  if (!isIOS()) return { totalToday: 0 };
  const samples = await promisify<Array<{ value: number }>>((cb) =>
    (AppleHealthKit as unknown as Record<string, (o: unknown, c: Callback<unknown>) => void>)[method](
      { startDate: startOfTodayISO(), endDate: nowISO() },
      cb as Callback<unknown>
    )
  );
  const total = (samples ?? []).reduce((acc, s) => acc + (s.value ?? 0), 0);
  return { totalToday: total };
}

export const getDietaryEnergyToday = () => sumSamplesToday('getEnergyConsumedSamples');
export const getDietaryProteinToday = () => sumSamplesToday('getProteinSamples');
export const getDietaryFatToday = () => sumSamplesToday('getFatTotalSamples');
export const getDietaryCarbsToday = () => sumSamplesToday('getCarbohydratesSamples');

export interface SaveWeightInput {
  weightKg: number;
  recordedAtISO: string;
}

export async function saveWeight(input: SaveWeightInput): Promise<void> {
  if (!isIOS()) return;
  // HealthUnit has no 'kilogram' — convert kg to grams before writing so the stored
  // sample represents the user's real weight in HealthKit.
  const valueInGrams = input.weightKg * 1000;
  await promisify<string>((cb) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    AppleHealthKit.saveWeight({ value: valueInGrams, unit: 'gram' } as any, cb as any)
  );
}

export interface SaveWorkoutInput {
  activityName: string; // HealthKit HKWorkoutActivityType name, e.g. "Running"
  startISO: string;
  endISO: string;
  calories?: number;
}

export async function saveWorkout(input: SaveWorkoutInput): Promise<void> {
  if (!isIOS()) return;
  await promisify<string>((cb) =>
    AppleHealthKit.saveWorkout(
      {
        type: input.activityName,
        startDate: input.startISO,
        endDate: input.endISO,
        energyBurned: input.calories ?? 0,
        energyBurnedUnit: 'calorie',
      },
      cb
    )
  );
}

export interface SaveMealInput {
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  consumedAtISO: string;
}

export async function saveMeal(input: SaveMealInput): Promise<void> {
  if (!isIOS()) return;
  // saveFood writes a combined nutrition sample; react-native-health accepts value+date+metadata.
  // Here we use the carb sample as the anchor and attach calories/protein/fat in metadata.
  await promisify<string>((cb) =>
    AppleHealthKit.saveFood(
      {
        value: input.carbsG,
        date: input.consumedAtISO,
        unit: 'gramUnit',
        metadata: {
          HKWasUserEntered: false,
          sophrosCaloriesKcal: input.calories,
          sophrosProteinG: input.proteinG,
          sophrosFatG: input.fatG,
        },
      },
      cb
    )
  );
}
```

- [ ] **Step 4: Run, verify PASS**

Run: `cd frontend && pnpm test -- __tests__/healthkit/client.test.ts`
Expected: PASS — 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/healthkit/client.ts frontend/__tests__/healthkit/client.test.ts
git commit -m "feat(healthkit): native client wrappers with iOS guards"
```

---

## Task 7 — `HealthKitProvider` (`lib/healthkit/provider.tsx`)

**Files:**
- Create: `frontend/lib/healthkit/provider.tsx`
- Create: `frontend/__tests__/healthkit/provider.test.tsx`

**Context:** The provider owns direction state, persists changes, requests authorization on non-`off` directions, listens on AppState to invalidate HK queries on foreground, and resets in-memory state on Clerk sign-out. It depends on Clerk's `useAuth()` and React Query's `useQueryClient()`, both already mounted above in the tree.

- [ ] **Step 1: Write the failing test**

`frontend/__tests__/healthkit/provider.test.tsx`:

```tsx
import React from 'react';
import { AppState } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HealthKitProvider, useHealthKit } from '@/lib/healthkit/provider';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@clerk/expo';

const getMock = SecureStore.getItemAsync as jest.Mock;
const setMock = SecureStore.setItemAsync as jest.Mock;

function wrapper(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <HealthKitProvider>{children}</HealthKitProvider>
    </QueryClientProvider>
  );
}

describe('HealthKitProvider', () => {
  beforeEach(() => {
    getMock.mockReset();
    setMock.mockReset();
    getMock.mockResolvedValue(null); // default: nothing stored
  });

  it('starts in off and loads persisted direction', async () => {
    getMock.mockResolvedValueOnce('read');
    const qc = new QueryClient();
    const { result } = renderHook(() => useHealthKit(), { wrapper: wrapper(qc) });
    await waitFor(() => expect(result.current.direction).toBe('read'));
  });

  it('persists direction on setDirection', async () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useHealthKit(), { wrapper: wrapper(qc) });
    await act(async () => {
      await result.current.setDirection('readWrite');
    });
    expect(setMock).toHaveBeenCalledWith('healthkit.direction.test-user-id', 'readWrite');
    expect(result.current.direction).toBe('readWrite');
  });

  it('invalidates healthkit queries on AppState → active', async () => {
    const qc = new QueryClient();
    const spy = jest.spyOn(qc, 'invalidateQueries');
    renderHook(() => useHealthKit(), { wrapper: wrapper(qc) });

    // Simulate AppState transition. react-native's AppState.addEventListener returns { remove }.
    // Capture the latest registered handler via the mock.
    const calls = (AppState.addEventListener as jest.Mock).mock.calls;
    const lastHandler = calls[calls.length - 1][1] as (s: string) => void;
    act(() => {
      lastHandler('active');
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['healthkit'] });
  });

  it('resets to off when the user signs out', async () => {
    getMock.mockResolvedValueOnce('readWrite');
    const qc = new QueryClient();
    const { result, rerender } = renderHook(() => useHealthKit(), { wrapper: wrapper(qc) });
    await waitFor(() => expect(result.current.direction).toBe('readWrite'));

    // Flip Clerk to signed-out. `useAuth` is mocked at jest.setup.ts to always return isSignedIn: true;
    // re-mock here just for this test.
    (useAuth as jest.Mock).mockReturnValueOnce({
      isSignedIn: false,
      userId: null,
      getToken: jest.fn(),
    });
    rerender({});
    await waitFor(() => expect(result.current.direction).toBe('off'));
  });
});
```

Note: This test requires `AppState.addEventListener` to be a mock. Add to `jest.setup.ts` at the end of Step 3 if not already present (see step 3 of this task).

- [ ] **Step 2: Run, confirm FAIL**

Run: `cd frontend && pnpm test -- __tests__/healthkit/provider.test.tsx`
Expected: FAIL — module missing.

- [ ] **Step 3: Ensure `AppState` is mockable. Add at end of `frontend/jest.setup.ts` *if not already added by jest-expo*:**

Append:

```ts
// Ensure AppState.addEventListener is a jest.Mock so HealthKit provider tests can capture handlers.
import { AppState } from 'react-native';
if (!jest.isMockFunction(AppState.addEventListener)) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (AppState as any).addEventListener = jest.fn(() => ({ remove: jest.fn() }));
}
```

- [ ] **Step 4: Create `frontend/lib/healthkit/provider.tsx`**

```tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import type { NativeEventSubscription } from 'react-native';
import { useAuth } from '@clerk/expo';
import { useQueryClient } from '@tanstack/react-query';
import { initAuthorization } from './client';
import { loadDirection, saveDirection } from './storage';
import type { Direction } from './types';

interface HealthKitContextValue {
  direction: Direction;
  isIOS: boolean;
  setDirection: (d: Direction) => Promise<void>;
  lastRefreshAt: number | null;
}

const HealthKitContext = createContext<HealthKitContextValue | undefined>(undefined);

export function HealthKitProvider({ children }: { children: React.ReactNode }) {
  const { userId, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const [direction, setDirectionState] = useState<Direction>('off');
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null);
  const isIOS = Platform.OS === 'ios';

  // Load persisted direction when user is available.
  useEffect(() => {
    let cancelled = false;
    if (!isSignedIn || !userId) {
      setDirectionState('off');
      queryClient.removeQueries({ queryKey: ['healthkit'] });
      return;
    }
    loadDirection(userId).then((d) => {
      if (!cancelled) setDirectionState(d);
    });
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, userId, queryClient]);

  // Request authorization whenever direction moves off `off`.
  useEffect(() => {
    if (!isIOS || direction === 'off') return;
    initAuthorization(direction).catch((err) => {
      console.warn('[HealthKit] authorization failed:', err);
    });
  }, [direction, isIOS]);

  // AppState: invalidate HK queries on foreground.
  const subRef = useRef<NativeEventSubscription | null>(null);
  useEffect(() => {
    const handler = (state: string) => {
      if (state === 'active' && direction !== 'off') {
        queryClient.invalidateQueries({ queryKey: ['healthkit'] });
        setLastRefreshAt(Date.now());
      }
    };
    subRef.current = AppState.addEventListener('change', handler);
    return () => {
      subRef.current?.remove();
      subRef.current = null;
    };
  }, [direction, queryClient]);

  const setDirection = useCallback(
    async (d: Direction) => {
      if (!userId) return;
      await saveDirection(userId, d);
      setDirectionState(d);
      if (d === 'off') {
        queryClient.removeQueries({ queryKey: ['healthkit'] });
      } else if (isIOS) {
        try {
          await initAuthorization(d);
        } catch (err) {
          console.warn('[HealthKit] authorization failed:', err);
        }
      }
    },
    [userId, queryClient, isIOS]
  );

  const value = useMemo<HealthKitContextValue>(
    () => ({ direction, isIOS, setDirection, lastRefreshAt }),
    [direction, isIOS, setDirection, lastRefreshAt]
  );

  return <HealthKitContext.Provider value={value}>{children}</HealthKitContext.Provider>;
}

export function useHealthKit(): HealthKitContextValue {
  const v = useContext(HealthKitContext);
  if (!v) throw new Error('useHealthKit must be used within HealthKitProvider');
  return v;
}
```

- [ ] **Step 5: Run, verify PASS**

Run: `cd frontend && pnpm test -- __tests__/healthkit/provider.test.tsx`
Expected: PASS — 4 tests green.

- [ ] **Step 6: Commit**

```bash
git add frontend/lib/healthkit/provider.tsx frontend/__tests__/healthkit/provider.test.tsx frontend/jest.setup.ts
git commit -m "feat(healthkit): provider with per-user direction and AppState refresh"
```

---

## Task 8 — Read hooks (`lib/healthkit/queries.ts`)

**Files:**
- Create: `frontend/lib/healthkit/queries.ts`
- Create: `frontend/__tests__/healthkit/queries.test.tsx`

**Context:** Ten per-metric hooks. Each calls React Query with `queryKey: ['healthkit', metric]` and `enabled: direction !== 'off' && Platform.OS === 'ios'`. Hooks return React Query's standard `UseQueryResult` — consumers get `data`, `isLoading`, `error` like any other query. No custom status wrapping.

- [ ] **Step 1: Write the failing test**

`frontend/__tests__/healthkit/queries.test.tsx`:

```tsx
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import AppleHealthKit from 'react-native-health';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HealthKitProvider } from '@/lib/healthkit/provider';
import { useStepsToday, useActiveEnergyToday } from '@/lib/healthkit/queries';
import * as SecureStore from 'expo-secure-store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockImpl = (AppleHealthKit as any).__mockImpl as Record<string, unknown>;

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <HealthKitProvider>{children}</HealthKitProvider>
    </QueryClientProvider>
  );
  return { qc, wrapper };
}

describe('healthkit query hooks', () => {
  beforeEach(() => {
    (SecureStore.getItemAsync as jest.Mock).mockReset();
  });

  it('useStepsToday stays disabled while direction is off (default)', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null); // default off
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useStepsToday(), { wrapper });
    // Queries in disabled state stay idle.
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(result.current.data).toBeUndefined();
  });

  it('useStepsToday fetches when direction is read', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('read');
    mockImpl.getStepCount = (
      _o: unknown,
      cb: (e: string | null, r: { value: number }) => void
    ) => cb(null, { value: 5000 });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useStepsToday(), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual(
      expect.objectContaining({ valueToday: 5000 })
    ));
  });

  it('useActiveEnergyToday fetches when direction is readWrite', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('readWrite');
    mockImpl.getActiveEnergyBurned = (
      _o: unknown,
      cb: (e: string | null, r: { value: number }) => void
    ) => cb(null, { value: 250 });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useActiveEnergyToday(), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual(
      expect.objectContaining({ kcalToday: 250 })
    ));
  });
});
```

- [ ] **Step 2: Run, confirm FAIL**

Run: `cd frontend && pnpm test -- __tests__/healthkit/queries.test.tsx`
Expected: FAIL — module missing.

- [ ] **Step 3: Create `frontend/lib/healthkit/queries.ts`**

```ts
import { Platform } from 'react-native';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import * as client from './client';
import { useHealthKit } from './provider';
import type {
  ActiveEnergyResult,
  BodyMetricSample,
  DietaryResult,
  SleepResult,
  StepsResult,
  WorkoutSample,
} from './types';

const STALE_TIME_MS = 5 * 60 * 1000;
const GC_TIME_MS = 15 * 60 * 1000;

function enabledNow(direction: string): boolean {
  return direction !== 'off' && Platform.OS === 'ios';
}

export function useStepsToday(): UseQueryResult<StepsResult> {
  const { direction } = useHealthKit();
  return useQuery({
    queryKey: ['healthkit', 'steps'],
    queryFn: client.getStepsToday,
    enabled: enabledNow(direction),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}

export function useActiveEnergyToday(): UseQueryResult<ActiveEnergyResult> {
  const { direction } = useHealthKit();
  return useQuery({
    queryKey: ['healthkit', 'activeEnergy'],
    queryFn: client.getActiveEnergyToday,
    enabled: enabledNow(direction),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}

export function useSleepLastNight(): UseQueryResult<SleepResult> {
  const { direction } = useHealthKit();
  return useQuery({
    queryKey: ['healthkit', 'sleep'],
    queryFn: client.getSleepLastNight,
    enabled: enabledNow(direction),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}

export function useRecentWorkouts(days = 7): UseQueryResult<WorkoutSample[]> {
  const { direction } = useHealthKit();
  return useQuery({
    queryKey: ['healthkit', 'workouts', days],
    queryFn: () => client.getRecentWorkouts(days),
    enabled: enabledNow(direction),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}

export function useLatestWeight(): UseQueryResult<BodyMetricSample | null> {
  const { direction } = useHealthKit();
  return useQuery({
    queryKey: ['healthkit', 'weight'],
    queryFn: client.getLatestWeight,
    enabled: enabledNow(direction),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}

export function useLatestBodyFat(): UseQueryResult<BodyMetricSample | null> {
  const { direction } = useHealthKit();
  return useQuery({
    queryKey: ['healthkit', 'bodyFat'],
    queryFn: client.getLatestBodyFat,
    enabled: enabledNow(direction),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}

export function useDietaryEnergyToday(): UseQueryResult<DietaryResult> {
  const { direction } = useHealthKit();
  return useQuery({
    queryKey: ['healthkit', 'dietaryEnergy'],
    queryFn: client.getDietaryEnergyToday,
    enabled: enabledNow(direction),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}

export function useDietaryProteinToday(): UseQueryResult<DietaryResult> {
  const { direction } = useHealthKit();
  return useQuery({
    queryKey: ['healthkit', 'dietaryProtein'],
    queryFn: client.getDietaryProteinToday,
    enabled: enabledNow(direction),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}

export function useDietaryFatToday(): UseQueryResult<DietaryResult> {
  const { direction } = useHealthKit();
  return useQuery({
    queryKey: ['healthkit', 'dietaryFat'],
    queryFn: client.getDietaryFatToday,
    enabled: enabledNow(direction),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}

export function useDietaryCarbsToday(): UseQueryResult<DietaryResult> {
  const { direction } = useHealthKit();
  return useQuery({
    queryKey: ['healthkit', 'dietaryCarbs'],
    queryFn: client.getDietaryCarbsToday,
    enabled: enabledNow(direction),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}
```

- [ ] **Step 4: Run, verify PASS**

Run: `cd frontend && pnpm test -- __tests__/healthkit/queries.test.tsx`
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/healthkit/queries.ts frontend/__tests__/healthkit/queries.test.tsx
git commit -m "feat(healthkit): read hooks for 10 metric types"
```

---

## Task 9 — Write mutations (`lib/healthkit/mutations.ts`)

**Files:**
- Create: `frontend/lib/healthkit/mutations.ts`
- Create: `frontend/__tests__/healthkit/mutations.test.tsx`

**Context:** Three mutations — `useLogWeight`, `useLogWorkout`, `useLogMeal`. Each checks `direction === 'readWrite'` *inside* the mutation; when the direction is not `readWrite`, the mutation resolves `undefined` without calling the bridge. This centralizes the gate.

- [ ] **Step 1: Write the failing test**

`frontend/__tests__/healthkit/mutations.test.tsx`:

```tsx
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import AppleHealthKit from 'react-native-health';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HealthKitProvider } from '@/lib/healthkit/provider';
import { useLogWeight, useLogWorkout } from '@/lib/healthkit/mutations';
import * as SecureStore from 'expo-secure-store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockImpl = (AppleHealthKit as any).__mockImpl as Record<string, unknown>;

function wrap() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <HealthKitProvider>{children}</HealthKitProvider>
    </QueryClientProvider>
  );
}

describe('healthkit mutation gating', () => {
  beforeEach(() => {
    (SecureStore.getItemAsync as jest.Mock).mockReset();
  });

  it('useLogWeight does not call the bridge when direction is off', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null); // off
    const spy = jest.fn((_o: unknown, cb: (e: string | null, r: string) => void) => cb(null, 'ok'));
    mockImpl.saveWeight = spy;
    const { result } = renderHook(() => useLogWeight(), { wrapper: wrap() });
    await result.current.mutateAsync({ weightKg: 80, recordedAtISO: new Date().toISOString() });
    expect(spy).not.toHaveBeenCalled();
  });

  it('useLogWeight does not call the bridge when direction is read', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('read');
    const spy = jest.fn((_o: unknown, cb: (e: string | null, r: string) => void) => cb(null, 'ok'));
    mockImpl.saveWeight = spy;
    const wrapper = wrap();
    const { result } = renderHook(() => useLogWeight(), { wrapper });
    // Wait for provider to hydrate.
    await waitFor(() => expect(SecureStore.getItemAsync).toHaveBeenCalled());
    await result.current.mutateAsync({ weightKg: 80, recordedAtISO: new Date().toISOString() });
    expect(spy).not.toHaveBeenCalled();
  });

  it('useLogWeight calls the bridge when direction is readWrite', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('readWrite');
    const spy = jest.fn((_o: unknown, cb: (e: string | null, r: string) => void) => cb(null, 'ok'));
    mockImpl.saveWeight = spy;
    const wrapper = wrap();
    const { result } = renderHook(() => useLogWeight(), { wrapper });
    await waitFor(() => expect(SecureStore.getItemAsync).toHaveBeenCalled());
    await result.current.mutateAsync({ weightKg: 80, recordedAtISO: new Date().toISOString() });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('useLogWorkout is exported and callable', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('readWrite');
    const spy = jest.fn((_o: unknown, cb: (e: string | null, r: string) => void) => cb(null, 'ok'));
    mockImpl.saveWorkout = spy;
    const wrapper = wrap();
    const { result } = renderHook(() => useLogWorkout(), { wrapper });
    await waitFor(() => expect(SecureStore.getItemAsync).toHaveBeenCalled());
    await result.current.mutateAsync({
      activityName: 'Running',
      startISO: new Date().toISOString(),
      endISO: new Date().toISOString(),
      calories: 120,
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run, confirm FAIL**

Run: `cd frontend && pnpm test -- __tests__/healthkit/mutations.test.tsx`
Expected: FAIL — module missing.

- [ ] **Step 3: Create `frontend/lib/healthkit/mutations.ts`**

```ts
import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import * as client from './client';
import { useHealthKit } from './provider';
import type { SaveMealInput, SaveWeightInput, SaveWorkoutInput } from './client';

function useGated<TInput>(
  fn: (input: TInput) => Promise<void>
): UseMutationResult<void, Error, TInput> {
  const { direction } = useHealthKit();
  return useMutation({
    mutationFn: async (input: TInput) => {
      if (direction !== 'readWrite') return;
      await fn(input);
    },
  });
}

export function useLogWeight() {
  return useGated<SaveWeightInput>(client.saveWeight);
}

export function useLogWorkout() {
  return useGated<SaveWorkoutInput>(client.saveWorkout);
}

export function useLogMeal() {
  return useGated<SaveMealInput>(client.saveMeal);
}
```

- [ ] **Step 4: Run, verify PASS**

Run: `cd frontend && pnpm test -- __tests__/healthkit/mutations.test.tsx`
Expected: PASS — 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/healthkit/mutations.ts frontend/__tests__/healthkit/mutations.test.tsx
git commit -m "feat(healthkit): write mutations gated by readWrite direction"
```

---

## Task 10 — Public index + mount provider

**Files:**
- Create: `frontend/lib/healthkit/index.ts`
- Modify: `frontend/app/_layout.tsx`

**Context:** `index.ts` re-exports everything consumers need. The provider mounts inside `UserProvider` (so it can read the Clerk user ID) and outside `BottomSheetModalProvider`.

- [ ] **Step 1: Create `frontend/lib/healthkit/index.ts`**

```ts
export { HealthKitProvider, useHealthKit } from './provider';
export * from './queries';
export * from './mutations';
export type { Direction, MetricKey, HealthKitInputs } from './types';
export { permissionsFor } from './permissions';
```

Note: `HealthKitInputs` is not in `types.ts` yet; we add it in Task 11. For now, remove it from this re-export.

Change the last export line to:

```ts
export type { Direction, MetricKey } from './types';
```

- [ ] **Step 2: Modify `frontend/app/_layout.tsx` — add import and wrap tree**

At top of the imports block add:

```ts
import { HealthKitProvider } from '@/lib/healthkit';
```

Inside the JSX tree, wrap `<BottomSheetModalProvider>` with `<HealthKitProvider>`. Replace:

```tsx
            <OnboardingProvider>
              <BottomSheetModalProvider>
```

with:

```tsx
            <OnboardingProvider>
              <HealthKitProvider>
                <BottomSheetModalProvider>
```

And the matching closing tag. Replace:

```tsx
              </BottomSheetModalProvider>
            </OnboardingProvider>
```

with:

```tsx
                </BottomSheetModalProvider>
              </HealthKitProvider>
            </OnboardingProvider>
```

- [ ] **Step 3: Run typecheck + related tests**

Run: `cd frontend && pnpm typecheck`
Expected: PASS — no type errors.

Run: `cd frontend && pnpm test -- __tests__/healthkit`
Expected: all HealthKit tests still pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/healthkit/index.ts frontend/app/_layout.tsx
git commit -m "feat(healthkit): mount HealthKitProvider and expose public API"
```

---

## Task 11 — Upgrade `healthScore.ts` with `HealthKitInputs`

**Files:**
- Modify: `frontend/utils/healthScore.ts`
- Modify: `frontend/lib/healthkit/types.ts`
- Modify: `frontend/lib/healthkit/index.ts`
- Modify: `frontend/__tests__/utils/healthScore.test.ts`

**Context:** Add optional 5th parameter. Exercise score prefers active energy ≥ 200 kcal (→ 100); else steps ≥ 8000 (→ 85); else the existing plan-based logic. Sleep score prefers `sleepMinutes` when provided; else existing scheduled-window logic. Thresholds are constants at the top for easy tuning.

- [ ] **Step 1: Add `HealthKitInputs` to `frontend/lib/healthkit/types.ts`**

Append at end of file:

```ts
export interface HealthKitInputs {
  activeEnergyKcal: number | null;
  stepCount: number | null;
  sleepMinutes: number | null;
}
```

- [ ] **Step 2: Re-export from `frontend/lib/healthkit/index.ts`**

Update the types re-export line:

```ts
export type { Direction, MetricKey, HealthKitInputs } from './types';
```

- [ ] **Step 3: Write failing tests**

Append to `frontend/__tests__/utils/healthScore.test.ts`:

```ts
// ---------------------------------------------------------------------------
// HealthKit inputs override plan/scheduled fallbacks
// ---------------------------------------------------------------------------

describe('calculateHealthScore – HealthKit inputs', () => {
  it('exercise score = 100 when active energy >= 200 kcal, regardless of plan data', () => {
    const plan = makeDailyPlan(2000, 150, 250, 65, null); // no planned exercise
    const result = calculateHealthScore(plan, undefined, null, true, {
      activeEnergyKcal: 250,
      stepCount: 0,
      sleepMinutes: null,
    });
    expect(result.exercise.score).toBe(100);
  });

  it('exercise score = 85 when active energy < 200 but steps >= 8000', () => {
    const plan = makeDailyPlan(2000, 150, 250, 65, null);
    const result = calculateHealthScore(plan, undefined, null, true, {
      activeEnergyKcal: 50,
      stepCount: 9000,
      sleepMinutes: null,
    });
    expect(result.exercise.score).toBe(85);
  });

  it('exercise falls back to plan-based when HK values are below thresholds', () => {
    const plan = makeDailyPlan(2000, 150, 250, 65, {
      category: 'Cardio',
      duration_minutes: 30,
      calories_burned: 300,
    });
    const result = calculateHealthScore(plan, undefined, null, true, {
      activeEnergyKcal: 50,
      stepCount: 1000,
      sleepMinutes: null,
    });
    expect(result.exercise.score).toBe(100); // from plan
  });

  it('sleep score from real minutes — 8 hours yields 100', () => {
    const result = calculateHealthScore(
      undefined,
      undefined,
      { sleep_time: '01:00', wake_up_time: '07:00' }, // scheduled 6h → would have been 75
      false,
      { activeEnergyKcal: null, stepCount: null, sleepMinutes: 8 * 60 }
    );
    expect(result.sleep.score).toBe(100);
  });

  it('sleep score from real minutes — 4 hours yields 50', () => {
    const result = calculateHealthScore(
      undefined,
      undefined,
      { sleep_time: '23:00', wake_up_time: '07:00' },
      false,
      { activeEnergyKcal: null, stepCount: null, sleepMinutes: 4 * 60 }
    );
    expect(result.sleep.score).toBe(50);
  });

  it('sleep falls back to schedule-based when sleepMinutes is null', () => {
    const result = calculateHealthScore(
      undefined,
      undefined,
      { sleep_time: '23:00', wake_up_time: '07:00' }, // 8h scheduled → 100
      false,
      { activeEnergyKcal: null, stepCount: null, sleepMinutes: null }
    );
    expect(result.sleep.score).toBe(100);
  });

  it('omitting hkInputs entirely is equivalent to no-HK fallback (backwards compatible)', () => {
    const plan = makeDailyPlan(2000, 150, 250, 65, null);
    const without = calculateHealthScore(plan, undefined, null, true);
    const withNulls = calculateHealthScore(plan, undefined, null, true, {
      activeEnergyKcal: null,
      stepCount: null,
      sleepMinutes: null,
    });
    expect(without).toEqual(withNulls);
  });
});
```

- [ ] **Step 4: Run tests, confirm the new block fails**

Run: `cd frontend && pnpm test -- __tests__/utils/healthScore.test.ts`
Expected: the 7 new tests FAIL (old 26 still pass).

- [ ] **Step 5: Modify `frontend/utils/healthScore.ts`**

Replace entire file with:

```ts
import type { DailyMealPlanOutput, DriOutput, ExerciseRecommendation } from '@/api/types.gen';
import type { HealthKitInputs } from '@/lib/healthkit';

const ACTIVE_ENERGY_EXCELLENT_KCAL = 200;
const STEPS_GOOD_THRESHOLD = 8000;
const ACTIVE_ENERGY_EXCELLENT_SCORE = 100;
const STEPS_GOOD_SCORE = 85;

export interface HealthScoreResult {
  overall: number;
  nutrition: { score: number; status: string };
  exercise: { score: number; status: string };
  sleep: { score: number; status: string };
}

function getStatus(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Needs Work';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function calculateNutritionScore(
  todayPlan: DailyMealPlanOutput | undefined,
  targets: DriOutput | undefined
): number {
  if (!todayPlan || !targets) return 0;

  const macros = [
    { actual: todayPlan.total_calories, target: targets.calories.target },
    { actual: todayPlan.total_protein, target: targets.protein.target },
    { actual: todayPlan.total_carbs, target: targets.carbohydrates.target },
    { actual: todayPlan.total_fat, target: targets.fat.target },
  ];

  const total = macros.reduce((sum, { actual, target }) => {
    if (target === 0) return sum;
    const adherence = 100 - (Math.abs(actual - target) / target) * 100;
    return sum + clamp(adherence, 0, 100);
  }, 0);

  return Math.round(total / macros.length);
}

function calculateExerciseScoreFromPlan(
  exercise: ExerciseRecommendation | null | undefined
): number {
  if (!exercise) return 30;
  if (exercise.calories_burned && exercise.calories_burned > 0) return 100;
  return 85;
}

function calculateExerciseScore(
  hasPlan: boolean,
  exercise: ExerciseRecommendation | null | undefined,
  hk: HealthKitInputs | undefined
): number {
  if (!hasPlan && !hk) return 0;
  // HealthKit inputs win when they cross the thresholds.
  if (hk?.activeEnergyKcal != null && hk.activeEnergyKcal >= ACTIVE_ENERGY_EXCELLENT_KCAL) {
    return ACTIVE_ENERGY_EXCELLENT_SCORE;
  }
  if (hk?.stepCount != null && hk.stepCount >= STEPS_GOOD_THRESHOLD) {
    return STEPS_GOOD_SCORE;
  }
  if (!hasPlan) return 0;
  return calculateExerciseScoreFromPlan(exercise);
}

function calculateSleepScoreFromSchedule(
  sleepTime: string | null | undefined,
  wakeUpTime: string | null | undefined
): number {
  if (!sleepTime || !wakeUpTime) return 70;

  const [sleepH, sleepM] = sleepTime.split(':').map(Number);
  const [wakeH, wakeM] = wakeUpTime.split(':').map(Number);

  let sleepMinutes = sleepH * 60 + sleepM;
  const wakeMinutes = wakeH * 60 + wakeM;

  if (sleepMinutes > wakeMinutes) {
    sleepMinutes -= 24 * 60;
  }

  const hours = (wakeMinutes - sleepMinutes) / 60;

  if (hours >= 7 && hours <= 9) return 100;
  if ((hours >= 6 && hours < 7) || (hours > 9 && hours <= 10)) return 75;
  return 50;
}

function calculateSleepScoreFromMinutes(minutes: number): number {
  const hours = minutes / 60;
  if (hours >= 7 && hours <= 9) return 100;
  if ((hours >= 6 && hours < 7) || (hours > 9 && hours <= 10)) return 75;
  return 50;
}

function calculateSleepScore(
  sleepTime: string | null | undefined,
  wakeUpTime: string | null | undefined,
  hk: HealthKitInputs | undefined
): number {
  if (hk?.sleepMinutes != null) {
    return calculateSleepScoreFromMinutes(hk.sleepMinutes);
  }
  return calculateSleepScoreFromSchedule(sleepTime, wakeUpTime);
}

export function calculateHealthScore(
  todayPlan: DailyMealPlanOutput | undefined,
  targets: DriOutput | undefined,
  user: { wake_up_time?: string | null; sleep_time?: string | null } | null | undefined,
  hasPlan: boolean,
  hkInputs?: HealthKitInputs
): HealthScoreResult {
  const nutritionScore = calculateNutritionScore(todayPlan, targets);
  const exerciseScore = calculateExerciseScore(hasPlan, todayPlan?.exercise, hkInputs);
  const sleepScore = calculateSleepScore(user?.sleep_time, user?.wake_up_time, hkInputs);

  const overall = Math.round(nutritionScore * 0.4 + exerciseScore * 0.3 + sleepScore * 0.3);

  return {
    overall,
    nutrition: { score: nutritionScore, status: getStatus(nutritionScore) },
    exercise: { score: exerciseScore, status: getStatus(exerciseScore) },
    sleep: { score: sleepScore, status: getStatus(sleepScore) },
  };
}
```

- [ ] **Step 6: Run tests, verify all PASS**

Run: `cd frontend && pnpm test -- __tests__/utils/healthScore.test.ts`
Expected: all 33 tests green (26 old + 7 new).

- [ ] **Step 7: Commit**

```bash
git add frontend/lib/healthkit/types.ts frontend/lib/healthkit/index.ts frontend/utils/healthScore.ts frontend/__tests__/utils/healthScore.test.ts
git commit -m "feat(healthkit): healthScore.ts uses real active energy, steps, sleep minutes"
```

---

## Task 12 — Pass HK inputs into Home tab and Health Score screen

**Files:**
- Modify: `frontend/app/(tabs)/index.tsx`
- Modify: `frontend/app/health-score.tsx`

**Context:** Both screens already call `calculateHealthScore(...)`. Add three hook calls and pass a `HealthKitInputs` object. When a hook is disabled (direction `off` or not iOS), its `data` is `undefined`; we coerce to `null` for the inputs.

- [ ] **Step 1: Modify `frontend/app/(tabs)/index.tsx` — add imports**

Below the existing `import { calculateHealthScore } from '@/utils/healthScore';` line, add:

```ts
import {
  useActiveEnergyToday,
  useStepsToday,
  useSleepLastNight,
} from '@/lib/healthkit';
import type { HealthKitInputs } from '@/lib/healthkit';
```

- [ ] **Step 2: In the `DashboardPage` component body, after the existing `useUserQuery`/`useSavedWeekPlanQuery` calls and before the `isLoading` calculation, add:**

```tsx
  const { data: hkActive } = useActiveEnergyToday();
  const { data: hkSteps } = useStepsToday();
  const { data: hkSleep } = useSleepLastNight();

  const hkInputs: HealthKitInputs = useMemo(
    () => ({
      activeEnergyKcal: hkActive?.kcalToday ?? null,
      stepCount: hkSteps?.valueToday ?? null,
      sleepMinutes: hkSleep?.minutesLastNight ?? null,
    }),
    [hkActive, hkSteps, hkSleep]
  );
```

- [ ] **Step 3: Update the `healthScore` memo to pass `hkInputs`**

Replace:

```tsx
  const healthScore = useMemo(
    () => calculateHealthScore(todayPlan, targets, user, !!todayPlan),
    [todayPlan, targets, user]
  );
```

with:

```tsx
  const healthScore = useMemo(
    () => calculateHealthScore(todayPlan, targets, user, !!todayPlan, hkInputs),
    [todayPlan, targets, user, hkInputs]
  );
```

- [ ] **Step 4: Apply the same changes to `frontend/app/health-score.tsx`**

Add imports:

```ts
import {
  useActiveEnergyToday,
  useStepsToday,
  useSleepLastNight,
} from '@/lib/healthkit';
import type { HealthKitInputs } from '@/lib/healthkit';
```

Above the existing `healthScore` memo, add:

```tsx
  const { data: hkActive } = useActiveEnergyToday();
  const { data: hkSteps } = useStepsToday();
  const { data: hkSleep } = useSleepLastNight();

  const hkInputs: HealthKitInputs = useMemo(
    () => ({
      activeEnergyKcal: hkActive?.kcalToday ?? null,
      stepCount: hkSteps?.valueToday ?? null,
      sleepMinutes: hkSleep?.minutesLastNight ?? null,
    }),
    [hkActive, hkSteps, hkSleep]
  );
```

Replace:

```tsx
  const healthScore = useMemo(
    () => calculateHealthScore(todayPlan, targets, user, !!todayPlan),
    [todayPlan, targets, user]
  );
```

with:

```tsx
  const healthScore = useMemo(
    () => calculateHealthScore(todayPlan, targets, user, !!todayPlan, hkInputs),
    [todayPlan, targets, user, hkInputs]
  );
```

- [ ] **Step 5: Run typecheck + home test**

Run: `cd frontend && pnpm typecheck`
Expected: PASS.

Run: `cd frontend && pnpm test -- __tests__/screens/home.test.tsx`
Expected: PASS (the test doesn't exercise HK-enabled paths; hooks return `undefined` by default in `off`).

- [ ] **Step 6: Commit**

```bash
git add frontend/app/\(tabs\)/index.tsx frontend/app/health-score.tsx
git commit -m "feat(healthkit): Home tab and Health Score consume HK inputs"
```

---

## Task 13 — Wire `useLogWeight` into `profile/edit.tsx`

**Files:**
- Modify: `frontend/app/profile/edit.tsx`

**Context:** After `updateUserProfile(updates)` succeeds and `updates.weight` is set, call `logWeight` with the new kg value. The weight converted to kg already exists in the `handleSave` closure as `weightKg`.

- [ ] **Step 1: Add the import at the top of the file**

After the existing `import` lines, add:

```ts
import { useLogWeight } from '@/lib/healthkit';
```

- [ ] **Step 2: Inside the `EditProfileScreen` component, near the other hook calls, add:**

```tsx
  const logWeight = useLogWeight();
```

- [ ] **Step 3: In `handleSave`, modify the success branch to also push weight when it changed.**

Find the block around line 442:

```tsx
    setSaving(true);
    try {
      const success = await updateUserProfile(updates);

      if (success) {
        Alert.alert('Success', 'Profile updated successfully.');
        router.back();
      } else {
```

Change to:

```tsx
    setSaving(true);
    try {
      const success = await updateUserProfile(updates);

      if (success) {
        if (typeof updates.weight === 'number') {
          try {
            await logWeight.mutateAsync({
              weightKg: updates.weight,
              recordedAtISO: new Date().toISOString(),
            });
          } catch (err) {
            // Non-blocking: profile save already succeeded. Log and continue.
            console.warn('[HealthKit] failed to log weight:', err);
          }
        }
        Alert.alert('Success', 'Profile updated successfully.');
        router.back();
      } else {
```

- [ ] **Step 4: Run typecheck**

Run: `cd frontend && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/profile/edit.tsx
git commit -m "feat(healthkit): log weight to Apple Health after profile save"
```

---

## Task 14 — Settings screen `app/profile/health.tsx`

**Files:**
- Create: `frontend/app/profile/health.tsx`

**Context:** A single screen with:
- Status row (Connected / Off / Not supported + last-sync timestamp)
- Three-option segmented control (`Off` / `Read only` / `Read & Write`)
- Metrics list (each of the 10 read types with latest value or "—")
- Simulator banner in `__DEV__` builds
- Platform gate for Android/web

Styling follows existing patterns (`Colors`, `Layout`, `Shadows` from `@/constants/theme`, same shape as `health-score.tsx`).

- [ ] **Step 1: Create `frontend/app/profile/health.tsx`**

```tsx
import { Colors, Layout, Shadows } from '@/constants/theme';
import {
  useActiveEnergyToday,
  useDietaryCarbsToday,
  useDietaryEnergyToday,
  useDietaryFatToday,
  useDietaryProteinToday,
  useHealthKit,
  useLatestBodyFat,
  useLatestWeight,
  useRecentWorkouts,
  useSleepLastNight,
  useStepsToday,
} from '@/lib/healthkit';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Option = { label: string; value: 'off' | 'read' | 'readWrite' };

const OPTIONS: Option[] = [
  { label: 'Off', value: 'off' },
  { label: 'Read only', value: 'read' },
  { label: 'Read & Write', value: 'readWrite' },
];

function formatTimestamp(ms: number | null): string {
  if (!ms) return 'never';
  return new Date(ms).toLocaleTimeString();
}

export default function HealthIntegrationScreen() {
  const router = useRouter();
  const { direction, isIOS, setDirection, lastRefreshAt } = useHealthKit();

  const steps = useStepsToday();
  const active = useActiveEnergyToday();
  const sleep = useSleepLastNight();
  const workouts = useRecentWorkouts(7);
  const weight = useLatestWeight();
  const bodyFat = useLatestBodyFat();
  const dietEnergy = useDietaryEnergyToday();
  const dietProtein = useDietaryProteinToday();
  const dietFat = useDietaryFatToday();
  const dietCarbs = useDietaryCarbsToday();

  const statusLabel = !isIOS
    ? 'Not supported on this platform'
    : direction === 'off'
      ? 'Off'
      : 'Connected';

  const metrics: Array<{ key: string; label: string; value: string }> = [
    { key: 'steps', label: 'Steps today', value: steps.data ? `${steps.data.valueToday}` : '—' },
    {
      key: 'activeEnergy',
      label: 'Active energy today',
      value: active.data ? `${Math.round(active.data.kcalToday)} kcal` : '—',
    },
    {
      key: 'sleep',
      label: 'Sleep last night',
      value: sleep.data?.minutesLastNight
        ? `${(sleep.data.minutesLastNight / 60).toFixed(1)} h`
        : '—',
    },
    {
      key: 'workouts',
      label: 'Workouts (last 7 days)',
      value: workouts.data ? `${workouts.data.length}` : '—',
    },
    {
      key: 'weight',
      label: 'Latest weight',
      value: weight.data ? `${weight.data.value.toFixed(1)} ${weight.data.unit}` : '—',
    },
    {
      key: 'bodyFat',
      label: 'Latest body fat',
      value: bodyFat.data ? `${bodyFat.data.value.toFixed(1)}%` : '—',
    },
    {
      key: 'dietaryEnergy',
      label: 'Dietary energy today',
      value: dietEnergy.data ? `${Math.round(dietEnergy.data.totalToday)} kcal` : '—',
    },
    {
      key: 'dietaryProtein',
      label: 'Dietary protein today',
      value: dietProtein.data ? `${dietProtein.data.totalToday.toFixed(1)} g` : '—',
    },
    {
      key: 'dietaryFat',
      label: 'Dietary fat today',
      value: dietFat.data ? `${dietFat.data.totalToday.toFixed(1)} g` : '—',
    },
    {
      key: 'dietaryCarbs',
      label: 'Dietary carbs today',
      value: dietCarbs.data ? `${dietCarbs.data.totalToday.toFixed(1)} g` : '—',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Apple Health</Text>
          <View style={{ width: 24 }} />
        </View>

        {!isIOS && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>
              Apple Health is iOS only. Health Connect for Android is planned.
            </Text>
          </View>
        )}

        {isIOS && __DEV__ && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>
              Dev build: some HealthKit data types are unavailable in the iOS Simulator. Manual
              testing on a physical device is required.
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Status</Text>
          <Text style={styles.statusLabel}>{statusLabel}</Text>
          <Text style={styles.statusSub}>Last refreshed: {formatTimestamp(lastRefreshAt)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sync mode</Text>
          <View style={styles.segmented}>
            {OPTIONS.map((opt) => {
              const active = direction === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.segmentButton, active && styles.segmentButtonActive]}
                  disabled={!isIOS}
                  onPress={() => setDirection(opt.value)}
                >
                  <Text
                    style={[styles.segmentButtonText, active && styles.segmentButtonTextActive]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {direction !== 'off' && isIOS && (
            <Text style={styles.hint}>
              Not seeing data? Check iOS Settings → Privacy & Security → Health → Sophros.
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Metrics</Text>
          {metrics.map((m) => (
            <View key={m.key} style={styles.metricRow}>
              <Text style={styles.metricLabel}>{m.label}</Text>
              <Text style={styles.metricValue}>{m.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    padding: 20,
    gap: 8,
    ...Shadows.card,
  },
  cardTitle: {
    fontSize: 14,
    color: Colors.light.textMuted,
    fontWeight: '600',
  },
  statusLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  statusSub: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 12,
    backgroundColor: Colors.light.background,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentButtonActive: {
    backgroundColor: Colors.light.primary,
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  segmentButtonTextActive: {
    color: Colors.light.surface,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  metricLabel: {
    fontSize: 14,
    color: Colors.light.text,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  hint: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  infoBanner: {
    backgroundColor: `${Colors.light.primary}10`,
    borderRadius: Layout.cardRadius,
    padding: 12,
  },
  infoText: {
    fontSize: 13,
    color: Colors.light.text,
    lineHeight: 18,
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/profile/health.tsx
git commit -m "feat(healthkit): add Apple Health settings screen"
```

---

## Task 15 — Profile tab row + route registration

**Files:**
- Modify: `frontend/app/(tabs)/profile.tsx`
- Modify: `frontend/app/_layout.tsx`

**Context:** Add a tappable row in the Profile tab that navigates to `/profile/health`. Register the route on the root Stack so navigation renders with the standard stack transition.

- [ ] **Step 1: Read existing profile tab to find the right section**

Run: `cd frontend && pnpm exec grep -n "dietary-preferences" app/\(tabs\)/profile.tsx | head -5`

Expected: one or more lines showing how the existing `/profile/dietary-preferences` row is rendered. Use that shape for the new row.

- [ ] **Step 2: Modify `frontend/app/(tabs)/profile.tsx`**

Find the block that renders the `profile/dietary-preferences` row (it's inside a `<View style={styles.card}>` and uses `router.push('/profile/dietary-preferences')` on press). Duplicate that block and adapt the copy. Typical shape:

```tsx
  <TouchableOpacity
    style={styles.row}
    onPress={() => router.push('/profile/health')}
    activeOpacity={0.8}
  >
    <Text style={styles.rowLabel}>Apple Health</Text>
    <Text style={styles.rowValue}>
      {/* Optional: show direction state here */}
      Manage sync
    </Text>
  </TouchableOpacity>
```

Place the new row adjacent to the existing `Dietary preferences` row. Match the styling exactly — reuse `styles.row`, `styles.rowLabel`, `styles.rowValue` (or whatever the file uses). If no matching style exists, inline a style compatible with the surrounding rows.

- [ ] **Step 3: Register the route on the root Stack in `frontend/app/_layout.tsx`**

Find the line:

```tsx
                  <Stack.Screen
                    name="profile/dietary-preferences"
                    options={{ headerShown: false }}
                  />
```

Immediately below it, add:

```tsx
                  <Stack.Screen name="profile/health" options={{ headerShown: false }} />
```

- [ ] **Step 4: Typecheck + lint**

Run: `cd frontend && pnpm typecheck`
Expected: PASS.

Run: `cd frontend && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/\(tabs\)/profile.tsx frontend/app/_layout.tsx
git commit -m "feat(healthkit): add profile tab row and register route"
```

---

## Task 16 — Final verification

**Files:** none modified.

- [ ] **Step 1: Run full test suite**

Run: `cd frontend && pnpm test`
Expected: ALL PASS (healthScore: 33 tests, healthkit/*: new tests, plus existing suites).

- [ ] **Step 2: Run `pnpm check`**

Run: `cd frontend && pnpm check`
Expected: lint, format:check, typecheck all PASS. If format:check fails, run `pnpm format` and commit any formatting-only diffs as a separate commit: `chore: prettier autofix`.

- [ ] **Step 3: Verify the native build would pick up the plugin**

Run: `cd frontend && pnpm exec expo config --json > /tmp/cfg.json && node -e "const c=require('/tmp/cfg.json'); const hasPlugin=JSON.stringify(c.plugins).includes('react-native-health'); const hasPlist=c.ios?.infoPlist?.NSHealthShareUsageDescription; console.log('plugin:', hasPlugin, 'plist:', !!hasPlist)"`

Expected: prints `plugin: true plist: true`.

- [ ] **Step 4: Document manual device-test plan**

Append to `frontend/docs/healthkit-build-notes.md`:

```markdown
## Manual Device Test Plan

Before merging:

1. `pnpm exec expo prebuild --platform ios --clean`
2. Build and install on a physical iPhone via EAS dev build.
3. Sign in as a test user.
4. Go to Profile tab → Apple Health. Verify the status shows "Off" and sync mode shows "Off" selected.
5. Tap "Read only". iOS should prompt for HealthKit read permission. Grant all. Verify status flips to "Connected" and metrics start populating within a few seconds (or after backgrounding/foregrounding).
6. Tap "Read & Write". iOS should prompt for write permission for Weight, Workout, Carbohydrates. Grant all.
7. Open Edit Profile, change weight, save. Open the iOS Health app → Body Measurements → Weight. Verify the new sample is there with "Sophros" as the source.
8. Background the app for 5 minutes, then foreground. Verify metrics refetch (watch `Last refreshed` timestamp on the settings screen update).
9. Flip sync mode to "Off". Verify metrics clear out.
10. Sign out. Sign in as a different user. Verify the settings screen starts at "Off" (per-user scoping).
```

- [ ] **Step 5: Final commit of docs**

```bash
git add frontend/docs/healthkit-build-notes.md
git commit -m "docs(healthkit): manual device test plan"
```

- [ ] **Step 6: Plan done — summarize in PR description**

Summarize what was built when opening the PR:

```
Implements issue #126 — Apple Health integration (frontend framework).

- Adds `lib/healthkit/` module: provider, 10 read hooks, 3 write mutations
- New settings screen at Profile → Apple Health with Off / Read / Read+Write selector
- healthScore.ts upgraded to use real active energy, steps, and sleep minutes
- Only wired write path is weight on profile save; logWorkout/logMeal exported for future N5 and exercise-completion UI work
- Requires fresh EAS iOS build: see `frontend/docs/healthkit-build-notes.md`
```

---

## Self-Review (performed during planning)

Coverage against spec sections:

- **Architecture & module layout (§1)** — covered in Tasks 3–10, matches the directory structure exactly (types, permissions, storage, client, provider, queries, mutations, index).
- **Native configuration (§2)** — Task 1 installs the dep and extends `app.config.ts` with the plugin, plist strings, and entitlement.
- **Sync-direction state (§3)** — Task 5 implements per-user SecureStore storage; Task 7 wires it into the provider; Task 14 exposes the three-option UI.
- **Read data flow (§4)** — Task 6 wraps all 10 read APIs; Task 8 exposes the 10 React Query hooks; Task 7 handles AppState invalidation.
- **Write data flow (§5)** — Task 6 wraps the three save APIs; Task 9 exposes the 3 gated mutations; Task 13 wires `useLogWeight` into `profile/edit.tsx`.
- **healthScore.ts upgrade (§6)** — Task 11 implements the new scoring branches with TDD.
- **Settings UI (§7)** — Task 14 builds the screen; Task 15 adds the entry point + route.
- **Error & edge cases (§8)** — Task 6 handles non-iOS via `Platform.OS` short-circuits; Task 7 handles sign-out reset; Task 14 handles Android/web disabled state + simulator banner; Task 9 gate covers write permission flipping.
- **Testing (§9)** — Every task has TDD steps; Task 16 runs the full suite + `pnpm check`.
- **Acceptance criteria** — all satisfied across tasks 7 (sign-out), 12 (scoring), 13 (weight write), 14 (settings UI), 15 (profile entry point).

Type-consistency check: `Direction`, `MetricKey`, `HealthKitInputs`, `StepsResult`, `ActiveEnergyResult`, `SleepResult`, `WorkoutSample`, `BodyMetricSample`, `DietaryResult`, `SaveWeightInput`, `SaveWorkoutInput`, `SaveMealInput` — all defined in Tasks 3/6/11 and referenced consistently thereafter.

Out of scope per the spec (confirmed none slipped in): Android Health Connect, background fetch, backend sync, meal-completion UI, exercise-completion UI, historical backfill, micronutrients.
