import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { haptic } from '@/lib/device';
import { PR_LABEL, overloadHint, sessionsFor } from '@/lib/stats';
import { useExerciseMap, useStore } from '@/lib/store';
import type { Exercise, Unit, WorkoutExercise, WorkoutSet } from '@/lib/types';
import { fmtClock, fmtWeight, fromDisplay, parseNum, toDisplay } from '@/lib/units';
import { C, R, S } from '@/theme';

import { MuscleBadge } from './exercise-browser';
import { Field, Icon, IconBtn, type IconName, Pill, Row, Txt } from './ui';

const KIND_LABEL = { warmup: 'W', drop: 'D', failure: 'F' } as const;
const KIND_COLOR = { normal: C.dim, warmup: C.warn, drop: C.info, failure: C.danger } as const;

function NumInput({
  value,
  placeholder,
  onCommit,
  decimal,
  testID,
  done,
}: {
  value: number | undefined;
  placeholder?: string;
  onCommit: (v: number | undefined) => void;
  decimal?: boolean;
  testID?: string;
  done?: boolean;
}) {
  const [text, setText] = useState(value == null ? '' : String(value));
  const [lastValue, setLastValue] = useState(value);
  // Sync when the store value changes from outside (e.g. filled from "previous" on completion).
  if (value !== lastValue) {
    setLastValue(value);
    if (parseNum(text) !== value) setText(value == null ? '' : String(value));
  }
  return (
    <TextInput
      testID={testID}
      value={text}
      onChangeText={(t) => {
        setText(t);
        onCommit(parseNum(t));
      }}
      placeholder={placeholder}
      placeholderTextColor={C.faint}
      keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      selectTextOnFocus
      selectionColor={C.accent}
      style={[styles.input, done && styles.inputDone]}
      textAlign="center"
      maxLength={6}
    />
  );
}

