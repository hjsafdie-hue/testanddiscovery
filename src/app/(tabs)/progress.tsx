import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarChart, LineChart } from '@/components/charts';
import { MuscleBadge } from '@/components/exercise-browser';
import { Btn, Card, Empty, Field, Header, Icon, IconBtn, Row, Segmented, Stat, Txt } from '@/components/ui';
import { PR_LABEL, e1rm, isWorking, sessionsFor, weeklyStats, workoutVolume } from '@/lib/stats';
import { useExerciseMap, useStore } from '@/lib/store';
import type { PrKind } from '@/lib/types';
import { fmtDate, fmtRelativeDay, fmtVolume, fmtWeight, fromDisplay, parseNum, toDisplay } from '@/lib/units';
import { C, S, useLayout } from '@/theme';

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const { gutter, unfolded, expanded } = useLayout();
  const history = useStore((s) => s.history);
  const unit = useStore((s) => s.settings.unit);
  const goal = useStore((s) => s.settings.weeklyGoal);
  const map = useExerciseMap();
  const [range, setRange] = useState<'8' | '16'>('8');

  const weeks = useMemo(() => weeklyStats(history, Number(range)), [history, range]);
  const label = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const topLifts = useMemo(() => {
    const count: Record<string, number> = {};
    for (const w of history) for (const e of w.exercises) if (map[e.exerciseId]?.tracking === 'weight_reps') count[e.exerciseId] = (count[e.exerciseId] ?? 0) + 1;
    return Object.entries(count)
      .sort((a, b) => b[1] - a[1])
      .slice(0, unfolded ? 6 : 4)
      .map(([id]) => id);
  }, [history, map, unfolded]);

  const recentPrs = useMemo(() => {
    const out: { id: string; exerciseId: string; date: number; weight?: number; reps?: number; kinds: PrKind[] }[] = [];
    for (const w of history) {
      for (const e of w.exercises) {
        for (const s of e.sets) if (s.pr?.length) out.push({ id: s.id, exerciseId: e.exerciseId, date: w.startedAt, weight: s.weight, reps: s.reps, kinds: s.pr });
      }
      if (out.length > 12) break;
    }
    return out.slice(0, 12);
  }, [history]);

  const totalVolume = useMemo(() => history.reduce((a, w) => a + workoutVolume(w), 0), [history]);
  const totalTime = useMemo(() => history.reduce((a, w) => a + ((w.endedAt ?? w.startedAt) - w.startedAt), 0), [history]);

  if (!history.length) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top, paddingHorizontal: gutter }}>
        <Header title="Progress" />
        <Empty icon="chart-line" title="No data yet" body="Log a few workouts — or load sample data in Settings to explore the charts.">
          <Btn kind="secondary" title="Go to Settings" onPress={() => router.navigate('/settings')} />
        </Empty>
      </View>
    );
  }

  const col = { flexBasis: unfolded ? '48%' : '100%', flexGrow: 1 } as const;

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: gutter, paddingBottom: 120, gap: S.md }}>
      <Header
        title="Progress"
        right={
          <View style={{ width: 120 }}>
            <Segmented value={range} onChange={setRange} options={[{ value: '8', label: '8w' }, { value: '16', label: '16w' }]} />
          </View>
        }
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
        <Stat label="Workouts" value={String(history.length)} icon="counter" />
        <Stat label="Total volume" value={fmtVolume(totalVolume, unit)} icon="weight" color={C.info} />
        <Stat label="Time trained" value={`${Math.round(totalTime / 3600000)}h`} icon="clock-outline" color={C.purple} />
        {expanded ? <Stat label="PRs" value={String(history.reduce((a, w) => a + w.exercises.reduce((b, e) => b + e.sets.filter((s) => s.pr).length, 0), 0))} icon="trophy" color={C.gold} /> : null}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }}>
        <Card style={[col, { gap: S.sm }]}>
          <Txt v="h2">Workouts per week</Txt>
          <Txt v="caption">Dashed line = goal of {goal}</Txt>
          <BarChart goal={goal} data={weeks.map((w, i) => ({ label: label(w.weekStart), value: w.workouts, highlight: i === weeks.length - 1 }))} />
        </Card>
        <Card style={[col, { gap: S.sm }]}>
          <Txt v="h2">Weekly volume</Txt>
          <Txt v="caption">Working sets only, in {unit}</Txt>
          <BarChart
            color={C.info}
            data={weeks.map((w, i) => ({ label: label(w.weekStart), value: toDisplay(w.volume, unit), highlight: i === weeks.length - 1 }))}
            format={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(Math.round(v)))}
          />
        </Card>
      </View>

      <Txt v="label" style={{ marginTop: S.md }}>
        TOP LIFTS · ESTIMATED 1RM
      </Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }}>
        {topLifts.map((id) => {
          const meta = map[id];
          const sessions = sessionsFor(id, history);
          const pts = sessions.map((s) => ({
            x: s.date,
            y: toDisplay(Math.max(...s.sets.filter(isWorking).map((x) => e1rm(x.weight ?? 0, x.reps ?? 0)), 0), unit),
          }));
          const best = Math.max(...pts.map((p) => p.y));
          const first = pts[pts.length - 1]?.y ?? 0;
          const delta = Math.round((pts[0]?.y - first) * 10) / 10;
          return (
            <Pressable
              key={id}
              style={[col, { flexBasis: expanded ? '31%' : col.flexBasis }]}
              onPress={() => router.push({ pathname: '/exercise/[id]', params: { id } })}>
              <Card style={{ gap: S.sm }}>
                <Row>
                  {meta ? <MuscleBadge muscle={meta.muscle} size={30} /> : null}
                  <Txt v="h2" style={{ flex: 1 }} numberOfLines={1}>
                    {meta?.name}
                  </Txt>
                  <Icon name="chevron-right" color={C.faint} />
                </Row>
                <Row>
                  <Txt v="title">{best}</Txt>
                  <Txt v="caption">{unit}</Txt>
                  <View style={{ flex: 1 }} />
                  {delta ? (
                    <Txt v="label" color={delta > 0 ? C.success : C.danger}>
                      {delta > 0 ? '▲' : '▼'} {Math.abs(delta)} {unit}
                    </Txt>
                  ) : null}
                </Row>
                <LineChart data={pts} height={110} />
              </Card>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md, marginTop: S.md }}>
        <Card style={[col, { gap: S.sm }]}>
          <Row>
            <Icon name="trophy" color={C.gold} />
            <Txt v="h2">Recent PRs</Txt>
          </Row>
          {recentPrs.length === 0 ? (
            <Txt v="body" color={C.dim}>
              Beat a previous best and it will show up here.
            </Txt>
          ) : (
            recentPrs.map((p) => (
              <Row key={p.id} style={{ paddingVertical: 4 }}>
                <View style={{ flex: 1 }}>
                  <Txt v="body" style={{ fontWeight: '600' }} numberOfLines={1}>
                    {map[p.exerciseId]?.name}
                  </Txt>
                  <Txt v="caption">
                    {p.kinds.map((k) => PR_LABEL[k]).join(' · ')} · {fmtRelativeDay(p.date)}
                  </Txt>
                </View>
                <Txt v="mono">
                  {p.weight ? `${fmtWeight(p.weight, unit)}×${p.reps}` : `${p.reps} reps`}
                </Txt>
              </Row>
            ))
          )}
        </Card>
        <View style={col}>
          <BodyweightCard />
        </View>
      </View>
    </ScrollView>
  );
}

