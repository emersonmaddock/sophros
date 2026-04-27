/**
 * WeightChart — SVG line chart for the progress graph.
 *
 * X-axis is a literal date axis spanning [startDate, targetDate].
 * Every date→x mapping uses the same transform so dots, the today marker,
 * and daily axis ticks are always consistent with one another.
 *
 * Shows:
 *   - Horizontal grid lines at each y-label
 *   - Solid x and y axis lines
 *   - Daily tick marks from startDate through min(today, targetDate)
 *   - Weight history line (in-domain entries only)
 *   - Dashed target-weight reference line
 *   - Today vertical marker
 */
import type { WeightLogEntry } from '@/lib/progress/storage';
import { Colors } from '@/constants/theme';
import { kgToLbs } from '@/utils/units';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  weightHistory: WeightLogEntry[];
  targetWeightKg: number;
  showImperial: boolean;
  width: number;
  startDate: string; // YYYY-MM-DD — goal start (x-axis left edge)
  targetDate: string; // YYYY-MM-DD — goal end  (x-axis right edge)
  today: string; // YYYY-MM-DD — current date
};

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const HEIGHT = 150;
const PAD_LEFT = 52; // y-axis label space (wider to fit rotated axis title)
const PAD_RIGHT = 10;
const PAD_TOP = 10;
const PAD_BOTTOM = 4; // tiny gap; x-axis labels live outside the SVG

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/** Noon-anchored to avoid DST drift in date comparisons. */
function dateToMs(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00`).getTime();
}

function shortDate(dateStr: string): string {
  const parts = dateStr.split('-');
  return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
}

/** Returns true when dateStr is within the closed [startDate, targetDate] interval. */
function isDateInDomain(dateStr: string, start: string, end: string): boolean {
  return dateStr >= start && dateStr <= end;
}

/**
 * Returns every YYYY-MM-DD date string from startDate through endDate inclusive.
 * Uses local-date arithmetic so the result matches displayed dates on the device.
 */
function buildDailyAxisDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  // Work with UTC-noon timestamps so incrementing by 86400s always advances one day.
  const startMs = dateToMs(startDate);
  const endMs = dateToMs(endDate);
  const DAY_MS = 24 * 60 * 60 * 1000;
  for (let ms = startMs; ms <= endMs; ms += DAY_MS) {
    const d = new Date(ms);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${day}`);
  }
  return dates;
}

