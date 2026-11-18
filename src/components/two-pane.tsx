import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, S, useLayout } from '@/theme';

/**
 * List–detail layout for the unfolded inner display. In portrait the divider lands on the
 * hinge (see `useLayout().listPane`), so no list row or input ever straddles the crease.
 */
export function TwoPane({ list, detail, detailScroll = true }: { list: ReactNode; detail: ReactNode; detailScroll?: boolean }) {
  const { listPane } = useLayout();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: C.bg }}>
      <View style={{ width: listPane, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: C.border }}>{list}</View>
      <View style={{ flex: 1 }}>
        {detailScroll ? (
          <ScrollView
            contentContainerStyle={{ padding: S.xl, paddingTop: insets.top + S.lg, paddingBottom: 120 }}
            keyboardShouldPersistTaps="handled">
            {detail}
          </ScrollView>
        ) : (
          detail
        )}
      </View>
    </View>
  );
}
