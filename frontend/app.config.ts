import { execSync } from 'child_process';
import { ExpoConfig, ConfigContext } from 'expo/config';

function getGitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

function getVersionFromTag(): string | null {
  try {
    const tag = execSync('git describe --tags --abbrev=0', { encoding: 'utf-8' }).trim();
    // Strip leading 'v' if present (e.g. "v0.2.0" -> "0.2.0")
    return tag.replace(/^v/, '');
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const packageJson = require('./package.json') as { version: string };

const gitHash = getGitHash();
const tagVersion = getVersionFromTag();
const version = tagVersion ?? packageJson.version;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'sophros',
  slug: 'sophros',
  version,
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'sophros',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
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
  },
  android: {
    package: 'com.sophros.app',
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    permissions: [
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'ACCESS_NETWORK_STATE',
      'INTERNET',
    ],
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static' as const,
    favicon: './assets/images/favicon.png',
  },
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
      '@kingstinct/react-native-healthkit',
      {
        NSHealthShareUsageDescription:
          'Sophros reads your activity, sleep, body metrics, and nutrition to tailor your daily health score.',
        NSHealthUpdateUsageDescription:
          'Sophros records completed workouts, weight, and meals back to Apple Health when you enable two-way sync.',
        background: false,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    gitHash,
  },
});
