import { useMemo, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';

import { EQUIPMENT, MUSCLES } from '@/lib/exercises-data';
import { useAllExercises, useStore } from '@/lib/store';
import type { Equipment, Exercise, Muscle, TrackingType } from '@/lib/types';
import { fmtRelativeDay } from '@/lib/units';
import { C, MUSCLE_COLOR, R, S } from '@/theme';

import { Btn, Card, Chip, Field, Icon, ListItem, Row, Segmented, Txt } from './ui';

export function MuscleBadge({ muscle, size = 36 }: { muscle: Muscle; size?: number }) {
  const color = MUSCLE_COLOR[muscle] ?? C.dim;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: R.md,
        backgroundColor: color + '22',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Txt style={{ color, fontWeight: '800', fontSize: size * 0.36 }}>{muscle.slice(0, 2).toUpperCase()}</Txt>
    </View>
  );
}

export function ExerciseBrowser({
  onPress,
  selectedIds,
  activeId,
  header,
  gutter = S.lg,
  testID,
}: {
  onPress: (e: Exercise) => void;
  /** When provided, rows show a checkbox (multi-select picker mode). */
  selectedIds?: string[];
  activeId?: string | null;
  header?: React.ReactNode;
  gutter?: number;
  testID?: string;
}) {
  const all = useAllExercises();
  const history = useStore((s) => s.history);
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [creating, setCreating] = useState(false);

  const lastDone = useMemo(() => {
    const m: Record<string, number> = {};
    for (const w of history) for (const ex of w.exercises) m[ex.exerciseId] = Math.max(m[ex.exerciseId] ?? 0, w.startedAt);
    return m;
  }, [history]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = all.filter(
      (e) =>
        (!muscle || e.muscle === muscle || e.secondary?.includes(muscle)) &&
        (!needle || e.name.toLowerCase().includes(needle) || e.equipment.toLowerCase().includes(needle)),
    );
    // Recently used float to the top when not searching, like Strong/Hevy.
    if (!needle && !muscle) {
      const recent = filtered.filter((e) => lastDone[e.id]).sort((a, b) => lastDone[b.id] - lastDone[a.id]).slice(0, 8);
      const rest = filtered.filter((e) => !recent.includes(e));
      return [...recent.map((e) => ({ e, recent: true })), ...rest.map((e) => ({ e, recent: false }))];
    }
    return filtered.map((e) => ({ e, recent: false }));
  }, [all, q, muscle, lastDone]);

  return (
    <FlatList
      testID={testID}
      data={list}
      keyExtractor={(x) => x.e.id}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 120 }}
      initialNumToRender={20}
      ListHeaderComponent={
        <View style={{ gap: S.md, paddingBottom: S.sm }}>
          {header}
          <Field value={q} onChangeText={setQ} placeholder="Search exercises" testID="exercise-search" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }}>
            <Chip label="All" active={!muscle} onPress={() => setMuscle(null)} />
            {MUSCLES.map((m) => (
              <Chip key={m} label={m} active={muscle === m} color={MUSCLE_COLOR[m]} onPress={() => setMuscle(muscle === m ? null : m)} />
            ))}
          </ScrollView>
          {creating ? (
            <NewExerciseForm initialName={q} onDone={() => setCreating(false)} />
          ) : (
            <Btn kind="ghost" icon="plus" title="Create custom exercise" onPress={() => setCreating(true)} style={{ alignSelf: 'flex-start' }} />
          )}
        </View>
      }
      renderItem={({ item, index }) => {
        const { e, recent } = item;
        const sel = selectedIds?.includes(e.id);
        const showRecentHeader = recent && index === 0;
        const showAllHeader = !recent && index > 0 && list[index - 1].recent;
        return (
          <View>
            {showRecentHeader ? <Txt v="label" style={{ marginVertical: S.sm }}>RECENT</Txt> : null}
            {showAllHeader ? <Txt v="label" style={{ marginVertical: S.sm }}>ALL EXERCISES</Txt> : null}
            <ListItem
              testID={`exercise-${e.id}`}
              title={e.name}
              subtitle={`${e.muscle} · ${e.equipment}${lastDone[e.id] ? ` · ${fmtRelativeDay(lastDone[e.id])}` : ''}`}
              left={<MuscleBadge muscle={e.muscle} />}
              selected={activeId === e.id || sel}
              onPress={() => onPress(e)}
              right={
                selectedIds ? (
                  <Icon name={sel ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} color={sel ? C.accent : C.faint} />
                ) : e.custom ? (
                  <Txt v="caption" color={C.purple}>
                    custom
                  </Txt>
                ) : null
              }
            />
          </View>
        );
      }}
      ListEmptyComponent={
        <Txt v="body" color={C.dim} style={{ textAlign: 'center', padding: S.xl }}>
          No exercises match. Create a custom one above.
        </Txt>
      }
    />
  );
}

function NewExerciseForm({ initialName, onDone }: { initialName?: string; onDone: () => void }) {
  const create = useStore((s) => s.createExercise);
  const [name, setName] = useState(initialName ?? '');
  const [muscle, setMuscle] = useState<Muscle>('Chest');
  const [equipment, setEquipment] = useState<Equipment>('Barbell');
  const [tracking, setTracking] = useState<TrackingType>('weight_reps');
  return (
    <Card style={{ gap: S.md }}>
      <Txt v="h2">New exercise</Txt>
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Landmine Press" autoFocus />
      <Txt v="label">Primary muscle</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
        {MUSCLES.map((m) => (
          <Chip key={m} label={m} active={muscle === m} color={MUSCLE_COLOR[m]} onPress={() => setMuscle(m)} />
        ))}
      </View>
      <Txt v="label">Equipment</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
        {EQUIPMENT.map((m) => (
          <Chip key={m} label={m} active={equipment === m} onPress={() => setEquipment(m)} />
        ))}
      </View>
      <Txt v="label">Tracking</Txt>
      <Segmented
        value={tracking}
        onChange={setTracking}
        options={[
          { value: 'weight_reps', label: 'Weight × reps' },
          { value: 'reps', label: 'Reps' },
          { value: 'time', label: 'Time' },
        ]}
      />
      <Row>
        <Btn kind="secondary" title="Cancel" onPress={onDone} style={{ flex: 1 }} />
        <Btn
          title="Save"
          icon="check"
          disabled={!name.trim()}
          style={{ flex: 1 }}
          onPress={() => {
            create({ name: name.trim(), muscle, equipment, tracking, secondary: [] });
            onDone();
          }}
        />
      </Row>
    </Card>
  );
}
