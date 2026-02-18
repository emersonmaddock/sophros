import type { UserUpdate } from '@/api/types.gen';
import { Colors, Layout, Shadows } from '@/constants/theme';
import { useUserProfile } from '@/hooks/useUserProfile';
import { cmToInches, inchesToCm, kgToLbs, lbsToKg } from '@/utils/units';
import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import {
  Calendar,
  ChevronRight,
  Heart,
  LogOut,
  Pencil,
  Settings,
  Utensils,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfilePage() {
  const { signOut } = useAuth();
  const router = useRouter();
  const { profile, backendUser, updateUserProfile, loading, clerkUser } = useUserProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    age: '',
    weight: '',
    height: '',
  });
  const [saving, setSaving] = useState(false);
  const showImperial = backendUser?.show_imperial ?? false;

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

  const handleEditPress = () => {
    if (!backendUser) return;
    const useImperial = backendUser.show_imperial;

    setEditedData({
      age: backendUser.age?.toString() || '',
      weight: backendUser.weight
        ? useImperial
          ? kgToLbs(backendUser.weight).toString()
          : backendUser.weight.toString()
        : '',
      height: backendUser.height
        ? useImperial
          ? cmToInches(backendUser.height).toString()
          : backendUser.height.toString()
        : '',
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedData({ age: '', weight: '', height: '' });
  };

  const handleSaveChanges = async () => {
    if (!backendUser) return;

    setSaving(true);
    try {
      const updates: UserUpdate = {};

      if (editedData.age && editedData.age !== backendUser.age?.toString()) {
        const age = parseInt(editedData.age, 10);
        if (!Number.isNaN(age)) {
          updates.age = age;
        }
      }

      if (editedData.weight) {
        const enteredWeight = parseFloat(editedData.weight);
        if (!Number.isNaN(enteredWeight)) {
          const weightKg = showImperial ? lbsToKg(enteredWeight) : enteredWeight;
          if (Math.abs(weightKg - (backendUser.weight || 0)) > 0.1) {
            updates.weight = weightKg;
          }
        }
      }

      if (editedData.height) {
        const enteredHeight = parseFloat(editedData.height);
        if (!Number.isNaN(enteredHeight)) {
          const heightCm = showImperial ? inchesToCm(enteredHeight) : enteredHeight;
          if (Math.abs(heightCm - (backendUser.height || 0)) > 0.1) {
            updates.height = heightCm;
          }
        }
      }

      if (Object.keys(updates).length === 0) {
        setIsEditing(false);
        return;
      }

      const success = await updateUserProfile(updates);

      if (success) {
        Alert.alert('Success', 'Profile updated successfully');
        setIsEditing(false);
      } else {
        Alert.alert('Error', 'Failed to update profile. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const menuItems = [
    {
      label: 'Allergies & Preferences',
      icon: Utensils,
      value: '',
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
      value: '',
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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Profile</Text>
            <Text style={styles.headerSubtitle}>Manage your health data</Text>
          </View>
          {!isEditing && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEditPress}
              activeOpacity={0.8}
            >
              <Pencil size={20} color={Colors.light.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Profile Card */}
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
            {isEditing ? (
              <>
                <View style={styles.statItem}>
                  <TextInput
                    style={styles.statInput}
                    value={editedData.age}
                    onChangeText={(text) => setEditedData({ ...editedData, age: text })}
                    keyboardType="numeric"
                    placeholder="Age"
                    placeholderTextColor={Colors.light.textMuted}
                  />
                  <Text style={styles.statLabel}>Age</Text>
                </View>
                <View style={styles.statItem}>
                  <TextInput
                    style={styles.statInput}
                    value={editedData.height}
                    onChangeText={(text) => setEditedData({ ...editedData, height: text })}
                    keyboardType="numeric"
                    placeholder={showImperial ? 'Height (in)' : 'Height (cm)'}
                    placeholderTextColor={Colors.light.textMuted}
                  />
                  <Text style={styles.statLabel}>
                    {showImperial ? 'Height (in)' : 'Height (cm)'}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <TextInput
                    style={styles.statInput}
                    value={editedData.weight}
                    onChangeText={(text) => setEditedData({ ...editedData, weight: text })}
                    keyboardType="numeric"
                    placeholder={showImperial ? 'Weight (lbs)' : 'Weight (kg)'}
                    placeholderTextColor={Colors.light.textMuted}
                  />
                  <Text style={styles.statLabel}>
                    {showImperial ? 'Weight (lbs)' : 'Weight (kg)'}
                  </Text>
                </View>
              </>
            ) : (
              <>
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
              </>
            )}
          </View>
        </View>

        {/* Edit Actions */}
        {isEditing && (
          <View style={styles.editActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelEdit}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSaveChanges}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color={Colors.light.surface} size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Settings & Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.menuContainer}>
            {menuItems.map((item, i) => (
              <TouchableOpacity key={i} style={styles.menuItem}>
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

        {/* Logout Button */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
            <LogOut size={20} color={Colors.light.error} />
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
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
  statInput: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    borderBottomWidth: 2,
    borderBottomColor: Colors.light.primary,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 4,
    minWidth: 60,
    textAlign: 'center',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.textMuted,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    ...Shadows.card,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.surface,
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
});
