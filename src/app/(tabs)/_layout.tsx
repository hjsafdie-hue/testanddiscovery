import { router } from 'expo-router';
import { TabList, TabSlot, TabTrigger, type TabTriggerSlotProps, Tabs } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNow } from '@/components/tools';
import { Icon, type IconName, Txt } from '@/components/ui';
import { haptic } from '@/lib/device';
import { useStore } from '@/lib/store';
import { fmtClock } from '@/lib/units';
import { C, R, RAIL_WIDTH, S, useLayout } from '@/theme';

const TABS: { name: string; href: '/' | '/history' | '/exercises' | '/progress' | '/settings'; label: string; icon: IconName; iconOn: IconName }[] = [
  { name: 'index', href: '/', label: 'Train', icon: 'dumbbell', iconOn: 'dumbbell' },
  { name: 'history', href: '/history', label: 'History', icon: 'calendar-blank-outline', iconOn: 'calendar-check' },
  { name: 'exercises', href: '/exercises', label: 'Exercises', icon: 'format-list-bulleted', iconOn: 'format-list-checks' },
  { name: 'progress', href: '/progress', label: 'Progress', icon: 'chart-line', iconOn: 'chart-line' },
  { name: 'settings', href: '/settings', label: 'Settings', icon: 'cog-outline', iconOn: 'cog' },
];

/**
 * Adaptive shell for the Galaxy Z Fold:
 *  - cover screen  → Material bottom navigation bar
 *  - inner screen  → navigation rail on the left (thumb-reachable when holding the open device)
 * The navigator sits above the layout switch, so folding/unfolding keeps you on the same tab
 * with all screen state intact.
 */
export default function TabsLayout() {
  const { unfolded } = useLayout();
  const insets = useSafeAreaInsets();
  return (
    <Tabs style={{ flex: 1, flexDirection: unfolded ? 'row-reverse' : 'column', backgroundColor: C.bg }}>
      <View style={{ flex: 1 }}>
        <TabSlot style={{ flex: 1 }} />
        <ActiveWorkoutBar />
      </View>
      <TabList
        style={
          unfolded
            ? [styles.rail, { paddingTop: insets.top + S.lg, paddingBottom: insets.bottom + S.lg }]
            : [styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]
        }>
        {unfolded ? (
          <View style={{ alignItems: 'center', gap: S.lg, marginBottom: S.lg }}>
            <View style={styles.logo}>
              <Icon name="arm-flex" size={26} color={C.onAccent} />
            </View>
            <StartFab />
          </View>
        ) : null}
        {TABS.map((t) => (
          <TabTrigger key={t.name} name={t.name} href={t.href} asChild>
            <NavItem tab={t} rail={unfolded} />
          </TabTrigger>
        ))}
      </TabList>
    </Tabs>
  );
}

function NavItem({
  tab,
  rail,
  isFocused,
  ref: _ref,
  ...props
}: { tab: (typeof TABS)[number]; rail?: boolean } & TabTriggerSlotProps) {
  const on = !!isFocused;
  return (
    <Pressable
      {...props}
      onPress={(e) => {
        haptic.tap();
        props.onPress?.(e);
      }}
      testID={`tab-${tab.name}`}
      accessibilityRole="tab"
      accessibilityState={{ selected: on }}
      accessibilityLabel={tab.label}
      style={rail ? styles.railItem : styles.barItem}>
      <View style={[styles.indicator, on && { backgroundColor: C.accentDim }]}>
        <Icon name={on ? tab.iconOn : tab.icon} size={24} color={on ? C.accent : C.dim} />
      </View>
      <Txt v="caption" style={{ color: on ? C.text : C.dim, fontWeight: on ? '700' : '500', fontSize: 12 }}>
        {tab.label}
      </Txt>
    </Pressable>
  );
}

/** Rail FAB: start or resume a workout from anywhere when unfolded. */
function StartFab() {
  const active = useStore((s) => !!s.active);
  const start = useStore((s) => s.startWorkout);
  return (
    <Pressable
      testID="rail-start"
      accessibilityLabel={active ? 'Resume workout' : 'Start empty workout'}
      onPress={() => {
        haptic.done();
        if (!active) start();
        router.push('/workout');
      }}
      style={styles.fab}>
      <Icon name={active ? 'play' : 'plus'} size={28} color={C.onAccent} />
    </Pressable>
  );
}

/** Persistent "workout in progress" bar, like Strong/Hevy. */
function ActiveWorkoutBar() {
  const active = useStore((s) => s.active);
  const rest = useStore((s) => s.rest);
  const now = useNow(1000, !!active);
  if (!active) return null;
  const elapsed = (now - active.startedAt) / 1000;
  const done = active.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  const total = active.exercises.reduce((a, e) => a + e.sets.length, 0);
  const restLeft = rest.endsAt ? Math.max(0, (rest.endsAt - now) / 1000) : 0;
  return (
    <Pressable
      testID="active-workout-bar"
      onPress={() => router.push('/workout')}
      style={({ pressed }) => [styles.activeBar, { opacity: pressed ? 0.85 : 1 }]}>
      <View style={styles.pulse} />
      <View style={{ flex: 1 }}>
        <Txt v="body" style={{ fontWeight: '800', color: C.onAccent }} numberOfLines={1}>
          {active.name}
        </Txt>
        <Txt v="caption" style={{ color: C.onAccent, opacity: 0.75 }}>
          {fmtClock(elapsed)} · {done}/{total} sets
        </Txt>
      </View>
      {restLeft > 0 ? (
        <View style={styles.restPill}>
          <Icon name="timer-sand" size={14} color={C.accent} />
          <Txt v="mono" style={{ color: C.accent, fontSize: 14 }}>
            {fmtClock(restLeft)}
          </Txt>
        </View>
      ) : null}
      <Icon name="chevron-up" color={C.onAccent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: RAIL_WIDTH,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: C.border,
    gap: S.sm,
  },
  logo: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railItem: { alignItems: 'center', gap: 4, paddingVertical: 4, width: 80 },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: C.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    paddingTop: 8,
  },
  barItem: { flex: 1, alignItems: 'center', gap: 2 },
  indicator: { width: 56, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  activeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    backgroundColor: C.accent,
    marginHorizontal: S.sm,
    marginBottom: S.sm,
    paddingHorizontal: S.lg,
    paddingVertical: 10,
    borderRadius: R.lg,
  },
  pulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.onAccent },
  restPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.onAccent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: R.pill,
  },
});
