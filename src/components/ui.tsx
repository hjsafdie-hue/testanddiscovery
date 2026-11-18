import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps, ReactNode } from 'react';
import {
  Pressable,
  type PressableProps,
  ScrollView,
  type ScrollViewProps,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextProps,
  View,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/lib/device';
import { C, R, S, useLayout } from '@/theme';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function Icon({ name, size = 22, color = C.text }: { name: IconName; size?: number; color?: string }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

type TxtVariant = 'display' | 'title' | 'h2' | 'body' | 'label' | 'caption' | 'mono';

const textStyles = StyleSheet.create({
  display: { fontSize: 34, fontWeight: '800', letterSpacing: -0.8, color: C.text },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color: C.text },
  h2: { fontSize: 18, fontWeight: '700', color: C.text },
  body: { fontSize: 15, color: C.text },
  label: { fontSize: 13, fontWeight: '600', color: C.dim, letterSpacing: 0.2 },
  caption: { fontSize: 12, color: C.dim },
  mono: { fontSize: 15, fontVariant: ['tabular-nums'], color: C.text, fontWeight: '600' },
});

export function Txt({
  v = 'body',
  color,
  style,
  ...rest
}: TextProps & { v?: TxtVariant; color?: string }) {
  return <Text {...rest} style={[textStyles[v], color ? { color } : null, style]} />;
}

export function Card({ style, padded = true, ...rest }: ViewProps & { padded?: boolean }) {
  return <View {...rest} style={[styles.card, padded && { padding: S.lg }, style]} />;
}

type BtnKind = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Btn({
  title,
  icon,
  kind = 'primary',
  onPress,
  style,
  disabled,
  big,
  testID,
}: {
  title: string;
  icon?: IconName;
  kind?: BtnKind;
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
  big?: boolean;
  testID?: string;
}) {
  const bg = kind === 'primary' ? C.accent : kind === 'danger' ? '#FF5A5F1F' : kind === 'secondary' ? C.surface2 : 'transparent';
  const fg = kind === 'primary' ? C.onAccent : kind === 'danger' ? C.danger : kind === 'ghost' ? C.accent : C.text;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.btn,
        big && styles.btnBig,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        style,
      ]}>
      {icon ? <Icon name={icon} size={big ? 22 : 18} color={fg} /> : null}
      <Text style={[styles.btnText, big && { fontSize: 17 }, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function IconBtn({
  name,
  onPress,
  color = C.text,
  size = 22,
  bg,
  label,
  style,
  testID,
}: {
  name: IconName;
  onPress?: () => void;
  color?: string;
  size?: number;
  bg?: string;
  label: string;
  style?: ViewStyle;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      style={({ pressed }) => [styles.iconBtn, bg ? { backgroundColor: bg } : null, { opacity: pressed ? 0.6 : 1 }, style]}>
      <Icon name={name} size={size} color={color} />
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
  color = C.accent,
  icon,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
  icon?: IconName;
}) {
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}>
      {icon ? <Icon name={icon} size={15} color={active ? C.onAccent : C.dim} /> : null}
      <Text style={[styles.chipText, active && { color: C.onAccent }]}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              haptic.tap();
              onChange(o.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[styles.segmentItem, on && { backgroundColor: C.surface3 }]}>
            {o.icon ? <Icon name={o.icon} size={16} color={on ? C.accent : C.dim} /> : null}
            <Text style={[styles.segmentText, on && { color: C.text }]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field(props: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: 6 }}>
      {label ? <Txt v="label">{label}</Txt> : null}
      <TextInput placeholderTextColor={C.faint} selectionColor={C.accent} {...rest} style={[styles.field, style]} />
    </View>
  );
}

