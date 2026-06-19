import { Router } from "express";
import { asyncHandler } from "../lib/http";
import { getDepartureReminders } from "../services/reminderService";

const router = Router();

// GET /api/reminders/departures?hours=24 — reminders for imminent departures.
// The mobile geofence trigger calls this after detecting the user left home.
router.get(
  "/departures",
  asyncHandler(async (req, res) => {
    const hours = Number(req.query.hours);
    const window = Number.isFinite(hours) && hours > 0 ? hours : 24;
    const reminders = await getDepartureReminders(req.userId!, window);
    res.json({ reminders });
  })
);

export default router;
