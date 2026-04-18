# How to Deploy Sophros for Android

## Overview

This guide covers building a signed Android release bundle and publishing it to Google Play's internal testing track.

---

## Prerequisites

- Android Studio installed (provides the Android SDK)
- A Google Play Console account with the app created
- Node.js and pnpm installed

---

Android:
```bash
cd frontend
npx expo prebuild --platform android --clean
cd android
./gradlew assembleDebug
./gradlew assembleRelease
```
The APK is written to `android/app/build/outputs/apk/debug/`.

## Step 1: Set the Android SDK Location

Gradle needs to know where your Android SDK lives. Set this in `frontend/android/local.properties`:

```
sdk.dir=C:\\Users\\<your-username>\\AppData\\Local\\Android\\Sdk
```

> **Note:** `local.properties` is machine-specific and is gitignored. Every developer (and CI machine) must create their own copy. Do not commit this file.

---

## Step 2: Generate a Release Keystore

You only need to do this once. Run this from the repo root:

```bash
keytool -genkeypair -v \
  -keystore my-upload-key.keystore \
  -alias my-upload-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

You will be prompted to set a keystore password, key alias, and key password. Keep these safe — **losing the keystore or passwords means you can no longer publish updates to the same Play Store listing.**

> **Warning:** Do not commit the `.keystore` file to git. It is already in `.gitignore`.

---

## Step 3: Configure Signing in `app/build.gradle`

The signing config belongs in `frontend/android/app/build.gradle`, inside the `android {}` block. **Do not put it in the root `build.gradle`** — the Android plugin is not applied there, and Gradle will throw:

```
Could not find method android() for arguments [...] on root project
```

In `app/build.gradle`, add a `release` entry to `signingConfigs` and point the `release` build type at it:

```groovy
android {
    signingConfigs {
        debug { ... }           // leave this as-is
        release {
            storeFile file('../../../my-upload-key.keystore')
            storePassword 'your-store-password'
            keyAlias 'my-upload-key'
            keyPassword 'your-key-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release   // was signingConfigs.debug
            ...
        }
    }
}
```

The path `../../../my-upload-key.keystore` is relative to the `app/` directory and resolves to the repo root.

> **Tip:** For CI or shared environments, prefer reading credentials from environment variables or `gradle.properties` rather than hardcoding them.

---

## Step 4: Build the Release Bundle

From `frontend/android/`:

```bash
./gradlew bundleRelease
```

The output `.aab` file will be at:

```
frontend/android/app/build/outputs/bundle/release/app-release.aab
```

JS bundling into the release is handled automatically by the React Native Gradle plugin for non-debug build types — you do not need to set `bundleInRelease` manually.

---

## Step 5: Upload to Google Play

1. Go to [Google Play Console](https://play.google.com/console) and open the app.
2. Navigate to **Testing → Internal testing → Releases**.
3. Click **Create new release** and upload the `.aab` file.
4. Add release notes and click **Save → Review release → Start rollout**.

---

## Step 6: Add Internal Testers

1. In **Testing → Internal testing**, go to the **Testers** tab.
2. Add each tester's Google account email.
3. Copy the **opt-in URL** and send it to them.

Testers must open the opt-in URL on their Android device, accept the invite, then install the app from the Play Store link provided.

---

## Bumping the Version

Before each new release, increment `versionCode` (must always increase) and update `versionName` as needed in `app/build.gradle`:

```groovy
defaultConfig {
    versionCode 3          // integer, must be higher than the previous release
    versionName "0.4.0"   // human-readable string
}
```