function BodyweightCard() {
  const entries = useStore((s) => s.bodyweight);
  const unit = useStore((s) => s.settings.unit);
  const add = useStore((s) => s.addBodyweight);
  const remove = useStore((s) => s.removeBodyweight);
  const [text, setText] = useState('');
  const pts = entries.map((e) => ({ x: e.date, y: toDisplay(e.kg, unit) }));
  return (
    <Card style={{ gap: S.sm }}>
      <Row>
        <Icon name="scale-bathroom" color={C.info} />
        <Txt v="h2" style={{ flex: 1 }}>
          Body weight
        </Txt>
        {entries[0] ? <Txt v="mono">{fmtWeight(entries[0].kg, unit, true)}</Txt> : null}
      </Row>
      {pts.length > 1 ? <LineChart data={pts} height={120} color={C.info} format={(v) => v.toFixed(1)} /> : null}
      <Row>
        <View style={{ flex: 1 }}>
          <Field value={text} onChangeText={setText} keyboardType="decimal-pad" placeholder={`Today's weight (${unit})`} />
        </View>
        <Btn
          title="Log"
          icon="plus"
          disabled={!parseNum(text)}
          onPress={() => {
            const v = parseNum(text);
            if (v) add(fromDisplay(v, unit));
            setText('');
          }}
        />
      </Row>
      {entries.slice(0, 5).map((e) => (
        <Row key={e.id}>
          <Txt v="caption" style={{ flex: 1 }}>
            {fmtDate(e.date)}
          </Txt>
          <Txt v="mono">{fmtWeight(e.kg, unit, true)}</Txt>
          <IconBtn name="close" size={16} color={C.faint} label="Delete entry" onPress={() => remove(e.id)} />
        </Row>
      ))}
    </Card>
  );
}
