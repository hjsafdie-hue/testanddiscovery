import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ring } from '@/components/charts';
import { RoutineEditor } from '@/components/routine-editor';
import { RecoveryGrid } from '@/components/tools';
import { TwoPane } from '@/components/two-pane';
import { Btn, Card, Icon, IconBtn, Row, SectionHeader, Stat, Txt } from '@/components/ui';
import { haptic } from '@/lib/device';
import { weekStreak, weeklyStats } from '@/lib/stats';
import { useExerciseMap, useStore } from '@/lib/store';
import type { Routine } from '@/lib/types';
import { fmtRelativeDay, fmtVolume } from '@/lib/units';
import { C, MUSCLE_COLOR, R, S, useLayout } from '@/theme';

export default function TrainScreen() {
  const { unfolded } = useLayout();
  const [selected, setSelected] = useState<string | null>(null);
  const routines = useStore((s) => s.routines);
  const start = useStore((s) => s.startWorkout);
  const selectedId = selected && routines.some((r) => r.id === selected) ? selected : null;

  const openRoutine = (id: string) => {
    if (unfolded) setSelected(id);
    else router.push({ pathname: '/routine/[id]', params: { id } });
  };

  const list = <TrainHome onOpenRoutine={openRoutine} selectedId={unfolded ? selectedId : null} />;
  if (!unfolded) return list;

  return (
    <TwoPane
      list={list}
      detail={
        selectedId ? (
          <View style={{ gap: S.md }}>
            <Row>
              <Txt v="label" style={{ flex: 1 }}>
                EDIT ROUTINE
              </Txt>
              <IconBtn name="close" label="Close routine" onPress={() => setSelected(null)} />
            </Row>
            <RoutineEditor
              routineId={selectedId}
              onAddExercises={() => router.push({ pathname: '/pick-exercise', params: { routineId: selectedId } })}
              onStart={() => {
                start(selectedId);
                router.push('/workout');
              }}
              onDeleted={() => setSelected(null)}
            />
          </View>
        ) : (
          <View style={{ gap: S.md }}>
            <Txt v="title">Muscle recovery</Txt>
            <Txt v="body" color={C.dim}>
              Based on sets logged over the last 72 hours. Green muscles are ready for heavy work.
            </Txt>
            <RecoveryGrid cols={1} />
            <Card style={{ flexDirection: 'row', gap: S.md, alignItems: 'center' }}>
              <Icon name="gesture-tap" color={C.accent} />
              <Txt v="body" color={C.dim} style={{ flex: 1 }}>
                Select a routine on the left to edit it here.
              </Txt>
            </Card>
          </View>
        )
      }
    />
  );
}

