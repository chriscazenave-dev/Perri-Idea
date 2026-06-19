import { prisma } from "../prisma";
import { notFound } from "../lib/http";
import {
  generatePackingList,
  type GeneratedItem,
  type ForgottenItemInput,
} from "./packingEngine";
import { getWeatherSummary, type WeatherSummary } from "./weatherService";

/**
 * Orchestrates the packing engine with the database and weather service:
 * gathers a trip's activities, the user's forgotten items, template carryover,
 * and the destination forecast, then persists the generated PackingItems.
 */

export interface BuildOptions {
  /** When true, existing packing items are replaced (resets packed state). */
  regenerate?: boolean;
}

export async function buildAndPersistPackingList(
  tripId: string,
  options: BuildOptions = {}
): Promise<{ weather: WeatherSummary }> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      activities: true,
      packingItems: true,
      template: { include: { packingItems: true } },
    },
  });
  if (!trip) throw notFound("Trip");

  if (trip.packingItems.length > 0 && !options.regenerate) {
    const weather = await getDestinationWeather(trip);
    return { weather };
  }

  const forgottenItems: ForgottenItemInput[] = (
    await prisma.forgottenItem.findMany({ where: { userId: trip.userId } })
  ).map((f) => ({
    itemName: f.itemName,
    category: f.category,
    forgottenCount: f.forgottenCount,
  }));

  const templateItems: GeneratedItem[] | undefined = trip.template?.packingItems.map(
    (i) => ({
      name: i.name,
      category: i.category,
      quantity: i.quantity,
      isEssential: i.isEssential,
      notes: i.notes,
    })
  );

  const weather = await getDestinationWeather(trip);

  const items = generatePackingList({
    purpose: trip.purpose,
    startDate: trip.startDate,
    endDate: trip.endDate,
    activities: trip.activities.map((a) => ({ name: a.name, type: a.type })),
    weather,
    forgottenItems,
    templateItems,
  });

  await prisma.$transaction([
    prisma.packingItem.deleteMany({ where: { tripId } }),
    prisma.packingItem.createMany({
      data: items.map((i) => ({
        tripId,
        name: i.name,
        category: i.category,
        quantity: i.quantity,
        isEssential: i.isEssential,
        notes: i.notes,
      })),
    }),
  ]);

  return { weather };
}

export async function getDestinationWeather(trip: {
  destination: string;
  destinationLat: number | null;
  destinationLon: number | null;
  startDate: Date | null;
  endDate: Date | null;
}): Promise<WeatherSummary> {
  return getWeatherSummary({
    city: trip.destination,
    lat: trip.destinationLat ?? undefined,
    lon: trip.destinationLon ?? undefined,
    startDate: trip.startDate,
    endDate: trip.endDate,
  });
}
