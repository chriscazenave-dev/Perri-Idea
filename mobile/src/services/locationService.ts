import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { getDepartureReminders } from "./api";
import {
  presentDepartureReminders,
  presentLocalNotification,
} from "./notificationService";

/**
 * Geofencing & departure detection.
 *
 * Sets up a geofence around the user's home. When the user *exits* it (i.e.
 * leaves home), we look for trips departing within 24h and fire a packing
 * reminder prioritizing essential / previously-forgotten items.
 */

export const GEOFENCE_TASK = "packpal-home-geofence";
export const DEFAULT_GEOFENCE_RADIUS_M = 150;

export interface Coords {
  latitude: number;
  longitude: number;
}

/** Shared "left home" handler used by both the background task and manual checks. */
export async function handleDeparture(): Promise<void> {
  try {
    const reminders = await getDepartureReminders(24);
    if (reminders.length > 0) {
      await presentDepartureReminders(reminders);
    }
  } catch {
    await presentLocalNotification(
      "Leaving home?",
      "Open PackPal to double-check your packing list before you go."
    );
  }
}

// Background geofencing task. Must be defined at module scope so it is
// registered when this module is imported (App.tsx imports it on startup).
TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  if (error) return;
  const { eventType } = (data ?? {}) as {
    eventType?: Location.GeofencingEventType;
  };
  if (eventType === Location.GeofencingEventType.Exit) {
    await handleDeparture();
  }
});

/** Requests foreground (and, when possible, background) location permission. */
export async function requestLocationPermissions(): Promise<{
  foreground: boolean;
  background: boolean;
}> {
  const fg = await Location.requestForegroundPermissionsAsync();
  let background = false;
  if (fg.status === "granted") {
    try {
      const bg = await Location.requestBackgroundPermissionsAsync();
      background = bg.status === "granted";
    } catch {
      background = false;
    }
  }
  return { foreground: fg.status === "granted", background };
}

export async function getCurrentCoords(): Promise<Coords | null> {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== "granted") return null;
  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
  };
}

/** Starts a single home geofence; restarts if one is already running. */
export async function startHomeGeofence(
  home: Coords,
  radius = DEFAULT_GEOFENCE_RADIUS_M
): Promise<void> {
  const isRunning = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK).catch(
    () => false
  );
  if (isRunning) {
    await Location.stopGeofencingAsync(GEOFENCE_TASK).catch(() => undefined);
  }
  await Location.startGeofencingAsync(GEOFENCE_TASK, [
    {
      identifier: "home",
      latitude: home.latitude,
      longitude: home.longitude,
      radius,
      notifyOnEnter: false,
      notifyOnExit: true,
    },
  ]);
}

export async function stopHomeGeofence(): Promise<void> {
  const isRunning = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK).catch(
    () => false
  );
  if (isRunning) await Location.stopGeofencingAsync(GEOFENCE_TASK);
}

/** Great-circle distance in meters between two coordinates. */
export function distanceMeters(a: Coords, b: Coords): number {
  const R = 6_371_000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Foreground fallback: checks whether the user is currently outside the home
 * geofence and, if so, fires the departure reminder. Useful for demos where
 * background geofencing isn't practical.
 */
export async function checkDepartureNow(
  home: Coords,
  radius = DEFAULT_GEOFENCE_RADIUS_M
): Promise<boolean> {
  const coords = await getCurrentCoords();
  if (!coords) return false;
  const left = distanceMeters(coords, home) > radius;
  if (left) await handleDeparture();
  return left;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
