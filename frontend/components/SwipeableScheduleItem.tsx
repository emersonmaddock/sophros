import { Colors } from '@/constants/theme';
import { Check, X } from 'lucide-react-native';
import React, { useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

type Props = {
  children: React.ReactNode;
  /** True when the item is in the past and hasn't been confirmed yet */
  needsConfirmation: boolean;
  isCompleted: boolean;
  onConfirmDone: () => void;
  onConfirmMissed: () => void;
};

type Progress = Animated.AnimatedInterpolation<number>;

function renderLeft(progress: Progress) {
  const opacity = progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.7, 1],
    extrapolate: 'clamp',
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0.6, 0.95, 1],
    extrapolate: 'clamp',
  });
  return (
    <View style={styles.leftAction}>
      <Animated.View style={[styles.actionContent, { opacity, transform: [{ scale }] }]}>
        <Check size={22} color="#FFF" strokeWidth={3} />
        <Text style={styles.actionLabel}>Done</Text>
      </Animated.View>
    </View>
  );
}

function renderRight(progress: Progress) {
  const opacity = progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.7, 1],
    extrapolate: 'clamp',
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0.6, 0.95, 1],
    extrapolate: 'clamp',
  });
  return (
    <View style={styles.rightAction}>
      <Animated.View style={[styles.actionContent, { opacity, transform: [{ scale }] }]}>
        <X size={22} color="#FFF" strokeWidth={3} />
        <Text style={styles.actionLabel}>Missed</Text>
      </Animated.View>
    </View>
  );
}

export function SwipeableScheduleItem({
  children,
  needsConfirmation,
  isCompleted,
  onConfirmDone,
  onConfirmMissed,
}: Props) {
  const swipeRef = useRef<Swipeable>(null);

  if (!needsConfirmation || isCompleted) {
    return <>{children}</>;
  }

  const handleOpen = (direction: 'left' | 'right') => {
    swipeRef.current?.close();
    if (direction === 'left') {
      onConfirmDone();
    } else {
      onConfirmMissed();
    }
  };

  return (
    <Swipeable
      ref={swipeRef}
      friction={2}
      leftThreshold={48}
      rightThreshold={48}
      overshootLeft={false}
      overshootRight={false}
      containerStyle={styles.container}
      childrenContainerStyle={styles.childrenContainer}
      renderLeftActions={renderLeft}
      renderRightActions={renderRight}
      onSwipeableOpen={handleOpen}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  childrenContainer: {
    flex: 1,
  },
  leftAction: {
    backgroundColor: Colors.light.success,
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    borderRadius: 16,
  },
  rightAction: {
    backgroundColor: Colors.light.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    borderRadius: 16,
  },
  actionContent: {
    alignItems: 'center',
    gap: 4,
  },
  actionLabel: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
