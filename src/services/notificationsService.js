import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { fetchFactById, fetchFactsBatch } from './factsService';
import { useFactStore } from '../store/useFactStore';
import { useUiStore } from '../store/useUiStore';
import { getTeaserHook } from '../utils/getTeaserHook';

const DAILY_HOUR = 9;
const DAILY_MINUTE = 0;
const ANDROID_CHANNEL_ID = 'daily-singularity';

// Foreground presentation: show the banner even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Daily Singularity',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#8B7CF6',
    vibrationPattern: [0, 120, 80, 120],
  });
}

export async function ensureNotificationPermissions() {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }
  const request = await Notifications.requestPermissionsAsync();
  return request.granted;
}

async function pickUnseenFact() {
  try {
    const excludeIds = useFactStore.getState().getSeenIdsForFilter();
    const batch = await fetchFactsBatch({ excludeIds, limit: 25, offset: 0 });
    if (!batch.length) return null;
    return batch[Math.floor(Math.random() * batch.length)];
  } catch (_) {
    return null;
  }
}

/**
 * Schedules a repeating 9:00 AM local notification whose hook is drawn from an
 * unseen fact. Re-run on each app launch so the teaser refreshes over time.
 * Tapping it deep-links into that fact's Deep Dive (see wireNotificationTaps).
 */
export async function scheduleDailySingularity() {
  const granted = await ensureNotificationPermissions();
  if (!granted) return false;

  await ensureAndroidChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const fact = await pickUnseenFact();
  const title = fact ? fact.title : 'A new singularity awaits';
  const body = fact
    ? getTeaserHook(fact.body, 1)
    : 'Open Nebulore to absorb something the universe has been hiding.';

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: fact ? { factId: fact.id } : {},
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: DAILY_HOUR,
      minute: DAILY_MINUTE,
    },
  });

  return true;
}

async function openFactFromId(factId) {
  if (!factId) return;
  try {
    const fact = await fetchFactById(factId);
    if (fact) useUiStore.getState().openDeepDive(fact);
  } catch (_) {
    // network/lookup failure — silently ignore the deep-link
  }
}

/**
 * Wires notification taps to the global Deep Dive. Also handles the cold-start
 * case where the app was launched by tapping a notification.
 * Returns an unsubscribe function.
 */
export function wireNotificationTaps() {
  Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      const factId = response?.notification?.request?.content?.data?.factId;
      if (factId) openFactFromId(factId);
    })
    .catch(() => {});

  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const factId = response?.notification?.request?.content?.data?.factId;
    openFactFromId(factId);
  });

  return () => sub.remove();
}