/** Smallest "nice" step (1, 2, 5, 10, …) ≥ roughStep. */
function niceStep(roughStep: number): number {
  const mag = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const norm = roughStep / mag;
  if (norm <= 1) return mag;
  if (norm <= 2) return 2 * mag;
  if (norm <= 5) return 5 * mag;
  return 10 * mag;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WeightChart({
  weightHistory,
  targetWeightKg,
  showImperial,
  width,
  startDate,
  targetDate,
  today,
}: Props) {
  const chartW = width - PAD_LEFT - PAD_RIGHT;
  const chartH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  // --- Stage 1: x-domain metadata (literal goal span) ----------------------
  const startMs = dateToMs(startDate);
  const targetMs = dateToMs(targetDate);
  const spanMs = targetMs - startMs || 1; // guard against same-day goals

  // Small inset so startDate doesn't sit flush against the y-axis.
  const X_INSET = 10;
  const toX = (dateStr: string) => {
    const ratio = (dateToMs(dateStr) - startMs) / spanMs;
    return PAD_LEFT + X_INSET + Math.max(0, Math.min(1, ratio)) * (chartW - 2 * X_INSET);
  };

  const todayInDomain = isDateInDomain(today, startDate, targetDate);
  const todayX = toX(today); // only used when todayInDomain

  // --- Stage 2: daily axis tick dates (startDate → min(today, targetDate)) -
  const axisEndDate = today <= targetDate ? today : targetDate;
  const dailyDates = useMemo(
    () => buildDailyAxisDates(startDate, axisEndDate),
    [startDate, axisEndDate]
  );

  // --- Stage 3: visible chart points filtered to [startDate, targetDate] ---
  const { points, targetY, yLabels } = useMemo(() => {
    const visibleHistory = weightHistory.filter((e) =>
      isDateInDomain(e.date, startDate, targetDate)
    );

    // Work entirely in display units so gridlines, data dots, and the target
    // line all share the same coordinate space with no rounding mismatch.
    const toDisplay = (kg: number) => (showImperial ? kgToLbs(kg) : kg);

    // Y-range is based only on visible data + target references.
    const allValues = [
      ...visibleHistory.map((e) => toDisplay(e.weightKg)),
      toDisplay(targetWeightKg),
    ];
    const dataMin = Math.min(...allValues);
    const dataMax = Math.max(...allValues);
    const dataRange = dataMax - dataMin || 1;

    // Snap axis bounds to nice step multiples with one full step of margin.
    const step = niceStep(dataRange / 3);
    const lo = Math.floor(dataMin / step) * step - step;
    const hi = Math.ceil(dataMax / step) * step + step;
    const span = hi - lo;

    const toY = (displayVal: number) => PAD_TOP + chartH * (1 - (displayVal - lo) / span);

    const pts = visibleHistory.map((e) => ({
      x: toX(e.date),
      y: toY(toDisplay(e.weightKg)),
      kg: e.weightKg,
      date: e.date,
    }));

    const tY = toY(toDisplay(targetWeightKg));

    const labels: { val: number; y: number }[] = [];
    for (let v = lo; v <= hi + step * 0.001; v += step) {
      labels.push({ val: v, y: toY(v) });
    }

    return { points: pts, targetY: tY, yLabels: labels };
    // toX is a stable function of startDate, targetDate, and chartW — all already in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    weightHistory,
    targetWeightKg,
    showImperial,
    chartW,
    chartH,
    startDate,
    targetDate,
  ]);

  const fmtWeight = (displayVal: number) =>
    showImperial ? `${Math.round(displayVal)}` : `${displayVal.toFixed(1)}`;

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  // Today ring only if the user actually logged weight on today's date.
  const todayEntry = todayInDomain ? (points.find((p) => p.date === today) ?? null) : null;

  const axisBottom = PAD_TOP + chartH;

  // Avoid today label overlapping the start/end edge labels (within 36 px).
  const todayLabelVisible =
    todayInDomain && todayX > PAD_LEFT + 36 && todayX < PAD_LEFT + chartW - 36;

  return (
    <View style={styles.container}>
      <View style={{ height: HEIGHT + 44, position: 'relative' }}>
        <Svg width={width} height={HEIGHT}>
          {/* Horizontal grid lines */}
          {yLabels.map((label, i) => (
            <Line
              key={`grid-${i}`}
              x1={PAD_LEFT}
              y1={label.y}
              x2={PAD_LEFT + chartW}
              y2={label.y}
              stroke="#E5E7EB"
              strokeWidth={1}
            />
          ))}

          {/* Solid y-axis */}
          <Line
            x1={PAD_LEFT}
            y1={PAD_TOP}
            x2={PAD_LEFT}
            y2={axisBottom}
            stroke="#9CA3AF"
            strokeWidth={1.5}
          />

          {/* Solid x-axis */}
          <Line
            x1={PAD_LEFT}
            y1={axisBottom}
            x2={PAD_LEFT + chartW}
            y2={axisBottom}
            stroke="#9CA3AF"
            strokeWidth={1.5}
          />

          {/* Y-axis label — rotated, centered alongside the axis */}
          <SvgText
            x={12}
            y={PAD_TOP + chartH / 2}
            textAnchor="middle"
            transform={`rotate(-90, 12, ${PAD_TOP + chartH / 2})`}
            fontSize={10}
            fontWeight="700"
            fill="#6B7280"
          >
            {showImperial ? 'Weight (lbs)' : 'Weight (kg)'}
          </SvgText>

          {/* Daily tick marks — one per logged day from startDate → min(today, targetDate).
              startDate and today get taller, more opaque ticks for visibility. */}
          {dailyDates.map((d) => {
            const x = toX(d);
            const isToday = d === today;
            const isStart = d === startDate;
            const prominent = isToday || isStart;
            return (
              <Line
                key={`tick-${d}`}
                x1={x}
                y1={axisBottom}
                x2={x}
                y2={axisBottom + (prominent ? 5 : 3)}
                stroke={isToday ? Colors.light.primary : '#9CA3AF'}
                strokeWidth={prominent ? 1.5 : 1}
                opacity={isToday ? 0.8 : isStart ? 0.7 : 0.4}
              />
            );
          })}

          {/* Target reference line */}
          <Line
            x1={PAD_LEFT}
            y1={targetY}
            x2={PAD_LEFT + chartW}
            y2={targetY}
            stroke={Colors.light.secondary}
            strokeWidth={1.5}
            strokeDasharray="4,3"
          />

          {/* Today vertical marker */}
          {todayInDomain && (
            <Line
              x1={todayX}
              y1={PAD_TOP}
              x2={todayX}
              y2={axisBottom}
              stroke={Colors.light.primary}
              strokeWidth={1}
              strokeDasharray="3,3"
              opacity={0.5}
            />
          )}

          {/* Weight history line — in-domain points only */}
          {points.length >= 2 && (
            <Polyline
              points={polylinePoints}
              fill="none"
              stroke={Colors.light.primary}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data point dots — small filled dot for every logged entry, including today */}
          {points.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={3} fill={Colors.light.primary} />
          ))}

          {/* Today ring — only when the user has NOT yet logged today.
              Floats at the last known weight's y-position as a prompt to log. */}
          {todayInDomain && !todayEntry && points.length > 0 && (
            <Circle
              cx={todayX}
              cy={points[points.length - 1].y}
              r={3}
              fill={Colors.light.surface}
              stroke={Colors.light.primary}
              strokeWidth={2}
              opacity={0.5}
            />
          )}
        </Svg>

        {/* Y-axis labels */}
        {yLabels.map((label, i) => (
          <Text key={i} style={[styles.yLabel, { top: label.y - 7 }]} numberOfLines={1}>
            {fmtWeight(label.val)}
          </Text>
        ))}

        {/* X-axis labels: start (left), today (proportional), target date (right) */}
        <Text style={[styles.xLabel, { left: toX(startDate) - 16 }]} numberOfLines={1}>
          {shortDate(startDate)}
        </Text>

        {todayLabelVisible && (
          <Text
            style={[styles.xLabel, styles.xLabelToday, { left: todayX - 20, width: 40 }]}
            numberOfLines={1}
          >
            Today
          </Text>
        )}

        <Text style={[styles.xLabel, { left: toX(targetDate) - 16 }]} numberOfLines={1}>
          {shortDate(targetDate)}
        </Text>

        {/* X-axis title — centered below the date labels */}
        <Text style={styles.xAxisTitle}>Time</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  yLabel: {
    position: 'absolute',
    left: 0,
    fontSize: 10,
    color: Colors.light.textMuted,
    width: PAD_LEFT - 3,
    textAlign: 'right',
  },
  xLabel: {
    position: 'absolute',
    bottom: 26,
    fontSize: 10,
    color: Colors.light.textMuted,
    width: 32,
    textAlign: 'center',
  },
  xLabelToday: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  xAxisTitle: {
    position: 'absolute',
    bottom: 16,
    left: PAD_LEFT,
    right: PAD_RIGHT,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
  },
});
