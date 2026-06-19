import "dotenv/config";
import express, {
  type ErrorRequestHandler,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { HttpError } from "./lib/http";
import { requireUser } from "./middleware/auth";
import usersRouter from "./routes/users";
import tripsRouter from "./routes/trips";
import packingListsRouter from "./routes/packingLists";
import templatesRouter from "./routes/templates";
import itemsRouter from "./routes/items";
import remindersRouter from "./routes/reminders";

const app = express();

app.use(cors());
app.use(express.json());

// Health check (unauthenticated).
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "packpal-backend" });
});

// Public bootstrap routes (create/list demo users).
app.use("/api/users", usersRouter);

// Everything below requires an authenticated user.
app.use("/api", requireUser);

// Packing-list routes are nested under a trip; mounted first so the more
// specific path is matched before the generic /api/trips routes.
app.use("/api/trips/:tripId/packing-list", packingListsRouter);
app.use("/api/trips", tripsRouter);
app.use("/api/templates", templatesRouter);
app.use("/api/forgotten-items", itemsRouter);
app.use("/api/reminders", remindersRouter);

// 404 for unmatched API routes.
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Not Found" });
});

// Central error handler.
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "ValidationError", issues: err.issues });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.name, message: err.message });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({ error: "Conflict", message: "Duplicate value." });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ error: "Not Found", message: "Record not found." });
      return;
    }
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "InternalServerError" });
};
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 4000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`PackPal backend listening on http://localhost:${PORT}`);
  });
}

export { app };
