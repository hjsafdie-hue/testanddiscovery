import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { haptic } from '@/lib/device';
import { MUSCLES } from '@/lib/exercises-data';
import { muscleRecovery, platesPerSide } from '@/lib/stats';
import { useExerciseMap, useStore } from '@/lib/store';
import { fmtClock, parseNum, toDisplay } from '@/lib/units';
import { C, MUSCLE_COLOR, R, S } from '@/theme';

import { Ring } from './charts';
import { Btn, Card, Chip, Field, Icon, IconBtn, Row, Txt } from './ui';

export function useNow(intervalMs = 1000, enabled = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs, enabled]);
  return now;
}

/** Fires a haptic once when the rest timer hits zero and clears it. */
function useRestState() {
  const rest = useStore((s) => s.rest);
  const stopRest = useStore((s) => s.stopRest);
  const now = useNow(250, !!rest.endsAt);
  const remaining = rest.endsAt ? Math.max(0, (rest.endsAt - now) / 1000) : 0;
  const fired = useRef<number | null>(null);
  useEffect(() => {
    if (rest.endsAt && remaining <= 0 && fired.current !== rest.endsAt) {
      fired.current = rest.endsAt;
      haptic.warn();
      stopRest();
    }
  }, [remaining, rest.endsAt, stopRest]);
  return { rest, remaining, running: !!rest.endsAt && remaining > 0 };
}

const PRESETS = [60, 90, 120, 180, 240];

/** Thin bar shown at the top of the workout on the cover screen. */
export function RestBar() {
  const { rest, remaining, running } = useRestState();
  const adjust = useStore((s) => s.adjustRest);
  const stop = useStore((s) => s.stopRest);
  if (!running) return null;
  const pct = rest.durationSec ? remaining / rest.durationSec : 0;
  return (
    <View style={styles.restBar} testID="rest-bar">
      <View style={[styles.restFill, { width: `${pct * 100}%` }]} />
      <Icon name="timer-sand" size={20} color={C.accent} />
      <Txt v="mono" style={{ fontSize: 22, minWidth: 64 }}>
        {fmtClock(remaining)}
      </Txt>
      <View style={{ flex: 1 }} />
      <Pressable style={styles.restChip} onPress={() => adjust(-15)} accessibilityLabel="Subtract 15 seconds">
        <Txt v="label" color={C.text}>
          −15
        </Txt>
      </Pressable>
      <Pressable style={styles.restChip} onPress={() => adjust(15)} accessibilityLabel="Add 15 seconds">
        <Txt v="label" color={C.text}>
          +15
        </Txt>
      </Pressable>
      <Pressable style={[styles.restChip, { backgroundColor: C.accent }]} onPress={stop} accessibilityLabel="Skip rest">
        <Txt v="label" color={C.onAccent}>
          Skip
        </Txt>
      </Pressable>
    </View>
  );
}

/** Large ring timer for the unfolded side pane. */
export function RestPanel() {
  const { rest, remaining, running } = useRestState();
  const adjust = useStore((s) => s.adjustRest);
  const stop = useStore((s) => s.stopRest);
  const start = useStore((s) => s.startRest);
  const pct = running && rest.durationSec ? remaining / rest.durationSec : 0;
  return (
    <Card style={{ alignItems: 'center', gap: S.md }}>
      <Row style={{ alignSelf: 'stretch' }}>
        <Icon name="timer-outline" color={C.accent} />
        <Txt v="h2">Rest timer</Txt>
      </Row>
      <Ring size={190} progress={pct} stroke={12}>
        <Txt v="display" style={{ fontVariant: ['tabular-nums'], fontSize: 44 }}>
          {running ? fmtClock(remaining) : '0:00'}
        </Txt>
        <Txt v="caption" numberOfLines={1} style={{ maxWidth: 140 }}>
          {running ? (rest.label ? `then ${rest.label}` : 'resting') : 'ready'}
        </Txt>
      </Ring>
      {running ? (
        <Row>
          <Btn kind="secondary" title="−15s" onPress={() => adjust(-15)} />
          <Btn kind="secondary" title="+15s" onPress={() => adjust(15)} />
          <Btn title="Skip" icon="skip-next" onPress={stop} />
        </Row>
      ) : (
        <Row style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
          {PRESETS.map((p) => (
            <Chip key={p} label={fmtClock(p)} onPress={() => start(p)} />
          ))}
        </Row>
      )}
    </Card>
  );
}

const PLATE_COLORS: Record<string, string> = {
  '25': '#E5484D',
  '20': '#3E63DD',
  '15': '#FFC53D',
  '10': '#30A46C',
  '5': '#F2F4F7',
  '2.5': '#E5484D',
  '1.25': '#9AA3AF',
  '45': '#3E63DD',
  '35': '#FFC53D',
};

