/**
 * ProgressCard — the top-section card on the Progress tab.
 *
 * Renders one of three states:
 *   1. missingGoalData — compact setup card routing to Profile/Settings
 *   2. goalComplete — completed-goal summary with CTA to update goal
 *   3. active goal — weight chart + confidence indicator + optional body-fat stat
 *
 * Log-entry actions (weight, body-fat) are surfaced inline and call
 * `onLogged()` after a save so the parent can trigger a data reload.
 */
import { BodyFatLogForm } from '@/components/BodyFatLogForm';
import { WeightChart } from '@/components/WeightChart';
import { WeightLogForm } from '@/components/WeightLogForm';
import { Colors, Layout, Shadows } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import type { ProgressSnapshot } from '@/lib/progress/compute';
import {
  confidenceExplainerText,
  confidenceLevelLabel,
  weightProgressLabel,
} from '@/lib/progress/compute';
import { localDateStr } from '@/lib/progress/storage';
import { kgToLbs } from '@/utils/units';
import { useRouter } from 'expo-router';
import {
  Activity,
  ChevronRight,
  Settings,
  TrendingUp,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

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
        <StatBox
          label="Started"
          value={fmt(archived.goalSnapshot.startWeightKg)}
        />
        <StatBox label="Result" value={changeStr} highlight />
        <StatBox label="Target" value={fmt(archived.goalSnapshot.targetWeightKg)} />
      </View>

      {archived.finalBodyFatPercent !== null && (
        <Text style={styles.bfStat}>
          Final body fat: {archived.finalBodyFatPercent.toFixed(1)}%
        </Text>
      )}

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

function ActiveGoalCard({
  snapshot,
  showImperial,
  onLogged,
}: Props) {
  const now = useNow();
  const today = localDateStr(now);
  const { width } = useWindowDimensions();
  const chartWidth = width - 40 - 32; // screen padding + card padding
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [showBfForm, setShowBfForm] = useState(false);
  const [showConfExplainer, setShowConfExplainer] = useState(false);

  const progressLabel = weightProgressLabel(
    snapshot.goalMode,
    snapshot.startWeightKg,
    snapshot.latestWeightKg,
    snapshot.targetWeightKg,
    showImperial
  );

  const confLevel = snapshot.confidenceLevel;
  // Badge colours per level
  const confBadgeBg =
    confLevel === 'high' ? '#DCFCE7' : confLevel === 'medium' ? '#FEF3C7' : '#FEE2E2';
  const confBadgeText =
    confLevel === 'high'
      ? Colors.light.success
      : confLevel === 'medium'
        ? '#D97706'
        : Colors.light.error;

  const goalModeLabel =
    snapshot.goalMode === 'lose'
      ? 'Weight loss'
      : snapshot.goalMode === 'gain'
        ? 'Weight gain'
        : 'Maintain weight';

  const targetDateStr = snapshot.targetDate ? formatDate(snapshot.targetDate) : '';

  const latestBf =
    snapshot.hasBodyFatData
      ? snapshot.bodyFatHistory[snapshot.bodyFatHistory.length - 1].bodyFatPercent
      : null;

  return (
    <View style={styles.card}>
      {/* Badge row: goal mode + confidence, target date on the right */}
      <View style={styles.goalHeader}>
        <View style={styles.badgeRow}>
          <View style={styles.goalModeBadge}>
            <TrendingUp size={13} color={Colors.light.primary} />
            <Text style={styles.goalModeText}>{goalModeLabel}</Text>
          </View>
          <TouchableOpacity
            style={[styles.goalModeBadge, { backgroundColor: confBadgeBg }]}
            onPress={() => setShowConfExplainer((v) => !v)}
            activeOpacity={0.75}
          >
            <Text style={[styles.goalModeText, { color: confBadgeText }]}>
              {confidenceLevelLabel(confLevel)}
            </Text>
          </TouchableOpacity>
        </View>
        {targetDateStr ? (
          <Text style={styles.targetDateText}>Target: {targetDateStr}</Text>
        ) : null}
      </View>

      {/* Confidence explainer — shown on badge tap */}
      {showConfExplainer && (
        <Text style={styles.confExplainerText}>{confidenceExplainerText(confLevel)}</Text>
      )}

      {/* Progress label */}
      {snapshot.goalMode === 'maintain' ? (
        <Text style={styles.maintainLabel}>
          {snapshot.maintainInRange ? 'Within target range' : 'Outside target range'}
        </Text>
      ) : (
        <Text style={styles.progressLabel}>{progressLabel}</Text>
      )}

      {/* Chart */}
      <View style={styles.chartContainer}>
        <WeightChart
          weightHistory={snapshot.weightHistory}
          targetWeightKg={snapshot.targetWeightKg}
          stabilityBand={snapshot.stabilityBand}
          showImperial={showImperial}
          width={chartWidth}
          startDate={snapshot.startDate}
          targetDate={snapshot.targetDate}
          today={today}
        />
      </View>

      {/* Body fat mini-stat */}
      {latestBf !== null && (
        <View style={styles.bfRow}>
          <Activity size={13} color={Colors.light.charts.carbs} />
          <Text style={styles.bfText}>
            Body fat: {latestBf.toFixed(1)}%
            {snapshot.bodyFatHistory.length > 1
              ? ` · ${bfChangeStr(snapshot.bodyFatHistory)}`
              : ''}
          </Text>
        </View>
      )}

      {/* Log actions */}
      <View style={styles.logActionsRow}>
        <TouchableOpacity
          style={styles.logActionButton}
          onPress={() => {
            setShowWeightForm((v) => !v);
            setShowBfForm(false);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.logActionText}>
            {showWeightForm ? 'Cancel' : 'Log weight'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.logActionButton, styles.logActionButtonSecondary]}
          onPress={() => {
            setShowBfForm((v) => !v);
            setShowWeightForm(false);
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.logActionText, styles.logActionTextSecondary]}>
            {showBfForm ? 'Cancel' : 'Log body fat'}
          </Text>
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

      {showBfForm && (
        <BodyFatLogForm
          onLogged={() => {
            setShowBfForm(false);
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
  return (
    <ActiveGoalCard snapshot={snapshot} showImperial={showImperial} onLogged={onLogged} />
  );
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
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>
        {value}
      </Text>
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
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[m - 1]} ${d}, ${y}`;
}

function bfChangeStr(
  history: { bodyFatPercent: number }[]
): string {
  const first = history[0].bodyFatPercent;
  const last = history[history.length - 1].bodyFatPercent;
  const diff = last - first;
  if (Math.abs(diff) < 0.1) return 'no change';
  return diff < 0 ? `${Math.abs(diff).toFixed(1)}% decrease` : `${diff.toFixed(1)}% increase`;
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
  bfStat: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  // Active goal card
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    flexShrink: 1,
  },
  goalModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: `${Colors.light.primary}18`,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  goalModeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  targetDateText: {
    fontSize: 12,
    color: Colors.light.textMuted,
    flexShrink: 0,
  },
  confExplainerText: {
    fontSize: 12,
    color: Colors.light.textMuted,
    lineHeight: 17,
    marginTop: -4,
  },
  progressLabel: {
    fontSize: 13,
    color: Colors.light.text,
    fontWeight: '500',
  },
  maintainLabel: {
    fontSize: 13,
    color: Colors.light.text,
    fontWeight: '600',
  },
  chartContainer: {
    marginHorizontal: -4,
  },
  bfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bfText: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  logActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  logActionButton: {
    flex: 1,
    backgroundColor: Colors.light.primary,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  logActionButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.light.textMuted,
  },
  logActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
  },
  logActionTextSecondary: {
    color: Colors.light.textMuted,
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
