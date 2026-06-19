import { Router } from "express";
import { prisma } from "../prisma";
import { asyncHandler, notFound } from "../lib/http";
import { createUserSchema, updateUserSchema } from "../lib/schemas";

/**
 * User routes. Intentionally unauthenticated so the mobile app can bootstrap a
 * demo identity (create / list users) before it has a user id to send in the
 * auth header. Replace with a real signup/login flow in production.
 */
const router = Router();

// POST /api/users — create or fetch a user by email.
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createUserSchema.parse(req.body);
    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: {
        name: data.name,
        homeLatitude: data.homeLatitude,
        homeLongitude: data.homeLongitude,
      },
      create: data,
    });
    res.status(201).json(user);
  })
);

// GET /api/users — list users (demo convenience).
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
    res.json(users);
  })
);

// GET /api/users/:id — fetch a single user.
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw notFound("User");
    res.json(user);
  })
);

// PUT /api/users/:id — update profile / home geofence coordinates.
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = updateUserSchema.parse(req.body);
    const existing = await prisma.user.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) throw notFound("User");
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
    });
    res.json(user);
  })
);

export default router;
