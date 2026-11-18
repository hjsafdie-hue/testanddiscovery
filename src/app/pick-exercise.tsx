import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExerciseBrowser } from '@/components/exercise-browser';
import { Btn, Header } from '@/components/ui';
import { useStore } from '@/lib/store';
import { C, S, useLayout } from '@/theme';

/** Multi-select exercise picker. `routineId` adds to a routine, otherwise to the active workout. */
export default function PickExercise() {
  const { routineId } = useLocalSearchParams<{ routineId?: string; target?: string }>();
  const insets = useSafeAreaInsets();
  const { gutter } = useLayout();
  const [picked, setPicked] = useState<string[]>([]);

  const confirm = () => {
    const s = useStore.getState();
    if (routineId) s.addToRoutine(routineId, picked);
    else s.addExercises(picked);
    router.back();
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: C.bg }}>
      <View style={{ paddingHorizontal: gutter }}>
        <Header title="Add exercises" onBack={() => router.back()} />
      </View>
      <ExerciseBrowser
        gutter={gutter}
        selectedIds={picked}
        onPress={(e) => setPicked((p) => (p.includes(e.id) ? p.filter((x) => x !== e.id) : [...p, e.id]))}
      />
      {picked.length ? (
        <View style={{ position: 'absolute', left: gutter, right: gutter, bottom: insets.bottom + S.lg }}>
          <Btn big icon="check" title={`Add ${picked.length} exercise${picked.length > 1 ? 's' : ''}`} onPress={confirm} testID="confirm-pick" />
        </View>
      ) : null}
    </View>
  );
}
