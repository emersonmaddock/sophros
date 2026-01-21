import { Colors, Layout, Shadows } from '@/constants/theme';
import { Calendar, ChevronRight, Heart, Settings, Utensils } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfilePage() {
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.headerSubtitle}>Manage your health data</Text>
        </View>

        {/* Profile Card */}
        <TouchableOpacity style={styles.profileCard} activeOpacity={0.9}>
          <View style={styles.profileInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>A</Text>
            </View>
            <View>
              <Text style={styles.profileName}>Alex Martinez</Text>
              <Text style={styles.profileEmail}>alex.martinez@email.com</Text>
              <Text style={styles.activityBadge}>Active Lifestyle</Text>
            </View>
          </View>
          <View style={styles.statsGrid}>
            {[
              { label: 'Age', value: '28' },
              { label: 'Height', value: '5\'10"' },
              { label: 'Weight', value: '165 lbs' },
            ].map((stat, i) => (
              <View key={i} style={styles.statItem}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>

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
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
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
  activityBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.primary,
    backgroundColor: `${Colors.light.primary}15`,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
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
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    padding: 20,
    ...Shadows.card,
  },
  microList: {
    // Top border removed as it's the only thing now
  },
  microListLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.light.text,
  },
  microListValue: {
    fontSize: 13,
    color: Colors.light.textMuted,
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
});
