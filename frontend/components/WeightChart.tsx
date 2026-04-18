/**
 * WeightChart — SVG line chart for the progress graph.
 *
 * X-axis spans from goal startDate (origin) to targetDate (right edge).
 * Today's position is marked with a vertical dashed line and a highlighted
 * dot on the axis. Weight entries are placed proportionally by date.
 *
 * Shows:
 *   - Horizontal grid lines at each y-label
 *   - Solid x and y axis lines
 *   - Weight history line placed by date
 *   - Dashed target-weight reference line
 *   - Today marker (vertical dashed line + dot)
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
  startDate: string;   // YYYY-MM-DD — goal start (x-axis origin)
  targetDate: string;  // YYYY-MM-DD — goal end (x-axis right)
  today: string;       // YYYY-MM-DD — current date marker
};

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const HEIGHT = 150;
const PAD_LEFT = 38;  // y-axis label space
const PAD_RIGHT = 10;
const PAD_TOP = 8;
const PAD_BOTTOM = 20; // x-axis label space

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dateToMs(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00`).getTime();
}

function shortDate(dateStr: string): string {
  const parts = dateStr.split('-');
  return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
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

  const startMs = dateToMs(startDate);
  const endMs = dateToMs(targetDate);
  const spanMs = endMs - startMs || 1;

  // Map a YYYY-MM-DD date to an x pixel position
  const toX = (dateStr: string) => {
    const ratio = (dateToMs(dateStr) - startMs) / spanMs;
    return PAD_LEFT + Math.max(0, Math.min(1, ratio)) * chartW;
  };

  const { points, targetY, bandRect, yLabels } = useMemo(() => {
    const allValues = [
      ...weightHistory.map((e) => e.weightKg),
      targetWeightKg,
      ...(stabilityBand ? [stabilityBand.low, stabilityBand.high] : []),
    ];
    const minV = Math.min(...allValues);
    const maxV = Math.max(...allValues);
    const range = maxV - minV || 1;
    const pad = range * 0.15;
    const lo = minV - pad;
    const hi = maxV + pad;
    const span = hi - lo;

    const toY = (kg: number) => PAD_TOP + chartH * (1 - (kg - lo) / span);

    const pts = weightHistory.map((e) => ({
      x: toX(e.date),
      y: toY(e.weightKg),
      kg: e.weightKg,
      date: e.date,
    }));

    const tY = toY(targetWeightKg);

    let band = null;
    if (stabilityBand) {
      const bHigh = toY(stabilityBand.high);
      const bLow = toY(stabilityBand.low);
      band = { x: PAD_LEFT, y: bHigh, w: chartW, h: bLow - bHigh };
    }

    const labels = [hi, (hi + lo) / 2, lo].map((v) => ({
      val: v,
      y: toY(v),
    }));

    return { points: pts, minVal: lo, maxVal: hi, targetY: tY, bandRect: band, yLabels: labels };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weightHistory, targetWeightKg, stabilityBand, chartW, chartH, startMs, endMs]);

  const fmtWeight = (kg: number) =>
    showImperial ? `${kgToLbs(kg).toFixed(0)}` : `${kg.toFixed(1)}`;
  const unit = showImperial ? 'lbs' : 'kg';

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const startPt = points[0];
  const latestPt = points[points.length - 1];

  // Today marker — only draw if today falls within the goal window
  const todayMs = dateToMs(today);
  const todayInRange = todayMs >= startMs && todayMs <= endMs;
  const todayX = toX(today);

  const axisBottom = PAD_TOP + chartH;

  return (
    <View style={styles.container}>
      {/* Bounded inner view so absolute x-labels don't overlap the legend */}
      <View style={{ height: HEIGHT + 18, position: 'relative' }}>
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
          {todayInRange && (
            <>
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
              {/* Dot on x-axis */}
              <Circle
                cx={todayX}
                cy={axisBottom}
                r={3.5}
                fill={Colors.light.primary}
              />
            </>
          )}

          {/* Weight history line */}
          {points.length >= 2 && (
            <Polyline
              points={polylinePoints}
              fill="none"
              stroke={Colors.light.primary}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Start dot */}
          {startPt && (
            <Circle
              cx={startPt.x}
              cy={startPt.y}
              r={5}
              fill={Colors.light.surface}
              stroke={Colors.light.primary}
              strokeWidth={2}
            />
          )}

          {/* Latest dot */}
          {latestPt && latestPt !== startPt && (
            <Circle cx={latestPt.x} cy={latestPt.y} r={5} fill={Colors.light.primary} />
          )}
        </Svg>

        {/* Y-axis labels — tightly right-aligned to the axis */}
        {yLabels.map((label, i) => (
          <Text key={i} style={[styles.yLabel, { top: label.y - 7 }]} numberOfLines={1}>
            {fmtWeight(label.val)}
          </Text>
        ))}

        {/* X-axis labels: start (left), today (middle, colored), target (right) */}
        <Text style={[styles.xLabel, { left: PAD_LEFT - 14 }]} numberOfLines={1}>
          {shortDate(startDate)}
        </Text>

        {todayInRange && (
          <Text
            style={[styles.xLabel, styles.xLabelToday, { left: todayX - 14 }]}
            numberOfLines={1}
          >
            {shortDate(today)}
          </Text>
        )}

        <Text
          style={[styles.xLabel, { left: PAD_LEFT + chartW - 14 }]}
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
        {todayInRange && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.light.primary, opacity: 0.5 }]} />
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
    width: 28,
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
