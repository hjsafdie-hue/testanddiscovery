import { router, useLocalSearchParams } from 'expo-router';

import { Header, Screen } from '@/components/ui';
import { WorkoutDetail } from '@/components/workout-detail';

export default function SessionScreen() {
  const { id, celebrate } = useLocalSearchParams<{ id: string; celebrate?: string }>();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/history'));
  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="" onBack={close} />
      <WorkoutDetail
        workoutId={id}
        celebrate={celebrate === '1'}
        onDeleted={close}
        onOpenExercise={(exerciseId) => router.push({ pathname: '/exercise/[id]', params: { id: exerciseId } })}
      />
    </Screen>
  );
}
