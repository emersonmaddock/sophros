import { SelectionCard } from '@/components/SelectionCard';
import { PREGNANCY_STATUS_OPTIONS } from '@/constants/onboarding';
import { Colors, Shadows } from '@/constants/theme';
import { useOnboarding } from '@/hooks/useOnboarding';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Step3Screen() {
    const { data, updateField, isSection3Complete } = useOnboarding();

    const canContinue = isSection3Complete();

    return (
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: '75%' }]} />
                    </View>
                    <Text style={styles.progressText}>Step 3 of 4</Text>
                </View>

                <View style={styles.header}>
                    <Text style={styles.title}>Pregnancy Status</Text>
                    <Text style={styles.subtitle}>This helps us provide accurate nutritional recommendations</Text>
                </View>

                <View style={styles.content}>
                    <View style={styles.selectionList}>
                        {PREGNANCY_STATUS_OPTIONS.map((option) => (
                            <SelectionCard
                                key={option.value}
                                title={option.label}
                                description={option.description}
                                selected={data.pregnancyStatus === option.value}
                                onPress={() => updateField('pregnancyStatus', option.value)}
                            />
                        ))}
                    </View>
                </View>
            </ScrollView>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
                    onPress={() => router.push('/onboarding/step4')}
                    disabled={!canContinue}
                    activeOpacity={0.8}
                >
                    <Text style={styles.continueButtonText}>Continue</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    progressContainer: {
        marginBottom: 24,
    },
    progressBar: {
        height: 4,
        backgroundColor: Colors.light.surface,
        borderRadius: 2,
        marginBottom: 8,
    },
    progressFill: {
        height: 4,
        backgroundColor: Colors.light.primary,
        borderRadius: 2,
    },
    progressText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.light.textMuted,
    },
    header: {
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.light.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.light.textMuted,
        lineHeight: 22,
    },
    content: {
        gap: 24,
    },
    selectionList: {
        gap: 12,
    },
    buttonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: 30,
        backgroundColor: Colors.light.background,
        borderTopWidth: 1,
        borderTopColor: Colors.light.background,
        ...Shadows.card,
    },
    continueButton: {
        backgroundColor: Colors.light.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        ...Shadows.card,
    },
    continueButtonDisabled: {
        backgroundColor: Colors.light.textMuted,
        opacity: 0.5,
    },
    continueButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.light.surface,
    },
});
