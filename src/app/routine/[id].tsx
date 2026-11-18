import { router, useLocalSearchParams } from 'expo-router';

import { RoutineEditor } from '@/components/routine-editor';
import { Header, Screen } from '@/components/ui';
import { useStore } from '@/lib/store';

export default function RoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="" onBack={() => router.back()} />
      <RoutineEditor
        routineId={id}
        onAddExercises={() => router.push({ pathname: '/pick-exercise', params: { routineId: id } })}
        onStart={() => {
          useStore.getState().startWorkout(id);
          router.replace('/workout');
        }}
        onDeleted={() => router.back()}
      />
    </Screen>
  );
}
