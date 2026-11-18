import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { haptic } from '@/lib/device';
import { overloadHint } from '@/lib/stats';
import { useExerciseMap, useStore } from '@/lib/store';
import { fmtClock, fmtWeight } from '@/lib/units';
import { C, R, S } from '@/theme';

import { ExerciseThumb } from './exercise-demo';
import { Btn, Card, Empty, Field, IconBtn, Row, Txt } from './ui';

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  format = String,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (v: number) => string;
  label: string;
}) {
  const bump = (d: number) => {
    haptic.tap();
    onChange(Math.max(min, Math.min(max, value + d)));
  };
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Txt v="caption">{label}</Txt>
      <View style={styles.stepper}>
        <Pressable style={styles.stepBtn} onPress={() => bump(-step)} accessibilityLabel={`Decrease ${label}`} hitSlop={4}>
          <Txt v="h2" color={C.dim}>
            −
          </Txt>
        </Pressable>
        <Txt v="mono" style={{ minWidth: 38, textAlign: 'center' }}>
          {format(value)}
        </Txt>
        <Pressable style={styles.stepBtn} onPress={() => bump(step)} accessibilityLabel={`Increase ${label}`} hitSlop={4}>
          <Txt v="h2" color={C.dim}>
            +
          </Txt>
        </Pressable>
      </View>
    </View>
  );
}

export function RoutineEditor({
  routineId,
  onAddExercises,
  onStart,
  onDeleted,
}: {
  routineId: string;
  onAddExercises: () => void;
  onStart: () => void;
  onDeleted?: () => void;
}) {
  const routine = useStore((s) => s.routines.find((r) => r.id === routineId));
  const history = useStore((s) => s.history);
  const unit = useStore((s) => s.settings.unit);
  const hasActive = useStore((s) => !!s.active);
  const update = useStore((s) => s.updateRoutine);
  const updateRow = useStore((s) => s.updateRoutineExercise);
  const removeRow = useStore((s) => s.removeFromRoutine);
  const moveRow = useStore((s) => s.moveInRoutine);
  const del = useStore((s) => s.deleteRoutine);
  const map = useExerciseMap();

  if (!routine) return <Empty icon="clipboard-remove-outline" title="Routine not found" />;

  const confirmDelete = () => {
    const go = () => {
      del(routine.id);
      onDeleted?.();
    };
    if (Platform.OS === 'web') go();
    else Alert.alert('Delete routine?', `"${routine.name}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: go },
    ]);
  };

  const totalSets = routine.exercises.reduce((a, r) => a + r.sets, 0);

  return (
    <View style={{ gap: S.md }}>
      <Field
        value={routine.name}
        onChangeText={(name) => update(routine.id, { name })}
        style={{ fontSize: 22, fontWeight: '800', height: 56 }}
        accessibilityLabel="Routine name"
      />
      <Txt v="caption">
        {routine.exercises.length} exercises · {totalSets} sets · ~{Math.round(totalSets * 2.5)} min
      </Txt>
      <Btn
        big
        icon="play"
        title={hasActive ? 'Workout already in progress' : 'Start this routine'}
        disabled={hasActive || !routine.exercises.length}
        onPress={onStart}
        testID="start-routine"
      />
      {routine.exercises.map((row) => {
        const meta = map[row.exerciseId];
        const hint = meta?.tracking === 'weight_reps' ? overloadHint(row.exerciseId, history, unit, row.reps) : null;
        return (
          <Card key={row.id} style={{ gap: S.md }}>
            <Row>
              {meta ? <ExerciseThumb exerciseId={row.exerciseId} muscle={meta.muscle} size={40} /> : null}
              <View style={{ flex: 1 }}>
                <Txt v="h2" numberOfLines={1}>
                  {meta?.name ?? 'Unknown'}
                </Txt>
                {hint ? (
                  <Txt v="caption" color={C.accent} numberOfLines={1}>
                    Next: {fmtWeight(hint.weight, unit)} {unit} × {hint.reps}
                  </Txt>
                ) : null}
              </View>
              <IconBtn name="chevron-up" label="Move up" size={20} onPress={() => moveRow(routine.id, row.id, -1)} />
              <IconBtn name="chevron-down" label="Move down" size={20} onPress={() => moveRow(routine.id, row.id, 1)} />
              <IconBtn name="close" label="Remove" size={20} color={C.danger} onPress={() => removeRow(routine.id, row.id)} />
            </Row>
            <Row style={{ justifyContent: 'space-around', flexWrap: 'wrap' }}>
              <Stepper label="Sets" value={row.sets} min={1} max={20} onChange={(v) => updateRow(routine.id, row.id, { sets: v })} />
              <Stepper
                label={meta?.tracking === 'time' ? 'Target (s)' : 'Reps'}
                value={row.reps}
                min={1}
                max={meta?.tracking === 'time' ? 3600 : 100}
                step={meta?.tracking === 'time' ? 15 : 1}
                onChange={(v) => updateRow(routine.id, row.id, { reps: v })}
              />
              <Stepper
                label="Rest"
                value={row.restSec}
                step={15}
                min={0}
                max={600}
                format={fmtClock}
                onChange={(v) => updateRow(routine.id, row.id, { restSec: v })}
              />
            </Row>
          </Card>
        );
      })}
      <Btn kind="secondary" icon="plus" title="Add exercises" onPress={onAddExercises} testID="routine-add-exercises" />
      <Field
        label="Notes"
        value={routine.notes ?? ''}
        onChangeText={(notes) => update(routine.id, { notes })}
        placeholder="Program notes, e.g. 'Week A — heavy'"
        multiline
        style={{ height: 72, paddingTop: 12, textAlignVertical: 'top' }}
      />
      <Btn kind="danger" icon="delete-outline" title="Delete routine" onPress={confirmDelete} />
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface2,
    borderRadius: R.md,
    height: 44,
  },
  stepBtn: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
});
