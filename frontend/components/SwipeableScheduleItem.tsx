import type { Confirmation } from '@/contexts/ConfirmationsContext';
import { Colors } from '@/constants/theme';
import { Check, X } from 'lucide-react-native';
import React, { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

type Props = {
  children: React.ReactNode;
  /** Whether this item is in the past and needs the user to confirm */
  needsConfirmation: boolean;
  confirmation: Confirmation | undefined;
  onConfirmDone: () => void;
  onConfirmMissed: () => void;
};

function LeftAction() {
  return (
    <View style={styles.leftAction}>
      <Check size={24} color="#FFF" strokeWidth={3} />
      <Text style={styles.actionLabel}>Done</Text>
    </View>
  );
}

function RightAction() {
  return (
    <View style={styles.rightAction}>
      <X size={24} color="#FFF" strokeWidth={3} />
      <Text style={styles.actionLabel}>Missed</Text>
    </View>
  );
}

export function SwipeableScheduleItem({
  children,
  needsConfirmation,
  confirmation,
  onConfirmDone,
  onConfirmMissed,
}: Props) {
  const swipeRef = useRef<Swipeable>(null);

  // Items that are already confirmed or don't need confirmation are not swipeable
  if (!needsConfirmation || confirmation) {
    return <>{children}</>;
  }

  const handleOpen = (direction: 'left' | 'right') => {
    // onSwipeableOpen fires with the side that opened:
    // 'left'  = left side revealed  = user swiped RIGHT → done
    // 'right' = right side revealed = user swiped LEFT  → missed
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
      leftThreshold={60}
      rightThreshold={60}
      renderLeftActions={() => <LeftAction />}
      renderRightActions={() => <RightAction />}
      onSwipeableOpen={handleOpen}
      overshootLeft={false}
      overshootRight={false}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  leftAction: {
    flex: 1,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 20,
    borderRadius: 16,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 8,
    paddingRight: 20,
    alignSelf: 'stretch',
  },
  rightAction: {
    flex: 1,
    backgroundColor: Colors.light.error,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
    borderRadius: 16,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 20,
    alignSelf: 'stretch',
  },
  actionLabel: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    alignSelf: 'center',
  },
});
