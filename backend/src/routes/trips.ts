import { Router } from "express";
import { Prisma, TripStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { asyncHandler, HttpError, notFound } from "../lib/http";
import { createTripSchema, updateTripSchema } from "../lib/schemas";
import { buildAndPersistPackingList } from "../services/packingListBuilder";

const router = Router();

/** Loads a trip and asserts the authenticated user owns it. */
async function getOwnedTrip(
  tripId: string,
  userId: string,
  include?: Prisma.TripInclude
) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, include });
  if (!trip || trip.userId !== userId) throw notFound("Trip");
  return trip;
}

function packingProgress(items: { isPacked: boolean }[]) {
  const total = items.length;
  const packed = items.filter((i) => i.isPacked).length;
  return { packed, total };
}

// POST /api/trips — create a trip (+ activities), optionally generating a list.
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const data = createTripSchema.parse(req.body);

    if (data.templateId) {
      const template = await prisma.trip.findUnique({
        where: { id: data.templateId },
      });
      if (!template || template.userId !== userId || !template.isTemplate) {
        throw notFound("Template");
      }
    }

    const trip = await prisma.trip.create({
      data: {
        userId,
        name: data.name,
        destination: data.destination,
        destinationLat: data.destinationLat,
        destinationLon: data.destinationLon,
        purpose: data.purpose,
        startDate: data.startDate ?? null,
        endDate: data.endDate ?? null,
        notes: data.notes,
        templateId: data.templateId,
        status: TripStatus.PLANNING,
        activities: data.activities
          ? { create: data.activities }
          : undefined,
      },
    });

    let weatherAvailable = false;
    if (data.generatePackingList) {
      const { weather } = await buildAndPersistPackingList(trip.id);
      weatherAvailable = weather.available;
    }

    const created = await prisma.trip.findUnique({
      where: { id: trip.id },
      include: { activities: true, packingItems: true },
    });
    res.status(201).json({ trip: created, weatherAvailable });
  })
);

// GET /api/trips — list the user's (non-template) trips with packing progress.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const trips = await prisma.trip.findMany({
      where: { userId, isTemplate: false },
      include: {
        activities: true,
        packingItems: { select: { isPacked: true } },
      },
      orderBy: [{ startDate: "asc" }, { createdAt: "desc" }],
    });

    res.json(
      trips.map((t) => {
        const { packingItems, ...rest } = t;
        return { ...rest, progress: packingProgress(packingItems) };
      })
    );
  })
);

// GET /api/trips/:id — trip details with full packing list and activities.
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const trip = await getOwnedTrip(req.params.id, req.userId!, {
      activities: true,
      packingItems: { orderBy: { category: "asc" } },
    });
    res.json(trip);
  })
);

// PUT /api/trips/:id — update trip fields (and replace activities if provided).
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    await getOwnedTrip(req.params.id, userId);
    const data = updateTripSchema.parse(req.body);

    const { activities, ...fields } = data;
    const updated = await prisma.trip.update({
      where: { id: req.params.id },
      data: {
        ...fields,
        ...(activities
          ? {
              activities: {
                deleteMany: {},
                create: activities,
              },
            }
          : {}),
      },
      include: { activities: true, packingItems: true },
    });
    res.json(updated);
  })
);

// DELETE /api/trips/:id — delete a trip (cascades items & activities).
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await getOwnedTrip(req.params.id, req.userId!);
    await prisma.trip.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

// POST /api/trips/:id/complete — mark complete; return unpacked items to prompt
// a "what did you forget?" report.
router.post(
  "/:id/complete",
  asyncHandler(async (req, res) => {
    const trip = await getOwnedTrip(req.params.id, req.userId!, {
      packingItems: true,
    });
    const updated = await prisma.trip.update({
      where: { id: trip.id },
      data: { status: TripStatus.COMPLETED },
      include: { packingItems: true },
    });
    const unpacked = updated.packingItems.filter((i) => !i.isPacked);
    res.json({
      trip: updated,
      forgottenCandidates: unpacked,
      message: "Trip completed. Report any items you forgot to improve future lists.",
    });
  })
);

// POST /api/trips/:id/clone — duplicate a trip as a fresh PLANNING trip.
router.post(
  "/:id/clone",
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const source = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: { activities: true, packingItems: true },
    });
    if (!source || source.userId !== userId) throw notFound("Trip");

    const clone = await prisma.trip.create({
      data: {
        userId,
        name: `${source.name} (copy)`,
        destination: source.destination,
        destinationLat: source.destinationLat,
        destinationLon: source.destinationLon,
        purpose: source.purpose,
        startDate: source.startDate,
        endDate: source.endDate,
        notes: source.notes,
        status: TripStatus.PLANNING,
        isTemplate: false,
        activities: {
          create: source.activities.map((a) => ({ name: a.name, type: a.type })),
        },
        packingItems: {
          create: source.packingItems.map((i) => ({
            name: i.name,
            category: i.category,
            quantity: i.quantity,
            notes: i.notes,
            isEssential: i.isEssential,
            isPacked: false,
          })),
        },
      },
      include: { activities: true, packingItems: true },
    });

    res.status(201).json(clone);
  })
);

export default router;