export function Stat({ label, value, icon, color = C.accent }: { label: string; value: string; icon?: IconName; color?: string }) {
  return (
    <View style={styles.stat}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon ? <Icon name={icon} size={16} color={color} /> : null}
        <Txt v="caption" numberOfLines={1}>
          {label}
        </Txt>
      </View>
      <Txt v="h2" style={{ fontSize: 20, fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Txt>
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Txt v="label" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
        {title}
      </Txt>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Txt v="label" color={C.accent}>
            {action}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Empty({ icon, title, body, children }: { icon: IconName; title: string; body?: string; children?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={34} color={C.accent} />
      </View>
      <Txt v="h2" style={{ textAlign: 'center' }}>
        {title}
      </Txt>
      {body ? (
        <Txt v="body" color={C.dim} style={{ textAlign: 'center', maxWidth: 340 }}>
          {body}
        </Txt>
      ) : null}
      {children}
    </View>
  );
}

/** Top-level page header with optional trailing actions. */
export function Header({ title, subtitle, right, onBack }: { title: string; subtitle?: string; right?: ReactNode; onBack?: () => void }) {
  return (
    <View style={styles.header}>
      {onBack ? <IconBtn name="arrow-left" label="Back" onPress={onBack} /> : null}
      <View style={{ flex: 1 }}>
        <Txt v="title" numberOfLines={1}>
          {title}
        </Txt>
        {subtitle ? <Txt v="caption">{subtitle}</Txt> : null}
      </View>
      {right ? <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>{right}</View> : null}
    </View>
  );
}

/** Safe-area aware screen. The tab shell already handles the bottom inset for tab pages. */
export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  contentStyle,
  ...rest
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom')[];
  contentStyle?: ViewStyle;
} & ScrollViewProps) {
  const insets = useSafeAreaInsets();
  const { gutter } = useLayout();
  const pad = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
  };
  if (!scroll) return <View style={[{ flex: 1, backgroundColor: C.bg }, pad]}>{children}</View>;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={[pad, { paddingHorizontal: gutter, paddingBottom: pad.paddingBottom + 32 }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      {...rest}>
      {children}
    </ScrollView>
  );
}

export function Pill({ text, color = C.accent, icon }: { text: string; color?: string; icon?: IconName }) {
  return (
    <View style={[styles.pill, { backgroundColor: color + '22' }]}>
      {icon ? <Icon name={icon} size={12} color={color} /> : null}
      <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

export function Row({ style, ...rest }: ViewProps) {
  return <View {...rest} style={[{ flexDirection: 'row', alignItems: 'center', gap: S.sm }, style]} />;
}

export function ListItem({
  title,
  subtitle,
  left,
  right,
  onPress,
  selected,
  testID,
}: {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  onPress?: PressableProps['onPress'];
  selected?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.listItem, selected && styles.listItemSel, pressed && { backgroundColor: C.surface2 }]}>
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt v="body" style={{ fontWeight: '600' }} numberOfLines={1}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt v="caption" numberOfLines={1}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: R.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: R.md,
  },
  btnBig: { minHeight: 56, borderRadius: R.lg, paddingHorizontal: 20 },
  btnText: { fontSize: 15, fontWeight: '700' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  chipText: { color: C.dim, fontSize: 13, fontWeight: '600' },
  segment: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: R.md, padding: 3, gap: 3 },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    borderRadius: R.sm + 2,
  },
  segmentText: { color: C.dim, fontWeight: '700', fontSize: 13 },
  field: {
    backgroundColor: C.surface2,
    color: C.text,
    borderRadius: R.md,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 16,
  },
  stat: {
    flex: 1,
    minWidth: 120,
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.md,
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: S.xl,
    marginBottom: S.sm,
  },
  empty: { alignItems: 'center', justifyContent: 'center', gap: S.sm, padding: S.xxl },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: S.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingVertical: S.md },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: R.pill },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    paddingVertical: 12,
    paddingHorizontal: S.md,
    borderRadius: R.md,
  },
  listItemSel: { backgroundColor: C.surface2, borderLeftWidth: 3, borderLeftColor: C.accent },
});
