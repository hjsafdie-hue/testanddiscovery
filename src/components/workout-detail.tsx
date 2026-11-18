import { Alert, Platform, View } from 'react-native';

import { PR_SHORT, e1rm, workoutPrCount, workoutSetCount, workoutVolume } from '@/lib/stats';
import { useExerciseMap, useStore } from '@/lib/store';
import { fmtClock, fmtDate, fmtDuration, fmtVolume, fmtWeight } from '@/lib/units';
import { C, MUSCLE_COLOR, S } from '@/theme';

import { MuscleBadge } from './exercise-browser';
import { Btn, Card, Empty, Icon, Pill, Row, Stat, Txt } from './ui';

export function WorkoutDetail({
  workoutId,
  celebrate,
  onDeleted,
  onOpenExercise,
}: {
  workoutId: string;
  celebrate?: boolean;
  onDeleted?: () => void;
  onOpenExercise?: (id: string) => void;
}) {
  const w = useStore((s) => s.history.find((h) => h.id === workoutId));
  const unit = useStore((s) => s.settings.unit);
  const map = useExerciseMap();
  const del = useStore((s) => s.deleteWorkout);
  const createRoutine = useStore((s) => s.createRoutine);

  if (!w) return <Empty icon="calendar-remove" title="Workout not found" />;

  const prs = workoutPrCount(w);
  const muscles = Array.from(new Set(w.exercises.map((e) => map[e.exerciseId]?.muscle).filter(Boolean)));

  const confirmDelete = () => {
    const go = () => {
      del(w.id);
      onDeleted?.();
    };
    if (Platform.OS === 'web') go();
    else Alert.alert('Delete workout?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: go },
    ]);
  };

  return (
    <View style={{ gap: S.md }}>
      {celebrate ? (
        <Card style={{ backgroundColor: C.accent, borderColor: C.accent, alignItems: 'center', gap: 4 }}>
          <Icon name="party-popper" size={36} color={C.onAccent} />
          <Txt v="title" color={C.onAccent}>
            Workout complete!
          </Txt>
          <Txt v="body" color={C.onAccent}>
            {prs ? `You set ${prs} personal record${prs > 1 ? 's' : ''} 🏆` : 'Another one in the books.'}
          </Txt>
        </Card>
      ) : null}
      <View>
        <Txt v="title">{w.name}</Txt>
        <Txt v="caption">
          {fmtDate(w.startedAt, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} ·{' '}
          {new Date(w.startedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
        </Txt>
        <Row style={{ flexWrap: 'wrap', gap: 6, marginTop: S.sm }}>
          {muscles.map((m) => (
            <Pill key={m} text={m!} color={MUSCLE_COLOR[m!]} />
          ))}
        </Row>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
        <Stat label="Duration" value={w.endedAt ? fmtDuration(w.endedAt - w.startedAt) : '—'} icon="clock-outline" />
        <Stat label="Volume" value={fmtVolume(workoutVolume(w), unit)} icon="weight" color={C.info} />
        <Stat label="Sets" value={String(workoutSetCount(w))} icon="format-list-numbered" color={C.purple} />
        <Stat label="PRs" value={String(prs)} icon="trophy" color={C.gold} />
      </View>
      {w.notes ? (
        <Card>
          <Txt v="body" color={C.dim}>
            {w.notes}
          </Txt>
        </Card>
      ) : null}
      {w.exercises.map((e) => {
        const meta = map[e.exerciseId];
        let workIdx = 0;
        return (
          <Card key={e.id} style={{ gap: 6 }}>
            <Row style={{ marginBottom: 4 }}>
              {meta ? <MuscleBadge muscle={meta.muscle} size={30} /> : null}
              <Txt
                v="h2"
                style={{ flex: 1 }}
                numberOfLines={1}
                onPress={onOpenExercise ? () => onOpenExercise(e.exerciseId) : undefined}>
                {meta?.name ?? 'Unknown exercise'}
              </Txt>
              {onOpenExercise ? <Icon name="chevron-right" color={C.faint} /> : null}
            </Row>
            {e.notes ? (
              <Txt v="caption" style={{ fontStyle: 'italic' }}>
                {e.notes}
              </Txt>
            ) : null}
            {e.sets.map((x) => {
              const label = x.kind === 'warmup' ? 'W' : x.kind === 'drop' ? 'D' : x.kind === 'failure' ? 'F' : String(++workIdx);
              return (
                <Row key={x.id}>
                  <Txt v="mono" style={{ width: 22 }} color={x.kind === 'normal' ? C.dim : x.kind === 'warmup' ? C.warn : C.danger}>
                    {label}
                  </Txt>
                  <Txt v="mono" style={{ flex: 1 }}>
                    {meta?.tracking === 'time'
                      ? fmtClock(x.seconds ?? 0)
                      : meta?.tracking === 'reps'
                        ? `${x.reps ?? 0} reps`
                        : `${fmtWeight(x.weight, unit)} ${unit} × ${x.reps ?? 0}`}
                    {x.rpe ? `  @${x.rpe}` : ''}
                  </Txt>
                  {x.pr?.length ? (
                    <Pill text={x.pr.map((p) => PR_SHORT[p]).join(' · ')} color={C.gold} icon="trophy" />
                  ) : meta?.tracking === 'weight_reps' && x.weight && x.reps ? (
                    <Txt v="caption">{fmtWeight(e1rm(x.weight, x.reps), unit)}</Txt>
                  ) : null}
                </Row>
              );
            })}
          </Card>
        );
      })}
      <Row style={{ flexWrap: 'wrap' }}>
        <Btn
          kind="secondary"
          icon="content-save-outline"
          title="Save as routine"
          style={{ flex: 1 }}
          onPress={() => {
            const id = createRoutine(w.name, []);
            const store = useStore.getState();
            store.updateRoutine(id, {
              exercises: w.exercises.map((e) => ({
                id: Math.random().toString(36).slice(2),
                exerciseId: e.exerciseId,
                sets: e.sets.filter((x) => x.kind !== 'warmup').length || 1,
                reps: e.sets.find((x) => x.kind !== 'warmup')?.reps ?? 10,
                restSec: e.restSec ?? store.settings.defaultRestSec,
              })),
            });
            if (Platform.OS !== 'web') Alert.alert('Saved', `"${w.name}" is now in your routines.`);
          }}
        />
        <Btn kind="danger" icon="delete-outline" title="Delete" onPress={confirmDelete} style={{ flex: 1 }} />
      </Row>
    </View>
  );
}
