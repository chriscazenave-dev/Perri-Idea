import { Router } from "express";
import { prisma } from "../prisma";
import { asyncHandler, notFound } from "../lib/http";
import { addPackingItemSchema, updatePackingItemSchema } from "../lib/schemas";
import { buildAndPersistPackingList } from "../services/packingListBuilder";

// mergeParams lets this router read :tripId from its mount path.
const router = Router({ mergeParams: true });

async function getOwnedTrip(tripId: string, userId: string) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip || trip.userId !== userId) throw notFound("Trip");
  return trip;
}

async function getOwnedItem(tripId: string, itemId: string) {
  const item = await prisma.packingItem.findUnique({ where: { id: itemId } });
  if (!item || item.tripId !== tripId) throw notFound("Item");
  return item;
}

// GET /api/trips/:id/packing-list — return the list (generating it on first access).
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const tripId = req.params.tripId;
    const trip = await getOwnedTrip(tripId, req.userId!);

    const { weather } = await buildAndPersistPackingList(tripId);
    const items = await prisma.packingItem.findMany({
      where: { tripId },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    const packed = items.filter((i) => i.isPacked).length;
    res.json({
      trip: { id: trip.id, name: trip.name, destination: trip.destination },
      weather,
      progress: { packed, total: items.length },
      items,
    });
  })
);

// PUT /api/trips/:id/packing-list/:itemId — toggle packed status / edit an item.
router.put(
  "/:itemId",
  asyncHandler(async (req, res) => {
    const tripId = req.params.tripId;
    await getOwnedTrip(tripId, req.userId!);
    const existing = await getOwnedItem(tripId, req.params.itemId);
    const data = updatePackingItemSchema.parse(req.body);

    const updated = await prisma.packingItem.update({
      where: { id: existing.id },
      data,
    });
    res.json(updated);
  })
);

// POST /api/trips/:id/packing-list — add a custom item.
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const tripId = req.params.tripId;
    await getOwnedTrip(tripId, req.userId!);
    const data = addPackingItemSchema.parse(req.body);

    const item = await prisma.packingItem.create({
      data: { tripId, ...data },
    });
    res.status(201).json(item);
  })
);

// DELETE /api/trips/:id/packing-list/:itemId — remove an item.
router.delete(
  "/:itemId",
  asyncHandler(async (req, res) => {
    const tripId = req.params.tripId;
    await getOwnedTrip(tripId, req.userId!);
    const item = await getOwnedItem(tripId, req.params.itemId);
    await prisma.packingItem.delete({ where: { id: item.id } });
    res.status(204).send();
  })
);

// Regenerate endpoint: rebuild the list from scratch (resets packed state).
router.post(
  "/regenerate",
  asyncHandler(async (req, res) => {
    const tripId = req.params.tripId;
    await getOwnedTrip(tripId, req.userId!);
    const { weather } = await buildAndPersistPackingList(tripId, {
      regenerate: true,
    });
    const items = await prisma.packingItem.findMany({
      where: { tripId },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    res.json({
      weather,
      progress: { packed: 0, total: items.length },
      items,
    });
  })
);

export default router;
