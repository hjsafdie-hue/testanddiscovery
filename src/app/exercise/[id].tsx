import { router, useLocalSearchParams } from 'expo-router';

import { ExerciseDetail } from '@/components/exercise-detail';
import { Header, Screen } from '@/components/ui';

export default function ExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="" onBack={() => router.back()} />
      <ExerciseDetail exerciseId={id} onDeleted={() => router.back()} />
    </Screen>
  );
}
