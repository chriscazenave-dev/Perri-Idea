import "dotenv/config";
import { ItemCategory, TripPurpose, TripStatus } from "@prisma/client";
import { prisma } from "../src/prisma";
import { buildAndPersistPackingList } from "../src/services/packingListBuilder";

/**
 * Seeds a demo user with a few trips, a template, and some "forgotten item"
 * history so the packing engine has interesting data to work with.
 */
async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@packpal.app" },
    update: {},
    create: {
      email: "demo@packpal.app",
      name: "Demo Traveler",
      // Downtown Austin, TX — used as the geofence "home" location.
      homeLatitude: 30.2672,
      homeLongitude: -97.7431,
    },
  });

  // Start from a clean slate for the demo user.
  await prisma.trip.deleteMany({ where: { userId: user.id } });
  await prisma.forgottenItem.deleteMany({ where: { userId: user.id } });

  // Frequently forgotten items influence future packing lists.
  await prisma.forgottenItem.createMany({
    data: [
      {
        userId: user.id,
        itemName: "Sunglasses",
        category: ItemCategory.ACCESSORIES,
        forgottenCount: 3,
      },
      {
        userId: user.id,
        itemName: "Phone charger",
        category: ItemCategory.ELECTRONICS,
        forgottenCount: 2,
      },
    ],
  });

  const inDays = (n: number) => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    d.setDate(d.getDate() + n);
    return d;
  };

  // 1. A leisure beach trip starting tomorrow.
  const beachTrip = await prisma.trip.create({
    data: {
      userId: user.id,
      name: "Miami Beach Getaway",
      destination: "Miami, US",
      destinationLat: 25.7617,
      destinationLon: -80.1918,
      purpose: TripPurpose.LEISURE,
      startDate: inDays(1),
      endDate: inDays(4),
      status: TripStatus.PLANNING,
      activities: {
        create: [
          { name: "Beach day", type: "beach" },
          { name: "Sightseeing", type: "sightseeing" },
        ],
      },
    },
  });
  await buildAndPersistPackingList(beachTrip.id);

  // 2. A work conference trip later this month.
  const confTrip = await prisma.trip.create({
    data: {
      userId: user.id,
      name: "Tampa Work Conference",
      destination: "Tampa, US",
      destinationLat: 27.9506,
      destinationLon: -82.4572,
      purpose: TripPurpose.CONFERENCE,
      startDate: inDays(14),
      endDate: inDays(17),
      status: TripStatus.PLANNING,
      activities: {
        create: [{ name: "Conference", type: "conference" }],
      },
    },
  });
  await buildAndPersistPackingList(confTrip.id);

  // 3. A reusable template for repeat work trips.
  await prisma.trip.create({
    data: {
      userId: user.id,
      name: "Tampa Work Trip (template)",
      destination: "Tampa, US",
      destinationLat: 27.9506,
      destinationLon: -82.4572,
      purpose: TripPurpose.WORK,
      isTemplate: true,
      status: TripStatus.PLANNING,
      activities: { create: [{ name: "Client meeting", type: "formal" }] },
      packingItems: {
        create: [
          { name: "Laptop", category: ItemCategory.ELECTRONICS, isEssential: true },
          { name: "Laptop charger", category: ItemCategory.ELECTRONICS, isEssential: true },
          { name: "Business attire", category: ItemCategory.CLOTHING, quantity: 3 },
          { name: "Dress shoes", category: ItemCategory.CLOTHING },
          { name: "Notebook", category: ItemCategory.ACCESSORIES },
        ],
      },
    },
  });

  console.log(`Seed complete. Demo user id: ${user.id}`);
  console.log(`Set this id as the x-user-id header (or EXPO_PUBLIC_DEMO_USER_ID).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
