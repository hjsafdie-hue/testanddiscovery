import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExerciseBrowser } from '@/components/exercise-browser';
import { ExerciseDetail } from '@/components/exercise-detail';
import { PlateCalculator, RestBar, RestPanel, useNow } from '@/components/tools';
import { Btn, Card, Empty, Icon, IconBtn, Row, Segmented, Stat, Txt } from '@/components/ui';
import { WorkoutExerciseList } from '@/components/workout-logger';
import { haptic } from '@/lib/device';
import { overloadHint, workoutSetCount, workoutVolume } from '@/lib/stats';
import { useStore } from '@/lib/store';
import { fmtClock, fmtVolume } from '@/lib/units';
import { C, R, S, useLayout } from '@/theme';

type SidePanel = 'tools' | 'add' | 'exercise';

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function WorkoutScreen() {
  const active = useStore((s) => s.active);
  const { unfolded, width, gutter } = useLayout();
  const insets = useSafeAreaInsets();
  const [focusId, setFocusId] = useState<string | null>(null);
  const [panel, setPanel] = useState<SidePanel>('tools');

  if (!active) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: C.bg, justifyContent: 'center' }}>
        <Empty icon="dumbbell" title="No workout in progress" body="Start one from the Train tab.">
          <Btn title="Back to Train" onPress={() => router.replace('/')} />
        </Empty>
      </View>
    );
  }

  const focusedExerciseId = focusId ?? active.exercises[0]?.exerciseId ?? null;
  const onFocus = (exerciseId: string) => {
    setFocusId(exerciseId);
    if (unfolded && panel === 'add') setPanel('exercise');
  };

  const addExercises = () => {
    if (unfolded) setPanel('add');
    else router.push({ pathname: '/pick-exercise', params: { target: 'workout' } });
  };

  const logger = (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <WorkoutHeader />
      {!unfolded ? (
        <View style={{ paddingHorizontal: gutter, paddingBottom: S.sm }}>
          <RestBar />
        </View>
      ) : null}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: unfolded ? S.lg : gutter, paddingBottom: insets.bottom + 120, gap: S.md }}>
        {active.exercises.length === 0 ? (
          <Card style={{ alignItems: 'center', gap: S.sm, paddingVertical: S.xxl }}>
            <Icon name="playlist-plus" size={40} color={C.accent} />
            <Txt v="h2">Add your first exercise</Txt>
            <Txt v="caption" style={{ textAlign: 'center' }}>
              {unfolded ? 'Pick from the library on the right →' : 'Your previous numbers will be pre-filled.'}
            </Txt>
          </Card>
        ) : (
          <WorkoutExerciseList
            compact={(unfolded ? width / 2 : width) < 360}
            focusedExerciseId={unfolded ? focusedExerciseId : null}
            onFocus={onFocus}
            onOpenExercise={
              unfolded
                ? (id) => {
                    setFocusId(id);
                    setPanel('exercise');
                  }
                : (id) => router.push({ pathname: '/exercise/[id]', params: { id } })
            }
          />
        )}
        <Btn big kind="secondary" icon="plus" title="Add exercises" onPress={addExercises} testID="add-exercises" />
        <Btn
          kind="danger"
          icon="close"
          title="Discard workout"
          onPress={() => {
            const go = () => {
              useStore.getState().discardWorkout();
              leave();
            };
            if (Platform.OS === 'web') go();
            else Alert.alert('Discard workout?', 'Nothing from this session will be saved.', [
              { text: 'Keep training', style: 'cancel' },
              { text: 'Discard', style: 'destructive', onPress: go },
            ]);
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );

  if (!unfolded) {
    return <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: C.bg }}>{logger}</View>;
  }

  // Inner display: logger on the left half, live tools on the right half — the hinge splits them.
  return (
    <View style={{ flex: 1, flexDirection: 'row', paddingTop: insets.top, backgroundColor: C.bg }}>
      <View style={{ width: width / 2, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: C.border }}>{logger}</View>
      <View style={{ flex: 1 }}>
        <View style={{ padding: S.lg, paddingBottom: S.sm }}>
          <Segmented
            value={panel}
            onChange={setPanel}
            options={[
              { value: 'tools', label: 'Timer & tools', icon: 'timer-outline' },
              { value: 'add', label: 'Add', icon: 'plus' },
              { value: 'exercise', label: 'History', icon: 'history' },
            ]}
          />
        </View>
        {panel === 'add' ? (
          <ExerciseBrowser
            testID="side-browser"
            onPress={(e) => {
              haptic.done();
              useStore.getState().addExercises([e.id]);
              setFocusId(e.id);
            }}
            header={
              <Txt v="caption" color={C.dim}>
                Tap to add — it appears at the bottom of your workout on the left.
              </Txt>
            }
          />
        ) : (
          <ScrollView contentContainerStyle={{ padding: S.lg, paddingTop: S.sm, gap: S.md, paddingBottom: insets.bottom + 60 }} keyboardShouldPersistTaps="handled">
            {panel === 'tools' ? (
              <ToolsPanel focusedExerciseId={focusedExerciseId} />
            ) : focusedExerciseId ? (
              <ExerciseDetail exerciseId={focusedExerciseId} />
            ) : (
              <Empty icon="history" title="No exercise selected" body="Tap an exercise on the left to see its history here." />
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

function ToolsPanel({ focusedExerciseId }: { focusedExerciseId: string | null }) {
  const active = useStore((s) => s.active)!;
  const history = useStore((s) => s.history);
  const unit = useStore((s) => s.settings.unit);
  const entry = active.exercises.find((e) => e.exerciseId === focusedExerciseId);
  const nextSet = entry?.sets.find((s) => !s.done);
  const hint = focusedExerciseId ? overloadHint(focusedExerciseId, history, unit, entry?.targetReps) : null;
  const plateKg = nextSet?.weight ?? hint?.weight;
  return (
    <>
      <RestPanel />
      <Row style={{ flexWrap: 'wrap' }}>
        <Stat label="Volume" value={fmtVolume(workoutVolume(active), unit)} icon="weight" color={C.info} />
        <Stat label="Sets done" value={String(workoutSetCount(active))} icon="check-all" color={C.success} />
      </Row>
      <PlateCalculator key={`${plateKg ?? 0}-${unit}`} initialKg={plateKg} />
    </>
  );
}

function WorkoutHeader() {
  const active = useStore((s) => s.active)!;
  const rename = useStore((s) => s.renameActive);
  const finish = useStore((s) => s.finishWorkout);
  const now = useNow(1000);
  const { gutter, unfolded } = useLayout();
  const [editing, setEditing] = useState(false);

  const doFinish = () => {
    const pending = active.exercises.reduce((a, e) => a + e.sets.filter((s) => !s.done).length, 0);
    const go = () => {
      const id = finish();
      if (id) router.replace({ pathname: '/session/[id]', params: { id, celebrate: '1' } });
      else leave();
    };
    if (Platform.OS === 'web' || pending === 0) return go();
    Alert.alert(
      'Finish workout?',
      `${pending} unfinished set${pending > 1 ? 's' : ''} will be dropped.`,
      [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Finish', onPress: go },
      ],
    );
  };

  return (
    <View style={[styles.header, { paddingHorizontal: unfolded ? S.lg : gutter }]}>
      <IconBtn name="chevron-down" label="Minimise workout" onPress={leave} />
      <View style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <TextInput
            autoFocus
            value={active.name}
            onChangeText={rename}
            onBlur={() => setEditing(false)}
            onSubmitEditing={() => setEditing(false)}
            style={styles.nameInput}
            selectionColor={C.accent}
          />
        ) : (
          <Pressable onPress={() => setEditing(true)}>
            <Txt v="h2" numberOfLines={1}>
              {active.name} <Icon name="pencil" size={14} color={C.faint} />
            </Txt>
          </Pressable>
        )}
        <Txt v="mono" color={C.accent} style={{ fontSize: 13 }}>
          {fmtClock((now - active.startedAt) / 1000)}
        </Txt>
      </View>
      <Btn title="Finish" icon="flag-checkered" onPress={doFinish} testID="finish-workout" />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingVertical: S.sm },
  nameInput: {
    color: C.text,
    fontSize: 18,
    fontWeight: '700',
    backgroundColor: C.surface2,
    borderRadius: R.sm,
    paddingHorizontal: 8,
    height: 36,
  },
});
