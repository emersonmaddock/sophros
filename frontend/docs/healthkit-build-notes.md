# HealthKit — Build Notes

Adding HealthKit requires a fresh native build. After any change to `app.config.ts` HealthKit config:

1. `pnpm exec expo prebuild --platform ios --clean`
2. `pnpm exec eas build --platform ios --profile development` (or `production`)

Existing development builds will crash at app start until a new binary is installed. Expo Go does not support HealthKit; a dev client is required.

HealthKit is unavailable in some iOS Simulator data categories (StepCount, Workout). Manual testing on a physical device is required before submission.

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
