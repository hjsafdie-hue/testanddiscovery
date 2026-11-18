import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

const native = Platform.OS !== 'web';
const CHANNEL = 'rest-timer';
let restNotificationId: string | null = null;
let permissionAsked = false;

export function setupNotifications() {
  if (!native) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Rest timer',
        importance: AndroidImportance.HIGH,
        vibrationPattern: [0, 400, 200, 400],
        enableVibrate: true,
      }).catch(() => {});
    }
  } catch {
    // Notifications are a nice-to-have; never block the app on them.
  }
}

async function ensurePermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (permissionAsked || !current.canAskAgain) return false;
    permissionAsked = true;
    const res = await Notifications.requestPermissionsAsync();
    return res.granted;
  } catch {
    return false;
  }
}

export async function scheduleRestDone(seconds: number, label?: string) {
  if (!native || seconds < 3) return;
  await cancelRestDone();
  if (!(await ensurePermission())) return;
  try {
    restNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Rest over — time to lift 💪',
        body: label ? `Next up: ${label}` : 'Your next set is ready.',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.round(seconds),
        channelId: CHANNEL,
      },
    });
  } catch {
    restNotificationId = null;
  }
}

export async function cancelRestDone() {
  if (!native || !restNotificationId) return;
  const id = restNotificationId;
  restNotificationId = null;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {}
}

let hapticsOn = true;
export function setHapticsEnabled(on: boolean) {
  hapticsOn = on;
}

export const haptic = {
  tap() {
    if (native && hapticsOn) Haptics.selectionAsync().catch(() => {});
  },
  done() {
    if (native && hapticsOn) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  success() {
    if (native && hapticsOn) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  warn() {
    if (native && hapticsOn) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
};
