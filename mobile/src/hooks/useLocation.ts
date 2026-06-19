import { useCallback, useState } from "react";
import { useApp } from "../context/AppContext";
import {
  checkDepartureNow,
  requestLocationPermissions,
  startHomeGeofence,
  stopHomeGeofence,
  type Coords,
} from "../services/locationService";

interface LocationState {
  foregroundGranted: boolean;
  backgroundGranted: boolean;
  geofenceActive: boolean;
}

/**
 * Hook around the location service: requests permissions, arms the home
 * geofence using the user's saved home coordinates, and supports a manual
 * "did I just leave home?" check for demos.
 */
export function useLocation() {
  const { user } = useApp();
  const [state, setState] = useState<LocationState>({
    foregroundGranted: false,
    backgroundGranted: false,
    geofenceActive: false,
  });
  const [busy, setBusy] = useState(false);

  const homeCoords: Coords | null =
    user?.homeLatitude != null && user?.homeLongitude != null
      ? { latitude: user.homeLatitude, longitude: user.homeLongitude }
      : null;

  const requestPermissions = useCallback(async () => {
    const result = await requestLocationPermissions();
    setState((s) => ({
      ...s,
      foregroundGranted: result.foreground,
      backgroundGranted: result.background,
    }));
    return result;
  }, []);

  const enableGeofence = useCallback(async () => {
    if (!homeCoords) return false;
    setBusy(true);
    try {
      const perms = await requestLocationPermissions();
      setState((s) => ({
        ...s,
        foregroundGranted: perms.foreground,
        backgroundGranted: perms.background,
      }));
      if (!perms.foreground) return false;
      await startHomeGeofence(homeCoords);
      setState((s) => ({ ...s, geofenceActive: true }));
      return true;
    } finally {
      setBusy(false);
    }
  }, [homeCoords]);

  const disableGeofence = useCallback(async () => {
    await stopHomeGeofence();
    setState((s) => ({ ...s, geofenceActive: false }));
  }, []);

  const checkDeparture = useCallback(async () => {
    if (!homeCoords) return false;
    const perms = await requestLocationPermissions();
    if (!perms.foreground) {
      throw new Error("Location permission not granted");
    }
    return checkDepartureNow(homeCoords);
  }, [homeCoords]);

  return {
    ...state,
    busy,
    hasHome: homeCoords !== null,
    requestPermissions,
    enableGeofence,
    disableGeofence,
    checkDeparture,
  };
}
