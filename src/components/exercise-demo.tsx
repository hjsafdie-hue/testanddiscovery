import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { EXERCISE_MEDIA } from '@/lib/exercise-media';
import type { Muscle } from '@/lib/types';
import { C, MUSCLE_COLOR, R, S } from '@/theme';

import { Icon, Txt } from './ui';

export function hasDemo(exerciseId: string) {
  return !!EXERCISE_MEDIA[exerciseId]?.frames;
}

export function exerciseSteps(exerciseId: string): string[] {
  return EXERCISE_MEDIA[exerciseId]?.steps ?? [];
}

/**
 * Looping "GIF-style" demo: cross-fades between the start and end position photos.
 * Tap to pause/resume. Photos are bundled with the app so it works offline in the gym.
 */
export function ExerciseDemo({ exerciseId, height = 220, rounded = true }: { exerciseId: string; height?: number; rounded?: boolean }) {
  const frames = EXERCISE_MEDIA[exerciseId]?.frames;
  const [fade] = useState(() => new Animated.Value(0));
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!frames || !playing) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(650),
        Animated.timing(fade, { toValue: 1, duration: 450, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(650),
        Animated.timing(fade, { toValue: 0, duration: 450, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [fade, frames, playing]);

  if (!frames) return null;

  return (
    <Pressable
      onPress={() => setPlaying((p) => !p)}
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Pause exercise demo' : 'Play exercise demo'}
      style={[styles.frame, { height, borderRadius: rounded ? R.lg : 0 }]}>
      <Image source={frames[0]} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
        <Image source={frames[1]} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} />
      </Animated.View>
      <View style={styles.badge}>
        <Icon name={playing ? 'play-circle' : 'pause-circle'} size={14} color={C.accent} />
        <Txt v="caption" style={{ color: C.text, fontWeight: '700' }}>
          {playing ? 'HOW TO' : 'PAUSED'}
        </Txt>
      </View>
    </Pressable>
  );
}

/** Numbered how-to steps. */
export function ExerciseSteps({ exerciseId, max }: { exerciseId: string; max?: number }) {
  const [expanded, setExpanded] = useState(false);
  const steps = exerciseSteps(exerciseId);
  if (!steps.length) return null;
  const limit = max && !expanded ? max : steps.length;
  return (
    <View style={{ gap: S.sm }}>
      {steps.slice(0, limit).map((s, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: S.sm }}>
          <View style={styles.stepNum}>
            <Txt v="caption" style={{ color: C.onAccent, fontWeight: '800' }}>
              {i + 1}
            </Txt>
          </View>
          <Txt v="body" color={C.dim} style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>
            {s}
          </Txt>
        </View>
      ))}
      {steps.length > limit ? (
        <Txt v="label" color={C.accent} onPress={() => setExpanded(true)}>
          Show all {steps.length} steps
        </Txt>
      ) : null}
    </View>
  );
}

/** Small photo thumbnail for lists; falls back to the coloured muscle tile. */
export function ExerciseThumb({ exerciseId, muscle, size = 44 }: { exerciseId: string; muscle: Muscle; size?: number }) {
  const frames = EXERCISE_MEDIA[exerciseId]?.frames;
  if (frames) {
    return (
      <Image
        source={frames[0]}
        style={{ width: size, height: size, borderRadius: R.md, backgroundColor: C.surface2 }}
        contentFit="cover"
        accessibilityIgnoresInvertColors
      />
    );
  }
  const color = MUSCLE_COLOR[muscle] ?? C.dim;
  return (
    <View style={{ width: size, height: size, borderRadius: R.md, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center' }}>
      <Txt style={{ color, fontWeight: '800', fontSize: size * 0.34 }}>{muscle.slice(0, 2).toUpperCase()}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', overflow: 'hidden', backgroundColor: C.surface2 },
  badge: {
    position: 'absolute',
    left: 10,
    top: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0B0D10CC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: R.pill,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
});
