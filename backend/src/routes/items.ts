import { Router } from "express";
import { prisma } from "../prisma";
import { asyncHandler, notFound } from "../lib/http";
import { reportForgottenItemSchema } from "../lib/schemas";

const router = Router();

// POST /api/forgotten-items — report a forgotten item (increments its counter).
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const { itemName, category, tripId } = reportForgottenItemSchema.parse(
      req.body
    );

    if (tripId) {
      const trip = await prisma.trip.findUnique({ where: { id: tripId } });
      if (!trip || trip.userId !== userId) throw notFound("Trip");
    }

    const record = await prisma.forgottenItem.upsert({
      where: { userId_itemName: { userId, itemName } },
      update: {
        forgottenCount: { increment: 1 },
        lastForgottenDate: new Date(),
        category,
        tripId: tripId ?? null,
      },
      create: {
        userId,
        itemName,
        category,
        tripId: tripId ?? null,
      },
    });

    res.status(201).json(record);
  })
);

// GET /api/forgotten-items — the user's frequently forgotten items.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await prisma.forgottenItem.findMany({
      where: { userId: req.userId! },
      orderBy: [{ forgottenCount: "desc" }, { lastForgottenDate: "desc" }],
    });
    res.json(items);
  })
);

export default router;
