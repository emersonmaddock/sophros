/**
 * ProgressCard — the top-section card on the Progress tab.
 *
 * Renders one of three states:
 *   1. missingGoalData — compact setup card routing to Profile/Settings
 *   2. goalComplete — completed-goal summary with CTA to update goal
 *   3. active goal — weight chart + confidence indicator
 *
 * Log-entry actions (weight) are surfaced inline and call `onLogged()` after
 * a save so the parent can trigger a data reload.
 */
import { WeightChart } from '@/components/WeightChart';
import { WeightLogForm } from '@/components/WeightLogForm';
import { Colors, Layout, Shadows } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import type { ProgressSnapshot } from '@/lib/progress/compute';
import { confidenceExplainerText, confidenceLevelLabel } from '@/lib/progress/compute';
import { localDateStr } from '@/lib/progress/storage';
import { kgToLbs } from '@/utils/units';
import { useRouter } from 'expo-router';
import { ChevronRight, Settings, TrendingUp } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  snapshot: ProgressSnapshot;
  showImperial: boolean;
  onLogged: () => void;
};

// ---------------------------------------------------------------------------
// Setup card (missing goal data)
// ---------------------------------------------------------------------------

function GoalSetupCard() {
  const router = useRouter();
  return (
    <View style={styles.card}>
      <View style={styles.setupRow}>
        <TrendingUp size={20} color={Colors.light.primary} />
        <Text style={styles.setupTitle}>Set a goal to track progress</Text>
      </View>
      <Text style={styles.setupBody}>
        Add a target weight and target date in your profile to unlock the progress graph.
      </Text>
      <TouchableOpacity
        style={styles.ctaButton}
        onPress={() => router.push('/profile/edit')}
        activeOpacity={0.85}
      >
        <Settings size={15} color="#FFF" />
        <Text style={styles.ctaButtonText}>Go to Profile</Text>
        <ChevronRight size={15} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Completed goal card
// ---------------------------------------------------------------------------

function CompletedGoalCard({
  snapshot,
  showImperial,
}: {
  snapshot: ProgressSnapshot;
  showImperial: boolean;
}) {
  const router = useRouter();
  const archived = snapshot.archivedGoal!;
  const fmt = (kg: number) =>
    showImperial ? `${kgToLbs(kg).toFixed(1)} lbs` : `${kg.toFixed(1)} kg`;

  const changeKg = archived.weightChangeKg;
  const changeStr =
    changeKg !== null
      ? changeKg < 0
        ? `${fmt(Math.abs(changeKg))} lost`
        : changeKg > 0
          ? `${fmt(changeKg)} gained`
          : 'No change'
      : '—';

  const startDate = formatDate(archived.goalSnapshot.startDate);
  const endDate = formatDate(archived.endDate);

  return (
    <View style={styles.card}>
      <View style={styles.completedHeader}>
        <Text style={styles.completedBadge}>Goal complete</Text>
        <Text style={styles.completedPeriod}>
          {startDate} → {endDate}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <StatBox label="Started" value={fmt(archived.goalSnapshot.startWeightKg)} />
        <StatBox label="Result" value={changeStr} highlight />
        <StatBox label="Target" value={fmt(archived.goalSnapshot.targetWeightKg)} />
      </View>

      <TouchableOpacity
        style={styles.ctaButton}
        onPress={() => router.push('/profile/edit')}
        activeOpacity={0.85}
      >
        <Settings size={15} color="#FFF" />
        <Text style={styles.ctaButtonText}>Set a new goal</Text>
        <ChevronRight size={15} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Active goal card
// ---------------------------------------------------------------------------

function ActiveGoalCard({ snapshot, showImperial, onLogged }: Props) {
  const now = useNow();
  const today = localDateStr(now);
  const { width } = useWindowDimensions();
  const chartWidth = width - 40 - 32; // screen padding + card padding
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [showConfExplainer, setShowConfExplainer] = useState(false);

  const confLevel = snapshot.confidenceLevel;
  const confBadgeBg =
    confLevel === 'high' ? '#DCFCE7' : confLevel === 'medium' ? '#FEF3C7' : '#FEE2E2';
  const confBadgeText =
    confLevel === 'high'
      ? Colors.light.success
      : confLevel === 'medium'
        ? '#D97706'
        : Colors.light.error;

  const goalModeLabel =
    snapshot.goalMode === 'lose' ? 'Weight loss' : 'Weight gain';

  const totalNeeded = Math.abs(snapshot.targetWeightKg - snapshot.startWeightKg);
  const progressBadgeLabel = (() => {
    if (totalNeeded < 0.01) return 'At target';
    const progress = Math.abs(snapshot.latestWeightKg - snapshot.startWeightKg);
    const pct = Math.min(100, Math.round((progress / totalNeeded) * 100));
    return `${pct}% to goal`;
  })();

  return (
    <View style={styles.card}>
      {/* Badge row: goal mode + confidence + progress to goal */}
      <View style={styles.badgeRow}>
        <View style={styles.goalModeBadge}>
          <TrendingUp size={13} color={Colors.light.primary} />
          <Text style={styles.goalModeText} numberOfLines={1}>
            {goalModeLabel}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.goalModeBadge, { backgroundColor: confBadgeBg }]}
          onPress={() => setShowConfExplainer((v) => !v)}
          activeOpacity={0.75}
        >
          <Text style={[styles.goalModeText, { color: confBadgeText }]} numberOfLines={1}>
            {confidenceLevelLabel(confLevel)}
          </Text>
        </TouchableOpacity>
        <View style={styles.goalModeBadge}>
          <Text style={styles.goalModeText} numberOfLines={1}>
            {progressBadgeLabel}
          </Text>
        </View>
      </View>

      {/* Confidence explainer — shown on badge tap */}
      {showConfExplainer && (
        <Text style={styles.confExplainerText}>{confidenceExplainerText(confLevel)}</Text>
      )}

      {/* Chart */}
      <View style={styles.chartContainer}>
        <WeightChart
          weightHistory={snapshot.weightHistory}
          targetWeightKg={snapshot.targetWeightKg}
          showImperial={showImperial}
          width={chartWidth}
          startDate={snapshot.startDate}
          targetDate={snapshot.targetDate}
          today={today}
        />
      </View>

      {/* Log weight action */}
      <View style={styles.logActionsRow}>
        <TouchableOpacity
          style={styles.logActionButton}
          onPress={() => setShowWeightForm((v) => !v)}
          activeOpacity={0.8}
        >
          <Text style={styles.logActionText}>{showWeightForm ? 'Cancel' : 'Log weight'}</Text>
        </TouchableOpacity>
      </View>

      {showWeightForm && (
        <WeightLogForm
          showImperial={showImperial}
          onLogged={() => {
            setShowWeightForm(false);
            onLogged();
          }}
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Root export
// ---------------------------------------------------------------------------

export function ProgressCard({ snapshot, showImperial, onLogged }: Props) {
  if (snapshot.missingGoalData) return <GoalSetupCard />;
  if (snapshot.goalComplete && snapshot.archivedGoal) {
    return <CompletedGoalCard snapshot={snapshot} showImperial={showImperial} />;
  }
  return <ActiveGoalCard snapshot={snapshot} showImperial={showImperial} onLogged={onLogged} />;
}

// ---------------------------------------------------------------------------
// Small helper sub-components
// ---------------------------------------------------------------------------

function StatBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${months[m - 1]} ${d}, ${y}`;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    padding: 16,
    gap: 12,
    ...Shadows.card,
  },
  // Setup card
  setupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setupTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
  },
  setupBody: {
    fontSize: 13,
    color: Colors.light.textMuted,
    lineHeight: 19,
  },
  // Completed card
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completedBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.success,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  completedPeriod: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.light.background,
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
  },
  statValueHighlight: {
    color: Colors.light.primary,
  },
  // Active goal card
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  goalModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: `${Colors.light.primary}18`,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    flexShrink: 1,
  },
  goalModeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.primary,
    flexShrink: 1,
  },
  confExplainerText: {
    fontSize: 12,
    color: Colors.light.textMuted,
    lineHeight: 17,
    marginTop: -4,
  },
  chartContainer: {
    marginHorizontal: -4,
  },
  logActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: -8,
  },
  logActionButton: {
    flex: 1,
    backgroundColor: Colors.light.primary,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  logActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
  },
  // CTA button (shared)
  ctaButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  ctaButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    flex: 1,
    textAlign: 'center',
  },
});
