import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import { useOnboarding } from '@/contexts/onboarding-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AgeScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const { data, updateData } = useOnboarding();
  const [age, setAge] = useState(data.biologicalProfile.age?.toString() || '');

  const handleContinue = () => {
    const ageNum = parseInt(age, 10);
    if (!isNaN(ageNum) && ageNum > 0 && ageNum < 150) {
      updateData({
        biologicalProfile: {
          ...data.biologicalProfile,
          age: ageNum,
        },
      });
      router.push('/onboarding/biological-profile-2');
    }
  };

  const isValid =
    age.length > 0 && !isNaN(parseInt(age, 10)) && parseInt(age, 10) > 0 && parseInt(age, 10) < 150;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedView style={styles.container}>
          <View style={styles.content}>
            <ThemedText style={styles.title}>Input your Age</ThemedText>

            <View style={styles.inputContainer}>
              <InputField
                label="Age"
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
                placeholder="Enter your age"
                autoFocus
              />
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <Button title="Continue" onPress={handleContinue} disabled={!isValid} fullWidth />
          </View>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 40,
  },
  inputContainer: {
    marginTop: 20,
  },
  buttonContainer: {
    gap: 12,
  },
});
