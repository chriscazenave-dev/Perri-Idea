import { useMemo } from "react";
import { useApp } from "../context/AppContext";
import type { Trip } from "../types";

/**
 * Convenience hook over AppContext's trip state. Splits trips into upcoming
 * (PLANNING/ACTIVE) and past (COMPLETED) and exposes the shared mutators.
 */
export function useTrips() {
  const { trips, loading, error, refreshTrips, createTrip, deleteTrip } = useApp();

  const { upcoming, past } = useMemo(() => {
    const upcomingTrips: Trip[] = [];
    const pastTrips: Trip[] = [];
    for (const trip of trips) {
      if (trip.status === "COMPLETED") pastTrips.push(trip);
      else upcomingTrips.push(trip);
    }
    return { upcoming: upcomingTrips, past: pastTrips };
  }, [trips]);

  return {
    trips,
    upcoming,
    past,
    loading,
    error,
    refreshTrips,
    createTrip,
    deleteTrip,
  };
}
