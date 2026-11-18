import { Alert, Platform, Switch, View } from 'react-native';

import { Stepper } from '@/components/routine-editor';
import { PlateCalculator } from '@/components/tools';
import { Btn, Card, Header, Row, Screen, SectionHeader, Segmented, Txt } from '@/components/ui';
import { useStore } from '@/lib/store';
import { fmtClock, toDisplay, fromDisplay } from '@/lib/units';
import { C, S, useLayout } from '@/theme';

function ToggleRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Row style={{ paddingVertical: 6 }}>
      <View style={{ flex: 1 }}>
        <Txt v="body" style={{ fontWeight: '600' }}>
          {label}
        </Txt>
        {hint ? <Txt v="caption">{hint}</Txt> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: C.accent, false: C.surface3 }} thumbColor={C.text} />
    </Row>
  );
}

function confirm(title: string, body: string, action: string, go: () => void) {
  if (Platform.OS === 'web') return go();
  Alert.alert(title, body, [
    { text: 'Cancel', style: 'cancel' },
    { text: action, style: 'destructive', onPress: go },
  ]);
}

export default function SettingsScreen() {
  const { unfolded } = useLayout();
  const s = useStore((st) => st.settings);
  const update = useStore((st) => st.updateSettings);
  const loadSample = useStore((st) => st.loadSampleData);
  const reset = useStore((st) => st.resetAll);
  const counts = { w: useStore((st) => st.history.length), r: useStore((st) => st.routines.length) };

  const barOptions = s.unit === 'kg' ? [20, 15, 10] : [45, 35, 25];

  const general = (
    <Card style={{ gap: S.md }}>
      <Txt v="label">UNITS</Txt>
      <Segmented
        value={s.unit}
        onChange={(unit) => update({ unit, barWeightKg: unit === 'kg' ? 20 : fromDisplay(45, 'lb') })}
        options={[
          { value: 'kg', label: 'Kilograms' },
          { value: 'lb', label: 'Pounds' },
        ]}
      />
      <Txt v="label">BARBELL WEIGHT</Txt>
      <Segmented
        value={String(Math.round(toDisplay(s.barWeightKg, s.unit)))}
        onChange={(v) => update({ barWeightKg: fromDisplay(Number(v), s.unit) })}
        options={barOptions.map((b) => ({ value: String(b), label: `${b} ${s.unit}` }))}
      />
      <Row style={{ justifyContent: 'space-around', flexWrap: 'wrap', gap: S.md }}>
        <Stepper label="Default rest" value={s.defaultRestSec} step={15} min={0} max={600} format={fmtClock} onChange={(v) => update({ defaultRestSec: v })} />
        <Stepper label="Weekly goal" value={s.weeklyGoal} min={1} max={14} onChange={(v) => update({ weeklyGoal: v })} />
      </Row>
    </Card>
  );

  const behaviour = (
    <Card style={{ gap: 2 }}>
      <ToggleRow label="Auto-start rest timer" hint="Starts when you tick off a working set" value={s.autoStartRest} onChange={(v) => update({ autoStartRest: v })} />
      <ToggleRow label="Rest-over notification" hint="Alerts you even if the phone is folded or locked" value={s.restNotifications} onChange={(v) => update({ restNotifications: v })} />
      <ToggleRow label="Haptic feedback" value={s.haptics} onChange={(v) => update({ haptics: v })} />
      <ToggleRow label="Keep screen on while training" value={s.keepAwake} onChange={(v) => update({ keepAwake: v })} />
    </Card>
  );

  const data = (
    <Card style={{ gap: S.md }}>
      <Txt v="caption">
        {counts.w} workouts · {counts.r} routines stored on this device
      </Txt>
      <Btn
        kind="secondary"
        icon="database-import-outline"
        title="Load 10 weeks of sample data"
        onPress={() => confirm('Load sample data?', 'This replaces your history and routines with a demo PPL program.', 'Load', loadSample)}
      />
      <Btn kind="danger" icon="delete-forever-outline" title="Erase all data" onPress={() => confirm('Erase everything?', 'All workouts, routines and settings will be deleted.', 'Erase', reset)} />
    </Card>
  );

  return (
    <Screen>
      <Header title="Settings" />
      <View style={{ flexDirection: unfolded ? 'row' : 'column', gap: S.lg, alignItems: 'flex-start' }}>
        <View style={{ flex: 1, alignSelf: 'stretch', gap: S.sm }}>
          <SectionHeader title="General" />
          {general}
          <SectionHeader title="During workouts" />
          {behaviour}
        </View>
        <View style={{ flex: 1, alignSelf: 'stretch', gap: S.sm }}>
          <SectionHeader title="Tools" />
          <PlateCalculator />
          <SectionHeader title="Data" />
          {data}
          <Txt v="caption" style={{ textAlign: 'center', marginTop: S.lg }}>
            Ironfold · built for Galaxy Z Fold
          </Txt>
        </View>
      </View>
    </Screen>
  );
}
