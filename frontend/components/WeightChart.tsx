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
 *   - Maintain-mode stability band
 *   - Legend below the chart area
 */
import type { StabilityBand } from '@/lib/progress/compute';
import type { WeightLogEntry } from '@/lib/progress/storage';
import { Colors } from '@/constants/theme';
import { kgToLbs } from '@/utils/units';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  weightHistory: WeightLogEntry[];
  targetWeightKg: number;
  stabilityBand: StabilityBand | null;
  showImperial: boolean;
  width: number;
  startDate: string;   // YYYY-MM-DD — goal start (x-axis left edge)
  targetDate: string;  // YYYY-MM-DD — goal end  (x-axis right edge)
  today: string;       // YYYY-MM-DD — current date
};

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const HEIGHT = 150;
const PAD_LEFT = 38;  // y-axis label space
const PAD_RIGHT = 10;
const PAD_TOP = 8;
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
 * Maps a pre-computed timestamp to an x pixel position within the chart area.
 * Clamps to [padLeft, padLeft + chartW].
 */
function mapDateToX(
  dateMs: number,
  startMs: number,
  spanMs: number,
  chartW: number,
  padLeft: number,
): number {
  const ratio = (dateMs - startMs) / spanMs;
  return padLeft + Math.max(0, Math.min(1, ratio)) * chartW;
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
  stabilityBand,
  showImperial,
  width,
  startDate,
  targetDate,
  today,
}: Props) {
  const chartW = width - PAD_LEFT - PAD_RIGHT;
  const chartH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  // --- Stage 1: x-domain metadata (literal goal span) ----------------------
  const startMs  = dateToMs(startDate);
  const targetMs = dateToMs(targetDate);
  const spanMs   = targetMs - startMs || 1; // guard against same-day goals

  // Small inset so startDate/targetDate don't sit flush against the axis edges.
  const X_INSET = 10;
  const toX = (dateStr: string) => {
    const ratio = (dateToMs(dateStr) - startMs) / spanMs;
    return PAD_LEFT + X_INSET + Math.max(0, Math.min(1, ratio)) * (chartW - 2 * X_INSET);
  };

  const todayInDomain = isDateInDomain(today, startDate, targetDate);
  const todayX = toX(today); // only used when todayInDomain

  // --- Stage 2: daily axis tick dates (startDate → min(today, targetDate)) -
  const axisEndDate  = today <= targetDate ? today : targetDate;
  const dailyDates   = useMemo(
    () => buildDailyAxisDates(startDate, axisEndDate),
    [startDate, axisEndDate],
  );

  // --- Stage 3: visible chart points filtered to [startDate, targetDate] ---
  const { points, targetY, bandRect, yLabels } = useMemo(() => {
    const visibleHistory = weightHistory.filter((e) =>
      isDateInDomain(e.date, startDate, targetDate),
    );

    // Y-range is based only on visible data + target + band references.
    const allValues = [
      ...visibleHistory.map((e) => e.weightKg),
      targetWeightKg,
      ...(stabilityBand ? [stabilityBand.low, stabilityBand.high] : []),
    ];
    const dataMin   = Math.min(...allValues);
    const dataMax   = Math.max(...allValues);
    const dataRange = dataMax - dataMin || 1;

    // Snap axis bounds to nice step multiples with one full step of margin.
    const step = niceStep(dataRange / 3);
    const lo   = Math.floor(dataMin / step) * step - step;
    const hi   = Math.ceil(dataMax / step) * step + step;
    const span = hi - lo;

    const toY = (kg: number) => PAD_TOP + chartH * (1 - (kg - lo) / span);

    const pts = visibleHistory.map((e) => ({
      x: toX(e.date),
      y: toY(e.weightKg),
      kg: e.weightKg,
      date: e.date,
    }));

    const tY = toY(targetWeightKg);

    let band = null;
    if (stabilityBand) {
      const bHigh = toY(stabilityBand.high);
      const bLow  = toY(stabilityBand.low);
      band = { x: PAD_LEFT, y: bHigh, w: chartW, h: bLow - bHigh };
    }

    const labels: { val: number; y: number }[] = [];
    for (let v = lo; v <= hi + step * 0.001; v += step) {
      labels.push({ val: v, y: toY(v) });
    }

    return { points: pts, targetY: tY, bandRect: band, yLabels: labels };
  }, [weightHistory, targetWeightKg, stabilityBand, chartW, chartH, startDate, targetDate]);

  const fmtWeight = (kg: number) =>
    showImperial ? `${kgToLbs(kg).toFixed(0)}` : `${kg.toFixed(1)}`;
  const unit = showImperial ? 'lbs' : 'kg';

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  // Today ring only if the user actually logged weight on today's date.
  const todayEntry = todayInDomain
    ? (points.find((p) => p.date === today) ?? null)
    : null;

  const axisBottom = PAD_TOP + chartH;

  // Avoid today label overlapping the start/end edge labels (within 36 px).
  const todayLabelVisible =
    todayInDomain &&
    todayX > PAD_LEFT + 36 &&
    todayX < PAD_LEFT + chartW - 36;

  return (
    <View style={styles.container}>
      <View style={{ height: HEIGHT + 14, position: 'relative' }}>
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

          {/* Daily tick marks — one per logged day from startDate → min(today, targetDate).
              startDate and today get taller, more opaque ticks for visibility. */}
          {dailyDates.map((d) => {
            const x = toX(d);
            const isToday   = d === today;
            const isStart   = d === startDate;
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

          {/* Maintain stability band */}
          {bandRect && (
            <Rect
              x={bandRect.x}
              y={bandRect.y}
              width={bandRect.w}
              height={bandRect.h}
              fill={Colors.light.primary}
              opacity={0.1}
            />
          )}

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

          {/* Data point dots — each at its real logged date x position.
              Today's entry gets the open ring; all others get a small filled dot. */}
          {points.map((p, i) =>
            p.date === today ? null : (
              <Circle key={i} cx={p.x} cy={p.y} r={3} fill={Colors.light.primary} />
            ),
          )}

          {/* Today ring — only when the user has a log entry for today */}
          {todayEntry && (
            <Circle
              cx={todayX}
              cy={todayEntry.y}
              r={6}
              fill={Colors.light.surface}
              stroke={Colors.light.primary}
              strokeWidth={2}
            />
          )}
        </Svg>

        {/* Y-axis labels */}
        {yLabels.map((label, i) => (
          <Text key={i} style={[styles.yLabel, { top: label.y - 7 }]} numberOfLines={1}>
            {fmtWeight(label.val)}
          </Text>
        ))}

        {/* X-axis labels: start (left), today (proportional), target (right) */}
        <Text style={[styles.xLabel, { left: PAD_LEFT - 16 }]} numberOfLines={1}>
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

        <Text
          style={[styles.xLabel, { left: PAD_LEFT + chartW - 16 }]}
          numberOfLines={1}
        >
          {shortDate(targetDate)}
        </Text>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.light.primary }]} />
          <Text style={styles.legendText}>Weight ({unit})</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDash, { backgroundColor: Colors.light.secondary }]} />
          <Text style={styles.legendText}>Target</Text>
        </View>
        {todayInDomain && (
          <View style={styles.legendItem}>
            <View style={styles.legendRing} />
            <Text style={styles.legendText}>Today</Text>
          </View>
        )}
        {stabilityBand && (
          <View style={styles.legendItem}>
            <View style={[styles.legendBand, { backgroundColor: Colors.light.primary }]} />
            <Text style={styles.legendText}>Band</Text>
          </View>
        )}
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
    bottom: 0,
    fontSize: 10,
    color: Colors.light.textMuted,
    width: 32,
    textAlign: 'center',
  },
  xLabelToday: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    gap: 12,
    paddingLeft: PAD_LEFT,
    marginTop: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendRing: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.light.primary,
    backgroundColor: 'transparent',
  },
  legendDash: {
    width: 12,
    height: 2,
    borderRadius: 1,
  },
  legendBand: {
    width: 12,
    height: 8,
    borderRadius: 2,
    opacity: 0.2,
  },
  legendText: {
    fontSize: 10,
    color: Colors.light.textMuted,
  },
});