export function PlateCalculator({ initialKg }: { initialKg?: number }) {
  const unit = useStore((s) => s.settings.unit);
  const barKg = useStore((s) => s.settings.barWeightKg);
  const bar = toDisplay(barKg, unit);
  // Parent remounts this (via `key`) when the suggested weight changes.
  const [text, setText] = useState(initialKg ? String(toDisplay(initialKg, unit)) : '');
  const target = parseNum(text) ?? 0;
  const { plates, remainder } = platesPerSide(target, bar, unit);
  const maxPlate = unit === 'kg' ? 25 : 45;
  return (
    <Card style={{ gap: S.md }}>
      <Row>
        <Icon name="weight" color={C.accent} />
        <Txt v="h2">Plate calculator</Txt>
      </Row>
      <Field
        value={text}
        onChangeText={setText}
        keyboardType="decimal-pad"
        placeholder={`Target weight (${unit})`}
        testID="plate-input"
      />
      <View style={styles.barbell}>
        <View style={styles.barSleeve} />
        {plates.map((p, i) => (
          <View
            key={i}
            style={[
              styles.plate,
              {
                height: 36 + (p / maxPlate) * 64,
                width: p >= (unit === 'kg' ? 10 : 25) ? 16 : 11,
                backgroundColor: PLATE_COLORS[String(p)] ?? C.dim,
              },
            ]}
          />
        ))}
        <View style={styles.barCollar} />
        <View style={styles.barShaft} />
      </View>
      <Txt v="body" color={C.dim}>
        {target <= bar
          ? `Empty bar is ${bar} ${unit}`
          : plates.length
            ? `Per side: ${plates.join(' + ')} ${unit}`
            : 'No plates needed'}
        {remainder > 0 ? `  (${remainder} ${unit} short)` : ''}
      </Txt>
    </Card>
  );
}

function recoveryColor(pct: number) {
  if (pct >= 90) return C.success;
  if (pct >= 60) return C.warn;
  return C.danger;
}

export function RecoveryGrid({ cols = 2 }: { cols?: number }) {
  const history = useStore((s) => s.history);
  const map = useExerciseMap();
  const now = useNow(60000);
  const data = muscleRecovery(history, map, MUSCLES.filter((m) => m !== 'Cardio' && m !== 'Full Body'), now);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
      {data.map((r) => {
        const color = recoveryColor(r.pct);
        return (
          <View key={r.muscle} style={[styles.recovery, { width: `${100 / cols - 2}%` as const }]}>
            <View style={[styles.dot, { backgroundColor: MUSCLE_COLOR[r.muscle] }]} />
            <Txt v="body" style={{ flex: 1, fontWeight: '600' }} numberOfLines={1}>
              {r.muscle}
            </Txt>
            <View style={styles.recTrack}>
              <View style={[styles.recFill, { width: `${r.pct}%`, backgroundColor: color }]} />
            </View>
            <Txt v="caption" style={{ width: 36, textAlign: 'right', color }}>
              {r.pct}%
            </Txt>
          </View>
        );
      })}
    </View>
  );
}

/** Month calendar with dots on workout days. */
export function MonthCalendar({
  month,
  onMonth,
  marked,
  selectedDay,
  onSelectDay,
}: {
  month: Date;
  onMonth: (d: Date) => void;
  marked: Set<string>;
  selectedDay?: string | null;
  onSelectDay?: (key: string | null) => void;
}) {
  const y = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(y, m, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const today = new Date();
  return (
    <Card style={{ gap: S.sm }}>
      <Row>
        <IconBtn name="chevron-left" label="Previous month" onPress={() => onMonth(new Date(y, m - 1, 1))} />
        <Txt v="h2" style={{ flex: 1, textAlign: 'center' }}>
          {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </Txt>
        <IconBtn name="chevron-right" label="Next month" onPress={() => onMonth(new Date(y, m + 1, 1))} />
      </Row>
      <View style={styles.calRow}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <Txt key={i} v="caption" style={styles.calCell}>
            {d}
          </Txt>
        ))}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} style={styles.calRow}>
          {cells.slice(row * 7, row * 7 + 7).map((d, i) => {
            if (!d) return <View key={i} style={styles.calCell} />;
            const key = dayKey(new Date(y, m, d).getTime());
            const on = marked.has(key);
            const sel = selectedDay === key;
            const isToday = today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
            return (
              <Pressable
                key={i}
                style={styles.calCell}
                onPress={() => {
                  haptic.tap();
                  onSelectDay?.(sel ? null : key);
                }}>
                <View
                  style={[
                    styles.calDay,
                    on && { backgroundColor: C.accent },
                    sel && { borderColor: C.text, borderWidth: 2 },
                    isToday && !on && { borderColor: C.accent, borderWidth: 1 },
                  ]}>
                  <Txt v="caption" style={{ color: on ? C.onAccent : C.text, fontWeight: on ? '800' : '500' }}>
                    {d}
                  </Txt>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </Card>
  );
}

export function dayKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

const styles = StyleSheet.create({
  restBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    backgroundColor: C.surface2,
    borderRadius: R.md,
    paddingHorizontal: S.md,
    height: 56,
    overflow: 'hidden',
  },
  restFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: C.accentDim },
  restChip: { paddingHorizontal: 10, height: 34, borderRadius: R.sm, backgroundColor: C.surface3, justifyContent: 'center' },
  barbell: { height: 110, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  barSleeve: { width: 24, height: 12, backgroundColor: '#8A929E', borderRadius: 2 },
  barCollar: { width: 8, height: 26, backgroundColor: '#8A929E', borderRadius: 2 },
  barShaft: { flex: 1, maxWidth: 120, height: 8, backgroundColor: '#5F6875', borderRadius: 2 },
  plate: { borderRadius: 3 },
  recovery: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    backgroundColor: C.surface,
    borderRadius: R.md,
    paddingHorizontal: S.md,
    height: 44,
    flexGrow: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  recTrack: { width: 54, height: 6, borderRadius: 3, backgroundColor: C.surface3, overflow: 'hidden' },
  recFill: { height: 6, borderRadius: 3 },
  calRow: { flexDirection: 'row' },
  calCell: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 38, textAlign: 'center' },
  calDay: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
