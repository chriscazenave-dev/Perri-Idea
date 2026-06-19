import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CONFIGURED_DEMO_USER_ID,
  createUser,
  listTrips,
  listUsers,
  setAuthUser,
} from "../services/api";
import type { CreateTripPayload, Trip, User } from "../types";
import { createTrip as apiCreateTrip, deleteTrip as apiDeleteTrip } from "../services/api";

interface AppContextValue {
  user: User | null;
  trips: Trip[];
  loading: boolean;
  error: string | null;
  refreshTrips: () => Promise<void>;
  createTrip: (
    payload: CreateTripPayload
  ) => Promise<{ trip: Trip; weatherAvailable: boolean }>;
  deleteTrip: (tripId: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

/**
 * Bootstraps a demo user (configured id → existing user → newly created) and
 * exposes shared trip state to the app. Real apps would replace bootstrap with
 * an auth/login flow.
 */
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshTrips = useCallback(async () => {
    try {
      const data = await listTrips();
      setTrips(data);
    } catch (e) {
      setError(toMessage(e));
    }
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let resolved: User | null = null;
      const users = await listUsers();
      if (CONFIGURED_DEMO_USER_ID) {
        resolved = users.find((u) => u.id === CONFIGURED_DEMO_USER_ID) ?? null;
      }
      if (!resolved) resolved = users[0] ?? null;
      if (!resolved) {
        resolved = await createUser({
          email: "demo@packpal.app",
          name: "Demo Traveler",
        });
      }
      setUser(resolved);
      setAuthUser(resolved.id);
      await refreshTrips();
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setLoading(false);
    }
  }, [refreshTrips]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const createTrip = useCallback(
    async (payload: CreateTripPayload) => {
      const result = await apiCreateTrip(payload);
      await refreshTrips();
      return result;
    },
    [refreshTrips]
  );

  const deleteTrip = useCallback(
    async (tripId: string) => {
      await apiDeleteTrip(tripId);
      await refreshTrips();
    },
    [refreshTrips]
  );

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      trips,
      loading,
      error,
      refreshTrips,
      createTrip,
      deleteTrip,
    }),
    [user, trips, loading, error, refreshTrips, createTrip, deleteTrip]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within an AppProvider");
  return ctx;
}

function toMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return "Something went wrong. Is the backend running?";
}
