import { Router } from "express";
import { TripStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { asyncHandler, notFound } from "../lib/http";
import { saveTemplateSchema, useTemplateSchema } from "../lib/schemas";
import { buildAndPersistPackingList } from "../services/packingListBuilder";

const router = Router();

// POST /api/templates — snapshot an existing trip into a reusable template.
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const { tripId, name } = saveTemplateSchema.parse(req.body);

    const source = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { activities: true, packingItems: true },
    });
    if (!source || source.userId !== userId) throw notFound("Trip");

    const template = await prisma.trip.create({
      data: {
        userId,
        name: name ?? source.name,
        destination: source.destination,
        destinationLat: source.destinationLat,
        destinationLon: source.destinationLon,
        purpose: source.purpose,
        notes: source.notes,
        isTemplate: true,
        status: TripStatus.PLANNING,
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

    res.status(201).json(template);
  })
);

// GET /api/templates — list the user's saved templates.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const templates = await prisma.trip.findMany({
      where: { userId: req.userId!, isTemplate: true },
      include: {
        activities: true,
        packingItems: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(
      templates.map(({ packingItems, ...t }) => ({
        ...t,
        itemCount: packingItems.length,
      }))
    );
  })
);

// POST /api/templates/:id/use — create a new trip from a template.
router.post(
  "/:id/use",
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const overrides = useTemplateSchema.parse(req.body);

    const template = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: { activities: true },
    });
    if (!template || template.userId !== userId || !template.isTemplate) {
      throw notFound("Template");
    }

    const trip = await prisma.trip.create({
      data: {
        userId,
        name: overrides.name ?? template.name,
        destination: overrides.destination ?? template.destination,
        destinationLat: template.destinationLat,
        destinationLon: template.destinationLon,
        purpose: template.purpose,
        notes: template.notes,
        startDate: overrides.startDate ?? null,
        endDate: overrides.endDate ?? null,
        isTemplate: false,
        templateId: template.id,
        status: TripStatus.PLANNING,
        activities: {
          create: template.activities.map((a) => ({
            name: a.name,
            type: a.type,
          })),
        },
      },
    });

    // Generate the list; the builder seeds it from the template's items.
    await buildAndPersistPackingList(trip.id);

    const created = await prisma.trip.findUnique({
      where: { id: trip.id },
      include: { activities: true, packingItems: true },
    });
    res.status(201).json(created);
  })
);

// DELETE /api/templates/:id — remove a template.
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const template = await prisma.trip.findUnique({
      where: { id: req.params.id },
    });
    if (!template || template.userId !== req.userId! || !template.isTemplate) {
      throw notFound("Template");
    }
    await prisma.trip.delete({ where: { id: template.id } });
    res.status(204).send();
  })
);

export default router;