function SetRow({
  entry,
  set,
  index,
  meta,
  prev,
  unit,
  compact,
}: {
  entry: WorkoutExercise;
  set: WorkoutSet;
  index: number;
  meta: Exercise;
  prev?: WorkoutSet;
  unit: Unit;
  compact: boolean;
}) {
  const updateSet = useStore((s) => s.updateSet);
  const toggle = useStore((s) => s.toggleSetDone);
  const cycle = useStore((s) => s.cycleSetKind);
  const remove = useStore((s) => s.removeSet);
  const label = set.kind === 'normal' ? String(index) : KIND_LABEL[set.kind];
  const t = meta.tracking;

  const prevText = prev
    ? t === 'time'
      ? fmtClock(prev.seconds ?? 0)
      : t === 'reps'
        ? `${prev.reps ?? 0}`
        : `${fmtWeight(prev.weight, unit)}×${prev.reps ?? 0}`
    : '—';

  const fallback: Partial<WorkoutSet> = prev ? { weight: prev.weight, reps: prev.reps, seconds: prev.seconds } : {};

  return (
    <View style={[styles.setRow, set.done && styles.setRowDone]} testID={`set-row-${entry.id}-${set.id}`}>
      <Pressable
        onPress={() => cycle(entry.id, set.id)}
        onLongPress={() => {
          haptic.warn();
          remove(entry.id, set.id);
        }}
        accessibilityLabel={`Set ${label}. Tap to change type, long-press to delete`}
        style={[styles.setLabel, { backgroundColor: set.kind === 'normal' ? C.surface2 : KIND_COLOR[set.kind] + '26' }]}>
        <Txt v="mono" style={{ color: KIND_COLOR[set.kind], fontSize: 14 }}>
          {label}
        </Txt>
      </Pressable>
      {compact ? null : (
        <Txt v="mono" numberOfLines={1} style={styles.prev}>
          {prevText}
        </Txt>
      )}
      {t === 'weight_reps' ? (
        <NumInput
          testID={`w-${set.id}`}
          decimal
          done={set.done}
          value={set.weight == null ? undefined : toDisplay(set.weight, unit)}
          placeholder={prev?.weight != null ? fmtWeight(prev.weight, unit) : unit}
          onCommit={(v) => updateSet(entry.id, set.id, { weight: v == null ? undefined : fromDisplay(v, unit) })}
        />
      ) : null}
      {t === 'time' ? (
        <NumInput
          testID={`s-${set.id}`}
          done={set.done}
          value={set.seconds}
          placeholder={prev?.seconds != null ? String(prev.seconds) : 'sec'}
          onCommit={(v) => updateSet(entry.id, set.id, { seconds: v })}
        />
      ) : (
        <NumInput
          testID={`r-${set.id}`}
          done={set.done}
          value={set.reps}
          placeholder={prev?.reps != null ? String(prev.reps) : entry.targetReps ? String(entry.targetReps) : 'reps'}
          onCommit={(v) => updateSet(entry.id, set.id, { reps: v })}
        />
      )}
      <Pressable
        testID={`done-${set.id}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: set.done }}
        accessibilityLabel={`Complete set ${label}`}
        onPress={() =>
          toggle(entry.id, set.id, {
            ...fallback,
            reps: fallback.reps ?? entry.targetReps,
          })
        }
        style={[styles.check, set.done && { backgroundColor: C.success }]}>
        <Icon name="check-bold" size={20} color={set.done ? C.onAccent : C.faint} />
      </Pressable>
      {set.pr?.length ? (
        <View style={styles.prBadge}>
          <Icon name="trophy" size={12} color={C.onAccent} />
        </View>
      ) : null}
    </View>
  );
}

function MenuAction({ icon, label, onPress, color = C.text }: { icon: IconName; label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={styles.menuAction}>
      <Icon name={icon} size={18} color={color} />
      <Txt v="caption" style={{ color, fontWeight: '600' }}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function ExerciseCard({
  entry,
  index,
  total,
  compact,
  focused,
  onFocus,
  onOpenExercise,
}: {
  entry: WorkoutExercise;
  index: number;
  total: number;
  compact: boolean;
  focused?: boolean;
  onFocus?: (exerciseId: string) => void;
  onOpenExercise?: (exerciseId: string) => void;
}) {
  const map = useExerciseMap();
  const meta = map[entry.exerciseId];
  const history = useStore((s) => s.history);
  const unit = useStore((s) => s.settings.unit);
  const defaultRest = useStore((s) => s.settings.defaultRestSec);
  const addSet = useStore((s) => s.addSet);
  const addWarmups = useStore((s) => s.addWarmups);
  const removeExercise = useStore((s) => s.removeExercise);
  const moveExercise = useStore((s) => s.moveExercise);
  const setRest = useStore((s) => s.setExerciseRest);
  const setNotes = useStore((s) => s.setExerciseNotes);
  const toggleSuperset = useStore((s) => s.toggleSuperset);
  const [menu, setMenu] = useState(false);
  const [showNotes, setShowNotes] = useState(!!entry.notes);

  const prevSets = useMemo(() => sessionsFor(entry.exerciseId, history)[0]?.sets ?? [], [entry.exerciseId, history]);
  const hint = useMemo(
    () => (meta?.tracking === 'weight_reps' ? overloadHint(entry.exerciseId, history, unit, entry.targetReps) : null),
    [entry.exerciseId, entry.targetReps, history, unit, meta?.tracking],
  );

  if (!meta) return null;

  // Match previous sets by kind & position, Strong-style.
  const prevWarm = prevSets.filter((s) => s.kind === 'warmup');
  const prevWork = prevSets.filter((s) => s.kind !== 'warmup');
  let wi = 0;
  let ni = 0;
  const rest = entry.restSec ?? defaultRest;
  const doneCount = entry.sets.filter((s) => s.done).length;
  const prs = entry.sets.flatMap((s) => s.pr ?? []);

  return (
    <View style={[styles.card, focused && { borderColor: C.accent }]}>
      <Pressable style={styles.cardHeader} onPress={() => onFocus?.(entry.exerciseId)}>
        <MuscleBadge muscle={meta.muscle} size={36} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt
            v="h2"
            numberOfLines={1}
            color={C.accent}
            onPress={() => (onOpenExercise ? onOpenExercise(entry.exerciseId) : onFocus?.(entry.exerciseId))}>
            {meta.name}
          </Txt>
          <Row style={{ gap: 6 }}>
            <Txt v="caption">
              {doneCount}/{entry.sets.length} sets · rest {fmtClock(rest)}
            </Txt>
            {entry.supersetId ? <Pill text="SUPERSET" color={C.purple} icon="link-variant" /> : null}
          </Row>
        </View>
        <IconBtn name={menu ? 'close' : 'dots-horizontal'} label="Exercise options" onPress={() => setMenu(!menu)} />
      </Pressable>

      {menu ? (
        <View style={styles.menu}>
          {meta.tracking === 'weight_reps' ? (
            <MenuAction icon="fire" label="Warm-up" color={C.warn} onPress={() => addWarmups(entry.id)} />
          ) : null}
          <MenuAction icon="timer-minus-outline" label="Rest −15" onPress={() => setRest(entry.id, Math.max(0, rest - 15))} />
          <MenuAction icon="timer-plus-outline" label="Rest +15" onPress={() => setRest(entry.id, rest + 15)} />
          {index < total - 1 || entry.supersetId ? (
            <MenuAction icon="link-variant" label={entry.supersetId ? 'Unlink' : 'Superset ↓'} color={C.purple} onPress={() => toggleSuperset(entry.id)} />
          ) : null}
          <MenuAction icon="note-edit-outline" label="Note" onPress={() => setShowNotes(!showNotes)} />
          {index > 0 ? <MenuAction icon="arrow-up" label="Up" onPress={() => moveExercise(entry.id, -1)} /> : null}
          {index < total - 1 ? <MenuAction icon="arrow-down" label="Down" onPress={() => moveExercise(entry.id, 1)} /> : null}
          <MenuAction icon="delete-outline" label="Remove" color={C.danger} onPress={() => removeExercise(entry.id)} />
        </View>
      ) : null}

      {hint && doneCount === 0 ? (
        <Row style={styles.hint}>
          <Icon name="trending-up" size={16} color={C.accent} />
          <Txt v="caption" color={C.text} style={{ flex: 1 }}>
            <Txt v="caption" color={C.accent} style={{ fontWeight: '800' }}>
              {fmtWeight(hint.weight, unit)} {unit} × {hint.reps}
            </Txt>
            {'  '}
            {hint.text}
          </Txt>
        </Row>
      ) : null}

      {prs.length ? (
        <Row style={{ flexWrap: 'wrap', gap: 6, paddingHorizontal: S.md }}>
          {Array.from(new Set(prs)).map((p) => (
            <Pill key={p} text={`New ${PR_LABEL[p]} PR`} color={C.gold} icon="trophy" />
          ))}
        </Row>
      ) : null}

      {showNotes ? (
        <View style={{ paddingHorizontal: S.md }}>
          <Field
            value={entry.notes ?? ''}
            onChangeText={(t) => setNotes(entry.id, t)}
            placeholder="Note for this exercise"
            style={{ height: 40, fontSize: 14 }}
          />
        </View>
      ) : null}

      <View style={styles.tableHead}>
        <Txt v="caption" style={{ width: 36, textAlign: 'center' }}>
          SET
        </Txt>
        {compact ? null : (
          <Txt v="caption" style={styles.prevHead}>
            PREVIOUS
          </Txt>
        )}
        {meta.tracking === 'weight_reps' ? (
          <Txt v="caption" style={styles.colHead}>
            {unit.toUpperCase()}
          </Txt>
        ) : null}
        <Txt v="caption" style={styles.colHead}>
          {meta.tracking === 'time' ? 'SEC' : 'REPS'}
        </Txt>
        <View style={{ width: 44 }} />
      </View>
      {entry.sets.map((set) => {
        const prev = set.kind === 'warmup' ? prevWarm[wi++] : prevWork[ni++];
        const idx = set.kind === 'normal' ? entry.sets.filter((x, k) => x.kind === 'normal' && k <= entry.sets.indexOf(set)).length : 0;
        return (
          <SetRow key={set.id} entry={entry} set={set} index={idx} meta={meta} prev={prev} unit={unit} compact={compact} />
        );
      })}
      <Pressable
        testID={`add-set-${entry.id}`}
        onPress={() => {
          haptic.tap();
          addSet(entry.id);
        }}
        style={styles.addSet}>
        <Icon name="plus" size={18} color={C.dim} />
        <Txt v="label">Add set</Txt>
      </Pressable>
    </View>
  );
}

/** Groups superset neighbours visually with a coloured rail. */
export function WorkoutExerciseList({
  compact,
  focusedExerciseId,
  onFocus,
  onOpenExercise,
}: {
  compact: boolean;
  focusedExerciseId?: string | null;
  onFocus?: (exerciseId: string) => void;
  onOpenExercise?: (exerciseId: string) => void;
}) {
  const entries = useStore((s) => s.active?.exercises ?? []);
  return (
    <View style={{ gap: S.md }}>
      {entries.map((e, i) => {
        const linkedNext = e.supersetId && entries[i + 1]?.supersetId === e.supersetId;
        return (
          <View key={e.id} style={e.supersetId ? styles.supersetWrap : null}>
            <ExerciseCard
              entry={e}
              index={i}
              total={entries.length}
              compact={compact}
              focused={focusedExerciseId === e.exerciseId}
              onFocus={onFocus}
              onOpenExercise={onOpenExercise}
            />
            {linkedNext ? (
              <View style={styles.supersetLink}>
                <Icon name="link-variant" size={14} color={C.purple} />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    paddingBottom: S.xs,
    gap: S.xs,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, paddingBottom: S.xs },
  menu: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: S.md, paddingBottom: S.xs },
  menuAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.surface2,
    paddingHorizontal: 10,
    height: 34,
    borderRadius: R.sm,
  },
  hint: { marginHorizontal: S.md, backgroundColor: C.accentDim, borderRadius: R.sm, paddingHorizontal: 10, paddingVertical: 8 },
  tableHead: { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingHorizontal: S.md, marginTop: 4 },
  prevHead: { flex: 1, textAlign: 'center' },
  colHead: { width: 72, textAlign: 'center' },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    paddingHorizontal: S.md,
    paddingVertical: 5,
  },
  setRowDone: { backgroundColor: '#3DDC9714' },
  setLabel: { width: 36, height: 36, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center' },
  prev: { flex: 1, textAlign: 'center', color: C.faint, fontSize: 14 },
  input: {
    width: 72,
    height: 44,
    borderRadius: R.sm,
    backgroundColor: C.surface2,
    color: C.text,
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    padding: 0,
  },
  inputDone: { backgroundColor: 'transparent' },
  check: {
    width: 44,
    height: 44,
    borderRadius: R.sm,
    backgroundColor: C.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  prBadge: {
    position: 'absolute',
    right: S.md - 6,
    top: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSet: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    marginHorizontal: S.md,
    marginTop: 4,
    marginBottom: S.sm,
    borderRadius: R.sm,
    backgroundColor: C.surface2,
  },
  supersetWrap: { borderLeftWidth: 3, borderLeftColor: C.purple, paddingLeft: 6, borderRadius: 4 },
  supersetLink: { alignItems: 'center', marginTop: -6, marginBottom: -12, zIndex: 1 },
});
