import { Colors, Layout, Shadows } from '@/constants/theme';
import { useAuth } from '@clerk/clerk-expo';
import { Redirect, router } from 'expo-router';
import { Activity, Heart, TrendingUp } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const { isSignedIn } = useAuth();

  if (!isSignedIn) {
    return <Redirect href={'/(auth)/sign-in'} />;
  }

  const benefits = [
    {
      icon: Heart,
      title: 'Personalized Nutrition',
      description: 'Get meal plans tailored to your unique profile and goals',
    },
    {
      icon: Activity,
      title: 'Track Your Progress',
      description: 'Monitor your health metrics and see real improvements',
    },
    {
      icon: TrendingUp,
      title: 'Achieve Your Goals',
      description: 'Stay on track with smart recommendations and insights',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.logoText}>Welcome to Sophros!</Text>
              <Text style={styles.subtitle}>
                Let&apos;s set up your personalized health profile to get you started on your
                wellness journey.
              </Text>
            </View>

            <View style={styles.benefitsContainer}>
              {benefits.map((benefit, index) => (
                <View key={index} style={styles.benefitCard}>
                  <View style={styles.iconBox}>
                    <benefit.icon size={24} color={Colors.light.primary} />
                  </View>
                  <View style={styles.benefitContent}>
                    <Text style={styles.benefitTitle}>{benefit.title}</Text>
                    <Text style={styles.benefitDescription}>{benefit.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => router.push('/onboarding/step1')}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.textMuted,
    lineHeight: 24,
  },
  benefitsContainer: {
    gap: 16,
  },
  benefitCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    padding: 20,
    flexDirection: 'row',
    gap: 16,
    ...Shadows.card,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.light.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    color: Colors.light.textMuted,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
    marginTop: 24,
  },
  continueButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    ...Shadows.card,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.surface,
  },
});
