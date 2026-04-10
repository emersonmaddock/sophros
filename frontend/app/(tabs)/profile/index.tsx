import { DatePickerInput } from '@/components/DatePickerInput';
import { TimePickerInput } from '@/components/TimePickerInput';
import { Colors, Layout, Shadows } from '@/constants/theme';
import { useDevTime } from '@/contexts/DevTimeContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth, useUserProfileModal } from '@clerk/expo';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import {
  Calendar,
  ChevronRight,
  Heart,
  LogOut,
  Pencil,
  Settings,
  Utensils,
  Wrench,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface MenuItem {
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  value?: string;
  onPress?: () => void;
}

const appVersion = Constants.expoConfig?.version ?? 'unknown';
const gitHash = (Constants.expoConfig?.extra as { gitHash?: string } | undefined)?.gitHash;
const versionDisplay = gitHash ? `v${appVersion} (${gitHash})` : `v${appVersion}`;

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayStr(): string {
  return localDateStr(new Date());
}

function currentTimeStr(): string {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

export default function ProfilePage() {
  const { signOut } = useAuth();
  const { presentUserProfile } = useUserProfileModal();
  const router = useRouter();
  const { profile, backendUser, loading, clerkUser } = useUserProfile();

  // Dev time override
  const { overrideTime, setOverrideTime } = useDevTime();
  const [devDate, setDevDate] = useState(todayStr);
  const [devTime, setDevTime] = useState(currentTimeStr);

  // Keep pickers in sync with the active override (or real time when cleared)
  useEffect(() => {
    const ref = overrideTime ?? new Date();
    setDevDate(localDateStr(ref));
    setDevTime(
      `${ref.getHours().toString().padStart(2, '0')}:${ref.getMinutes().toString().padStart(2, '0')}`
    );
  }, [overrideTime]);

  const handleApplyOverride = () => {
    const [year, month, day] = devDate.split('-').map(Number);
    const [hour, minute] = devTime.split(':').map(Number);
    const d = new Date(year, month - 1, day, hour, minute, 0, 0);
    setOverrideTime(d);
  };

  const handleResetTime = () => {
    setOverrideTime(null);
    setDevDate(todayStr());
    setDevTime(currentTimeStr());
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/sign-in');
        },
      },
    ]);
  };

  const handleOpenProfileEditor = () => {
    router.push('/(tabs)/profile/edit');
  };

  const allergyCount = backendUser?.allergies?.length ?? 0;
  const dietLabels = [
    backendUser?.is_vegetarian && 'Vegetarian',
    backendUser?.is_vegan && 'Vegan',
    backendUser?.is_ketogenic && 'Keto',
    backendUser?.is_gluten_free && 'Gluten-Free',
    backendUser?.is_pescatarian && 'Pescatarian',
  ].filter(Boolean);
  const dietarySummary =
    [
      allergyCount > 0 ? `${allergyCount} ${allergyCount === 1 ? 'allergy' : 'allergies'}` : null,
      ...dietLabels,
    ]
      .filter(Boolean)
      .join(', ') || 'Not set';

  const menuItems: MenuItem[] = [
    {
      label: 'Edit Profile',
      icon: Pencil,
      value: 'Age, metrics, activity, units',
      onPress: handleOpenProfileEditor,
    },
    {
      label: 'Allergies & Preferences',
      icon: Utensils,
      value: dietarySummary,
      onPress: () => router.push('/(tabs)/profile/dietary-preferences'),
    },
    {
      label: 'Sync Health Data',
      icon: Heart,
      value: 'Connected',
    },
    {
      label: 'Sync Calendar',
      icon: Calendar,
      value: 'Connected',
    },
    {
      label: 'Account Settings',
      icon: Settings,
      onPress: presentUserProfile,
    },
  ];

  if (loading || !profile || !backendUser) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Profile</Text>
            <Text style={styles.headerSubtitle}>Manage your health data</Text>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleOpenProfileEditor}
            activeOpacity={0.8}
          >
            <Pencil size={20} color={Colors.light.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileInfo}>
            {clerkUser?.imageUrl ? (
              <Image source={{ uri: clerkUser.imageUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{profile.fullName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View>
              <Text style={styles.profileName}>{profile.fullName}</Text>
              <Text style={styles.profileEmail}>{profile.email}</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.age}</Text>
              <Text style={styles.statLabel}>Age</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.height}</Text>
              <Text style={styles.statLabel}>Height</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.weight}</Text>
              <Text style={styles.statLabel}>Weight</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.menuContainer}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.menuItem}
                activeOpacity={item.onPress ? 0.8 : 1}
                onPress={item.onPress}
                disabled={!item.onPress}
              >
                <View style={styles.menuIconBox}>
                  <item.icon size={20} color={Colors.light.primary} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.value ? <Text style={styles.menuValue}>{item.value}</Text> : null}
                </View>
                <ChevronRight size={20} color={Colors.light.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
            <LogOut size={20} color={Colors.light.error} />
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Developer Tools */}
        <View style={styles.devSection}>
          <View style={styles.devHeader}>
            <Wrench size={14} color="#92400E" />
            <Text style={styles.devTitle}>Developer Tools</Text>
          </View>

          <View style={styles.devStatus}>
            <Text style={styles.devStatusLabel}>Current time override</Text>
            <Text style={styles.devStatusValue}>
              {overrideTime
                ? overrideTime.toLocaleString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : 'Real time (no override)'}
            </Text>
          </View>

          <DatePickerInput
            label="Override Date"
            value={devDate}
            onChange={setDevDate}
            style={styles.devPicker}
          />
          <TimePickerInput
            label="Override Time"
            value={devTime}
            onChange={setDevTime}
            format="24h"
            style={styles.devPicker}
          />

          <View style={styles.devActions}>
            <TouchableOpacity style={styles.devApplyButton} onPress={handleApplyOverride}>
              <Text style={styles.devApplyText}>Apply Override</Text>
            </TouchableOpacity>
            {overrideTime && (
              <TouchableOpacity style={styles.devResetButton} onPress={handleResetTime}>
                <Text style={styles.devResetText}>Reset to Real Time</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={styles.versionText}>{versionDisplay}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.textMuted,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.light.textMuted,
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${Colors.light.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    padding: 24,
    marginBottom: 24,
    ...Shadows.card,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    color: Colors.light.textMuted,
    marginBottom: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
  },
  menuContainer: {
    gap: 12,
  },
  menuItem: {
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    ...Shadows.card,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: `${Colors.light.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  menuValue: {
    fontSize: 13,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.light.error,
    ...Shadows.card,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.error,
  },
  versionText: {
    fontSize: 12,
    color: Colors.light.textMuted,
    textAlign: 'center',
  },
  devSection: {
    marginBottom: 24,
    backgroundColor: '#FFFBEB',
    borderRadius: Layout.cardRadius,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    gap: 12,
  },
  devHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  devTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  devStatus: {
    gap: 2,
  },
  devStatusLabel: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  devStatusValue: {
    fontSize: 13,
    color: '#78350F',
    fontWeight: '500',
  },
  devPicker: {
    // no extra style needed — picker handles its own layout
  },
  devActions: {
    flexDirection: 'row',
    gap: 10,
  },
  devApplyButton: {
    flex: 1,
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  devApplyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  devResetButton: {
    flex: 1,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  devResetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
});