function TrainHome({ onOpenRoutine, selectedId }: { onOpenRoutine: (id: string) => void; selectedId: string | null }) {
  const insets = useSafeAreaInsets();
  const { gutter, unfolded, cols } = useLayout();
  const active = useStore((s) => s.active);
  const history = useStore((s) => s.history);
  const routines = useStore((s) => s.routines);
  const settings = useStore((s) => s.settings);
  const start = useStore((s) => s.startWorkout);
  const createRoutine = useStore((s) => s.createRoutine);

  const week = useMemo(() => weeklyStats(history, 1)[0], [history]);
  const streak = useMemo(() => weekStreak(history, settings.weeklyGoal), [history, settings.weeklyGoal]);
  const last = history[0];
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const sorted = [...routines].sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0));
  // In the narrow list pane on the inner display, a single column reads best.
  const gridCols = unfolded ? 1 : cols;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingTop: insets.top + S.md, paddingHorizontal: gutter, paddingBottom: 120 }}>
      <Row style={{ marginBottom: S.lg }}>
        <View style={{ flex: 1 }}>
          <Txt v="caption">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Txt>
          <Txt v="title">{greet}</Txt>
        </View>
        {streak > 0 ? (
          <View style={styles.streak}>
            <Icon name="fire" size={18} color={C.warn} />
            <Txt v="mono" color={C.warn}>
              {streak}w
            </Txt>
          </View>
        ) : null}
      </Row>

      {active ? (
        <Btn big icon="play" title={`Resume ${active.name}`} onPress={() => router.push('/workout')} testID="resume-workout" />
      ) : (
        <Btn
          big
          icon="plus"
          title="Start empty workout"
          testID="start-empty"
          onPress={() => {
            haptic.done();
            start();
            router.push('/workout');
          }}
        />
      )}

      <Card style={{ marginTop: S.lg, flexDirection: 'row', alignItems: 'center', gap: S.lg }}>
        <Ring size={84} stroke={9} progress={week.workouts / Math.max(1, settings.weeklyGoal)}>
          <Txt v="h2">
            {week.workouts}/{settings.weeklyGoal}
          </Txt>
        </Ring>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt v="h2">This week</Txt>
          <Txt v="caption">
            {week.sets} sets · {fmtVolume(week.volume, settings.unit)}
          </Txt>
          <Txt v="caption">{last ? `Last workout: ${fmtRelativeDay(last.startedAt)} · ${last.name}` : 'No workouts logged yet'}</Txt>
        </View>
      </Card>

      <SectionHeader
        title={`Routines (${routines.length})`}
        action="+ New"
        onAction={() => {
          haptic.tap();
          onOpenRoutine(createRoutine());
        }}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }}>
        {sorted.map((r) => (
          <View key={r.id} style={{ width: gridCols === 1 ? '100%' : `${100 / gridCols - 3}%`, flexGrow: 1 }}>
            <RoutineCard routine={r} selected={selectedId === r.id} onPress={() => onOpenRoutine(r.id)} />
          </View>
        ))}
      </View>

      {!unfolded ? (
        <>
          <SectionHeader title="Muscle recovery" />
          <RecoveryGrid cols={2} />
        </>
      ) : (
        <View style={{ flexDirection: 'row', gap: S.sm, marginTop: S.xl }}>
          <Stat label="All-time workouts" value={String(history.length)} icon="counter" />
        </View>
      )}
    </ScrollView>
  );
}

function RoutineCard({ routine, onPress, selected }: { routine: Routine; onPress: () => void; selected: boolean }) {
  const map = useExerciseMap();
  const active = useStore((s) => !!s.active);
  const start = useStore((s) => s.startWorkout);
  const muscles = Array.from(new Set(routine.exercises.map((e) => map[e.exerciseId]?.muscle).filter(Boolean)));
  return (
    <Pressable
      testID={`routine-${routine.id}`}
      onPress={onPress}
      style={({ pressed }) => [styles.routine, selected && { borderColor: C.accent }, pressed && { backgroundColor: C.surface2 }]}>
      <Row>
        <View style={{ flex: 1 }}>
          <Txt v="h2" numberOfLines={1}>
            {routine.name}
          </Txt>
          <Txt v="caption">
            {routine.exercises.length} exercises
            {routine.lastUsedAt ? ` · ${fmtRelativeDay(routine.lastUsedAt)}` : ''}
          </Txt>
        </View>
        <Pressable
          testID={`start-${routine.id}`}
          disabled={active || !routine.exercises.length}
          onPress={() => {
            haptic.done();
            start(routine.id);
            router.push('/workout');
          }}
          style={[styles.play, (active || !routine.exercises.length) && { opacity: 0.35 }]}
          accessibilityLabel={`Start ${routine.name}`}>
          <Icon name="play" size={22} color={C.onAccent} />
        </Pressable>
      </Row>
      <Txt v="caption" numberOfLines={2} style={{ color: C.dim }}>
        {routine.exercises.map((e) => map[e.exerciseId]?.name).filter(Boolean).join(' · ') || 'No exercises yet'}
      </Txt>
      <Row style={{ gap: 4 }}>
        {muscles.slice(0, 6).map((m) => (
          <View key={m} style={[styles.muscleDot, { backgroundColor: MUSCLE_COLOR[m!] }]} />
        ))}
      </Row>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFB02022',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: R.pill,
  },
  routine: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: S.lg,
    gap: S.sm,
  },
  play: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  muscleDot: { width: 18, height: 6, borderRadius: 3 },
});
