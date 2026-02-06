import { AlternativesModal } from '@/components/AlternativesModal';
import { EditItemModal } from '@/components/EditItemModal';
import { ScheduleItemCard } from '@/components/ScheduleItemCard';
import { Colors, Layout } from '@/constants/theme';
import type { DaySchedule, ItemType, UserPreferences, WeeklyScheduleItem } from '@/types/schedule';
import { generateAlternatives, generateWeekPlan } from '@/utils/scheduleGenerator';
import { useRouter } from 'expo-router';
import { ArrowLeft, Sparkles } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WeekPlanningScreen() {
    const router = useRouter();
    const [weekPlan, setWeekPlan] = useState<DaySchedule[]>([]);
    const [selectedDayIndex, setSelectedDayIndex] = useState(0);
    const [swapModalVisible, setSwapModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState<WeeklyScheduleItem | null>(null);
    const [alternatives, setAlternatives] = useState<WeeklyScheduleItem[]>([]);
    const [editMode, setEditMode] = useState<'edit' | 'add'>('edit');
    const [addItemType, setAddItemType] = useState<ItemType>('meal');

    useEffect(() => {
        // Generate initial week plan
        const mockPreferences: UserPreferences = {
            wakeUpTime: '7:00 AM',
            sleepTime: '10:30 PM',
            mealsPerDay: 4,
            workoutsPerWeek: 3,
            calorieTarget: 2000,
            dietaryRestrictions: [],
            preferredWorkoutTypes: ['HIIT', 'Strength Training', 'Yoga'],
        };

        const plan = generateWeekPlan(mockPreferences);
        setWeekPlan(plan.days);
    }, []);

    const handleSwap = (item: WeeklyScheduleItem) => {
        setSelectedItem(item);
        const alts = generateAlternatives(item);
        setAlternatives(alts);
        setSwapModalVisible(true);
    };

    const handleSelectAlternative = (alternative: WeeklyScheduleItem) => {
        if (!selectedItem) return;

        setWeekPlan((prevPlan) =>
            prevPlan.map((day, dayIdx) => {
                if (dayIdx === selectedDayIndex) {
                    return {
                        ...day,
                        items: day.items.map((item) =>
                            item.id === selectedItem.id ? { ...alternative, id: item.id } : item
                        ),
                    };
                }
                return day;
            })
        );
    };

    const handleEdit = (item: WeeklyScheduleItem) => {
        setSelectedItem(item);
        setEditMode('edit');
        setEditModalVisible(true);
    };

    const handleSaveEdit = (updatedItem: WeeklyScheduleItem) => {
        setWeekPlan((prevPlan) =>
            prevPlan.map((day, dayIdx) => {
                if (dayIdx === selectedDayIndex) {
                    if (editMode === 'add') {
                        // Add new item and sort by time
                        return {
                            ...day,
                            items: [...day.items, updatedItem].sort((a, b) => {
                                const timeA = convertTimeToMinutes(a.time);
                                const timeB = convertTimeToMinutes(b.time);
                                return timeA - timeB;
                            }),
                        };
                    } else {
                        // Edit existing item
                        return {
                            ...day,
                            items: day.items.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
                        };
                    }
                }
                return day;
            })
        );
    };

    const handleDelete = (id: string) => {
        Alert.alert('Delete Item', 'Are you sure you want to delete this item?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                    setWeekPlan((prevPlan) =>
                        prevPlan.map((day, dayIdx) => {
                            if (dayIdx === selectedDayIndex) {
                                return {
                                    ...day,
                                    items: day.items.filter((item) => item.id !== id),
                                };
                            }
                            return day;
                        })
                    );
                },
            },
        ]);
    };

    const handleAddItem = (type: ItemType) => {
        setAddItemType(type);
        setSelectedItem(null);
        setEditMode('add');
        setEditModalVisible(true);
    };

    const convertTimeToMinutes = (time: string): number => {
        const [timePart, period] = time.split(' ');
        const [hours, minutes] = timePart.split(':').map(Number);
        let totalMinutes = (hours % 12) * 60 + minutes;
        if (period === 'PM') totalMinutes += 12 * 60;
        return totalMinutes;
    };

    const getDayName = (dayOfWeek: number): string => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[dayOfWeek];
    };

    const formatDate = (date: Date): string => {
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const day = date.getDate();
        return `${month} ${day}`;
    };

    if (weekPlan.length === 0) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <Sparkles size={48} color={Colors.light.primary} />
                    <Text style={styles.loadingText}>Generating your week plan...</Text>
                </View>
            </SafeAreaView>
        );
    }

    const selectedDay = weekPlan[selectedDayIndex];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={Colors.light.text} />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Week Planning</Text>
                    <Text style={styles.headerSubtitle}>Customize your schedule</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Day Selector */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.daySelector}
                contentContainerStyle={styles.daySelectorContent}
            >
                {weekPlan.map((day, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[styles.dayCard, selectedDayIndex === index && styles.activeDayCard]}
                        onPress={() => setSelectedDayIndex(index)}
                    >
                        <Text style={[styles.dayName, selectedDayIndex === index && styles.activeDayName]}>
                            {getDayName(day.dayOfWeek)}
                        </Text>
                        <Text style={[styles.dayDate, selectedDayIndex === index && styles.activeDayDate]}>
                            {formatDate(day.date)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Schedule Items */}
            <ScrollView style={styles.scheduleContainer} contentContainerStyle={styles.scheduleContent}>
                <View style={styles.scheduleHeader}>
                    <Text style={styles.scheduleTitle}>{getDayName(selectedDay.dayOfWeek)}&apos;s Schedule</Text>
                    <Text style={styles.itemCount}>{selectedDay.items.length} items</Text>
                </View>

                {selectedDay.items.map((item) => (
                    <ScheduleItemCard
                        key={item.id}
                        item={item}
                        onSwap={handleSwap}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                ))}

                {/* Add Item Buttons */}
                <View style={styles.addSection}>
                    <Text style={styles.addSectionTitle}>Add Item</Text>
                    <View style={styles.addButtons}>
                        <TouchableOpacity
                            style={[styles.addButton, { borderColor: Colors.light.secondary }]}
                            onPress={() => handleAddItem('meal')}
                        >
                            <Text style={styles.addButtonEmoji}>🍽️</Text>
                            <Text style={styles.addButtonText}>Meal</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.addButton, { borderColor: Colors.light.primary }]}
                            onPress={() => handleAddItem('workout')}
                        >
                            <Text style={styles.addButtonEmoji}>💪</Text>
                            <Text style={styles.addButtonText}>Workout</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.addButton, { borderColor: Colors.light.charts.carbs }]}
                            onPress={() => handleAddItem('sleep')}
                        >
                            <Text style={styles.addButtonEmoji}>😴</Text>
                            <Text style={styles.addButtonText}>Sleep</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Modals */}
            <AlternativesModal
                visible={swapModalVisible}
                onClose={() => setSwapModalVisible(false)}
                item={selectedItem}
                alternatives={alternatives}
                onSelect={handleSelectAlternative}
            />

            <EditItemModal
                visible={editModalVisible}
                onClose={() => setEditModalVisible(false)}
                item={selectedItem}
                onSave={handleSaveEdit}
                mode={editMode}
                itemType={addItemType}
            />
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
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        color: Colors.light.textMuted,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.light.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerContent: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.light.text,
    },
    headerSubtitle: {
        fontSize: 13,
        color: Colors.light.textMuted,
    },
    daySelector: {
        maxHeight: 90,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    daySelectorContent: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        gap: 12,
    },
    dayCard: {
        minWidth: 100,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: Layout.cardRadius,
        backgroundColor: Colors.light.surface,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    activeDayCard: {
        backgroundColor: Colors.light.primary,
    },
    dayName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.text,
    },
    activeDayName: {
        color: '#FFFFFF',
    },
    dayDate: {
        fontSize: 12,
        color: Colors.light.textMuted,
    },
    activeDayDate: {
        color: 'rgba(255,255,255,0.8)',
    },
    scheduleContainer: {
        flex: 1,
    },
    scheduleContent: {
        padding: 20,
        paddingBottom: 100,
    },
    scheduleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    scheduleTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.light.text,
    },
    itemCount: {
        fontSize: 14,
        color: Colors.light.textMuted,
    },
    addSection: {
        marginTop: 24,
    },
    addSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.light.text,
        marginBottom: 12,
    },
    addButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    addButton: {
        flex: 1,
        backgroundColor: Colors.light.surface,
        borderRadius: Layout.cardRadius,
        borderWidth: 2,
        borderStyle: 'dashed',
        padding: 16,
        alignItems: 'center',
        gap: 8,
    },
    addButtonEmoji: {
        fontSize: 24,
    },
    addButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.light.text,
    },
});
