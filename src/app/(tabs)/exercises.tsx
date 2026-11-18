import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExerciseBrowser } from '@/components/exercise-browser';
import { ExerciseDetail } from '@/components/exercise-detail';
import { TwoPane } from '@/components/two-pane';
import { Empty, Header } from '@/components/ui';
import { useAllExercises } from '@/lib/store';
import { C, useLayout } from '@/theme';

export default function ExercisesScreen() {
  const { unfolded, gutter } = useLayout();
  const insets = useSafeAreaInsets();
  const all = useAllExercises();
  const [selected, setSelected] = useState<string | null>(null);

  const browser = (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: C.bg }}>
      <ExerciseBrowser
        gutter={gutter}
        activeId={unfolded ? selected : null}
        header={<Header title="Exercises" subtitle={`${all.length} in your library`} />}
        onPress={(e) => {
          if (unfolded) setSelected(e.id);
          else router.push({ pathname: '/exercise/[id]', params: { id: e.id } });
        }}
      />
    </View>
  );

  if (!unfolded) return browser;
  return (
    <TwoPane
      list={browser}
      detail={
        selected ? (
          <ExerciseDetail exerciseId={selected} onDeleted={() => setSelected(null)} />
        ) : (
          <Empty icon="dumbbell" title="Choose an exercise" body="See your records, progress chart and full history side by side." />
        )
      }
    />
  );
}
