import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { setHapticsEnabled, setupNotifications } from '@/lib/device';
import { useStore } from '@/lib/store';
import { C } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
setupNotifications();

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: C.bg, card: C.surface, primary: C.accent, text: C.text, border: C.border },
};

const subscribeHydration = (cb: () => void) => useStore.persist.onFinishHydration(cb);
const getHydrated = () => useStore.persist.hasHydrated();

function useHydrated() {
  return useSyncExternalStore(subscribeHydration, getHydrated, getHydrated);
}

const WAKE_TAG = 'active-workout';

/** Keeps the screen on while a workout is running so the timer stays visible. */
function useTrainingWakeLock(on: boolean) {
  useEffect(() => {
    if (!on) return;
    activateKeepAwakeAsync(WAKE_TAG).catch(() => {});
    return () => {
      try {
        deactivateKeepAwake(WAKE_TAG).catch(() => {});
      } catch {}
    };
  }, [on]);
}

export default function RootLayout() {
  const hydrated = useHydrated();
  const training = useStore((s) => !!s.active && s.settings.keepAwake);
  const haptics = useStore((s) => s.settings.haptics);

  useTrainingWakeLock(training);
  useEffect(() => setHapticsEnabled(haptics), [haptics]);
  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync().catch(() => {});
  }, [hydrated]);

  if (!hydrated) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'fade_from_bottom' }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="workout" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="pick-exercise" options={{ animation: 'slide_from_bottom' }} />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
