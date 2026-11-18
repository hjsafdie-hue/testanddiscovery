import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MonthCalendar, dayKey } from '@/components/tools';
import { TwoPane } from '@/components/two-pane';
import { Empty, Header, Icon, ListItem, Pill, Row, Txt } from '@/components/ui';
import { WorkoutDetail } from '@/components/workout-detail';
import { workoutPrCount, workoutSetCount, workoutVolume } from '@/lib/stats';
import { useStore } from '@/lib/store';
import { fmtDate, fmtDuration, fmtVolume } from '@/lib/units';
import { C, S, useLayout } from '@/theme';

export default function HistoryScreen() {
  const { unfolded, gutter } = useLayout();
  const insets = useSafeAreaInsets();
  const history = useStore((s) => s.history);
  const unit = useStore((s) => s.settings.unit);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [day, setDay] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const marked = useMemo(() => new Set(history.map((w) => dayKey(w.startedAt))), [history]);
  const list = useMemo(() => (day ? history.filter((w) => dayKey(w.startedAt) === day) : history), [history, day]);
  const selectedId = selected && history.some((w) => w.id === selected) ? selected : (unfolded ? list[0]?.id : null) ?? null;

  const open = (id: string) => {
    if (unfolded) setSelected(id);
    else router.push({ pathname: '/session/[id]', params: { id } });
  };

  const listView = (
    <FlatList
      data={list}
      keyExtractor={(w) => w.id}
      contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: gutter, paddingBottom: 120 }}
      ListHeaderComponent={
        <View style={{ gap: S.md, marginBottom: S.md }}>
          <Header title="History" subtitle={`${history.length} workouts logged`} />
          <MonthCalendar month={month} onMonth={setMonth} marked={marked} selectedDay={day} onSelectDay={setDay} />
          {day ? (
            <Txt v="label" color={C.accent} onPress={() => setDay(null)}>
              Showing one day · tap to clear
            </Txt>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <Empty icon="calendar-blank" title={day ? 'Rest day' : 'No workouts yet'} body={day ? undefined : 'Finish a workout and it will show up here.'} />
      }
      renderItem={({ item: w }) => {
        const prs = workoutPrCount(w);
        return (
          <ListItem
            testID={`history-${w.id}`}
            selected={unfolded && selectedId === w.id}
            onPress={() => open(w.id)}
            title={w.name}
            subtitle={`${fmtDate(w.startedAt)} · ${w.endedAt ? fmtDuration(w.endedAt - w.startedAt) : ''} · ${workoutSetCount(w)} sets · ${fmtVolume(workoutVolume(w), unit)}`}
            left={
              <View style={{ width: 44, alignItems: 'center' }}>
                <Txt v="h2">{new Date(w.startedAt).getDate()}</Txt>
                <Txt v="caption">{new Date(w.startedAt).toLocaleDateString(undefined, { month: 'short' })}</Txt>
              </View>
            }
            right={
              <Row>
                {prs ? <Pill text={String(prs)} color={C.gold} icon="trophy" /> : null}
                <Icon name="chevron-right" color={C.faint} />
              </Row>
            }
          />
        );
      }}
    />
  );

  if (!unfolded) return listView;
  return (
    <TwoPane
      list={listView}
      detail={
        selectedId ? (
          <WorkoutDetail
            workoutId={selectedId}
            onDeleted={() => setSelected(null)}
            onOpenExercise={(id) => router.push({ pathname: '/exercise/[id]', params: { id } })}
          />
        ) : (
          <Empty icon="calendar-search" title="Pick a workout" body="Select a session to see every set." />
        )
      }
    />
  );
}
