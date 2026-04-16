# HealthKit — Build Notes

Adding HealthKit requires a fresh native build. After any change to `app.config.ts` HealthKit config:

1. `pnpm exec expo prebuild --platform ios --clean`
2. `pnpm exec eas build --platform ios --profile development` (or `production`)

Existing development builds will crash at app start until a new binary is installed. Expo Go does not support HealthKit; a dev client is required.

HealthKit is unavailable in some iOS Simulator data categories (StepCount, Workout). Manual testing on a physical device is required before submission.
