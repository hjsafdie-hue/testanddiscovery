import { useMemo, useState } from 'react';
import { Alert, Platform, View } from 'react-native';

import { bestsFrom, e1rm, isWorking, sessionsFor, setVolume } from '@/lib/stats';
import { useExerciseMap, useStore } from '@/lib/store';
import { fmtClock, fmtDate, fmtWeight, toDisplay } from '@/lib/units';
import { C, MUSCLE_COLOR, S, useLayout } from '@/theme';

import { LineChart } from './charts';
import { MuscleBadge } from './exercise-browser';
import { ExerciseDemo, ExerciseSteps, exerciseSteps, hasDemo } from './exercise-demo';
import { Btn, Card, Empty, Field, Icon, Pill, Row, SectionHeader, Segmented, Stat, Txt } from './ui';

type Metric = 'e1rm' | 'weight' | 'volume' | 'reps';

export function ExerciseDetail({ exerciseId, onDeleted }: { exerciseId: string; onDeleted?: () => void }) {
  const map = useExerciseMap();
  const ex = map[exerciseId];
  const history = useStore((s) => s.history);
  const unit = useStore((s) => s.settings.unit);
  const note = useStore((s) => s.exerciseNotes[exerciseId] ?? '');
  const setNote = useStore((s) => s.setExerciseNote);
  const deleteExercise = useStore((s) => s.deleteExercise);
  const sessions = useMemo(() => sessionsFor(exerciseId, history), [exerciseId, history]);
  const bests = useMemo(() => bestsFrom(sessions.flatMap((s) => s.sets)), [sessions]);
  const { unfolded } = useLayout();
  const [metric, setMetric] = useState<Metric>(ex?.tracking === 'weight_reps' ? 'e1rm' : 'reps');

  if (!ex) return <Empty icon="help-circle-outline" title="Exercise not found" />;

  const points = sessions
    .map((s) => {
      const w = s.sets.filter(isWorking);
      let y = 0;
      if (metric === 'e1rm') y = Math.max(0, ...w.map((x) => e1rm(x.weight ?? 0, x.reps ?? 0)));
      if (metric === 'weight') y = Math.max(0, ...w.map((x) => x.weight ?? 0));
      if (metric === 'volume') y = w.reduce((a, x) => a + setVolume(x), 0);
      if (metric === 'reps') y = ex.tracking === 'time' ? Math.max(0, ...w.map((x) => x.seconds ?? 0)) : Math.max(0, ...w.map((x) => x.reps ?? 0));
      return { x: s.date, y: metric === 'reps' ? y : toDisplay(y, unit) };
    })
    .filter((p) => p.y > 0);

  const weighted = ex.tracking === 'weight_reps';

  const confirmDelete = () => {
    const go = () => {
      deleteExercise(ex.id);
      onDeleted?.();
    };
    if (Platform.OS === 'web') go();
    else Alert.alert('Delete exercise?', 'History entries stay, but the exercise is removed from the library.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: go },
    ]);
  };

  return (
    <View style={{ gap: S.md }}>
      <ExerciseDemo exerciseId={ex.id} height={unfolded ? 260 : 220} />
      <Row style={{ gap: S.md }}>
        {hasDemo(ex.id) ? null : <MuscleBadge muscle={ex.muscle} size={52} />}
        <View style={{ flex: 1 }}>
          <Txt v="title" numberOfLines={2}>
            {ex.name}
          </Txt>
          <Row style={{ flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            <Pill text={ex.muscle} color={MUSCLE_COLOR[ex.muscle]} />
            {ex.secondary?.map((m) => <Pill key={m} text={m} color={C.dim} />)}
            <Pill text={ex.equipment} color={C.info} icon="dumbbell" />
          </Row>
        </View>
      </Row>

      {exerciseSteps(ex.id).length ? (
        <Card style={{ gap: S.md }}>
          <Row>
            <Icon name="school-outline" color={C.accent} />
            <Txt v="h2">How to do it</Txt>
          </Row>
          <ExerciseSteps exerciseId={ex.id} max={4} />
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
        {weighted ? (
          <>
            <Stat label="Est. 1RM" value={bests.e1rm ? fmtWeight(bests.e1rm, unit, true) : '—'} icon="trophy" color={C.gold} />
            <Stat label="Heaviest" value={bests.weight ? fmtWeight(bests.weight, unit, true) : '—'} icon="weight-kilogram" />
            <Stat label="Best set" value={bests.volume ? fmtWeight(bests.volume, unit, true) : '—'} icon="chart-box-outline" color={C.info} />
          </>
        ) : (
          <Stat label="Most reps" value={String(bests.reps || '—')} icon="trophy" color={C.gold} />
        )}
        <Stat label="Sessions" value={String(sessions.length)} icon="calendar-check" color={C.purple} />
      </View>

      <Card style={{ gap: S.md }}>
        {weighted ? (
          <Segmented
            value={metric}
            onChange={setMetric}
            options={[
              { value: 'e1rm', label: '1RM' },
              { value: 'weight', label: 'Top set' },
              { value: 'volume', label: 'Volume' },
              { value: 'reps', label: 'Reps' },
            ]}
          />
        ) : (
          <Txt v="label">{ex.tracking === 'time' ? 'LONGEST HOLD (s)' : 'MOST REPS'}</Txt>
        )}
        {points.length ? (
          <LineChart data={points} format={(v) => (metric === 'reps' ? String(Math.round(v)) : `${Math.round(v * 10) / 10}`)} />
        ) : (
          <Txt v="body" color={C.dim} style={{ paddingVertical: S.xl, textAlign: 'center' }}>
            Log this exercise to see your progress chart.
          </Txt>
        )}
      </Card>

      <Field
        label="Your notes (seat height, grip, cues…)"
        value={note}
        onChangeText={(t) => setNote(ex.id, t)}
        placeholder="Add a note"
        multiline
        style={{ height: 72, paddingTop: 12, textAlignVertical: 'top' }}
      />

      <SectionHeader title={`History (${sessions.length})`} />
      {sessions.length === 0 ? (
        <Txt v="body" color={C.dim}>
          No sessions yet.
        </Txt>
      ) : (
        sessions.slice(0, 30).map((s) => (
          <Card key={s.workoutId + s.entry.id} style={{ gap: 6 }}>
            <Txt v="label">{fmtDate(s.date)}</Txt>
            {s.sets.map((x, i) => (
              <Row key={x.id}>
                <Txt v="mono" color={x.kind === 'warmup' ? C.warn : C.dim} style={{ width: 22 }}>
                  {x.kind === 'warmup' ? 'W' : i + 1}
                </Txt>
                <Txt v="mono" style={{ flex: 1 }}>
                  {ex.tracking === 'time'
                    ? fmtClock(x.seconds ?? 0)
                    : ex.tracking === 'reps'
                      ? `${x.reps ?? 0} reps${x.weight ? ` +${fmtWeight(x.weight, unit)} ${unit}` : ''}`
                      : `${fmtWeight(x.weight, unit)} ${unit} × ${x.reps ?? 0}`}
                </Txt>
                {weighted && x.weight && x.reps ? (
                  <Txt v="caption">1RM {fmtWeight(e1rm(x.weight, x.reps), unit)}</Txt>
                ) : null}
                {x.pr?.length ? <Icon name="trophy" size={16} color={C.gold} /> : null}
              </Row>
            ))}
          </Card>
        ))
      )}
      {ex.custom ? <Btn kind="danger" icon="delete-outline" title="Delete custom exercise" onPress={confirmDelete} /> : null}
    </View>
  );
}
