import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import type { Reminder, Trip } from "../types";

/**
 * Push & local notification helpers built on Expo Notifications.
 *
 * - Departure reminders are presented immediately when the geofence detects the
 *   user has left home (see locationService).
 * - Night-before reminders are scheduled locally for the evening before a trip.
 */

// Show notifications even when the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let registered = false;

/** Requests permission and (best effort) retrieves an Expo push token. */
export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "PackPal reminders",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== "granted") return null;
  registered = true;

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return token.data;
  } catch {
    // Push token requires a real device / EAS project; local notifications
    // still work without it.
    return null;
  }
}

export function isRegistered(): boolean {
  return registered;
}

/** Presents a notification immediately. */
export async function presentLocalNotification(
  title: string,
  body: string
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}

/** Presents one notification per departure reminder. */
export async function presentDepartureReminders(
  reminders: Reminder[]
): Promise<void> {
  for (const reminder of reminders) {
    await presentLocalNotification(reminder.title, reminder.body);
  }
}

/**
 * Schedules a "trip starts tomorrow" reminder for ~7pm the evening before the
 * trip's start date. No-op if the start date is missing or already past.
 */
export async function scheduleNightBeforeReminder(
  trip: Trip,
  progress?: { packed: number; total: number }
): Promise<string | null> {
  if (!trip.startDate) return null;
  const start = new Date(trip.startDate);
  const fireDate = new Date(start);
  fireDate.setDate(fireDate.getDate() - 1);
  fireDate.setHours(19, 0, 0, 0);
  if (fireDate.getTime() <= Date.now()) return null;

  const packedText = progress
    ? ` You've packed ${progress.packed}/${progress.total} items.`
    : "";

  return Notifications.scheduleNotificationAsync({
    content: {
      title: `${trip.name} starts tomorrow!`,
      body: `Your ${trip.destination} trip starts tomorrow.${packedText}`,
    },
    trigger: fireDate,
  });
}

export async function cancelAllScheduled(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
