import { Prisma, TripStatus } from "@prisma/client";
import { prisma } from "../prisma";

/**
 * Builds reminder payloads (consumed by the mobile notification service) and
 * finds trips whose departure is imminent. The mobile app schedules/sends the
 * actual local & push notifications; this service centralizes the messaging
 * logic and "what should I be reminded about" queries.
 */

export interface ReminderPayload {
  tripId: string;
  type: "departure" | "night_before";
  title: string;
  body: string;
}

const tripWithRelations = Prisma.validator<Prisma.TripDefaultArgs>()({
  include: { packingItems: true },
});
type TripWithItems = Prisma.TripGetPayload<typeof tripWithRelations>;

/** Up to `limit` unpacked items, essentials first, formatted for a reminder. */
function priorityUnpacked(trip: TripWithItems, limit = 3): string[] {
  return trip.packingItems
    .filter((i) => !i.isPacked)
    .sort((a, b) => Number(b.isEssential) - Number(a.isEssential))
    .slice(0, limit)
    .map((i) => i.name);
}

export function buildDepartureReminder(trip: TripWithItems): ReminderPayload {
  const items = priorityUnpacked(trip);
  const body = items.length
    ? `Headed to ${trip.destination}? Don't forget: ${items.join(", ")}.`
    : `Headed to ${trip.destination}? Looks like you're all packed — safe travels!`;
  return {
    tripId: trip.id,
    type: "departure",
    title: `Leaving for ${trip.destination}?`,
    body,
  };
}

export function buildNightBeforeReminder(trip: TripWithItems): ReminderPayload {
  const total = trip.packingItems.length;
  const packed = trip.packingItems.filter((i) => i.isPacked).length;
  return {
    tripId: trip.id,
    type: "night_before",
    title: `${trip.name} starts tomorrow!`,
    body: `Your ${trip.destination} trip starts tomorrow. You've packed ${packed}/${total} items.`,
  };
}

/**
 * Trips that depart within the next `hours` and are not yet completed. Used by
 * the geofence "left home" trigger to decide whether to nudge the user.
 */
export async function findTripsDepartingWithin(
  userId: string,
  hours = 24
): Promise<TripWithItems[]> {
  const now = new Date();
  const cutoff = new Date(now.getTime() + hours * 3_600_000);
  return prisma.trip.findMany({
    where: {
      userId,
      isTemplate: false,
      status: { in: [TripStatus.PLANNING, TripStatus.ACTIVE] },
      startDate: { gte: now, lte: cutoff },
    },
    include: { packingItems: true },
    orderBy: { startDate: "asc" },
  });
}

/** Aggregated departure reminders for all imminent trips. */
export async function getDepartureReminders(
  userId: string,
  hours = 24
): Promise<ReminderPayload[]> {
  const trips = await findTripsDepartingWithin(userId, hours);
  return trips.map(buildDepartureReminder);
}
