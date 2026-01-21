import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOnboarding } from '@/contexts/onboarding-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Gender } from '@/types/onboarding';
import { router } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SexSelectionScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const { data, updateData, completeOnboarding } = useOnboarding();

  const handleSelectSex = (sex: Gender) => {
    updateData({
      biologicalProfile: {
        ...data.biologicalProfile,
        gender: sex,
      },
    });
    completeOnboarding();
    router.replace('/onboarding/done');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      <ThemedView style={styles.container}>
        <TouchableOpacity
          style={[styles.circle, data.biologicalProfile.gender === 'male' && styles.circleSelected]}
          onPress={() => handleSelectSex('male')}
        >
          <ThemedText style={styles.circleText}>Male</ThemedText>
        </TouchableOpacity>

        <View style={styles.textContainer}>
          <ThemedText style={styles.title}>Choose your sex</ThemedText>
        </View>

        <TouchableOpacity
          style={[
            styles.circle,
            data.biologicalProfile.gender === 'female' && styles.circleSelected,
          ]}
          onPress={() => handleSelectSex('female')}
        >
          <ThemedText style={styles.circleText}>Female</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 40,
  },
  circle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleSelected: {
    backgroundColor: '#007AFF',
  },
  circleText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  textContainer: {
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
