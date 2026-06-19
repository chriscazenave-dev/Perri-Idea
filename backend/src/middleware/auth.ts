import type { NextFunction, Request, Response } from "express";
import { prisma } from "../prisma";

/**
 * Lightweight development authentication.
 *
 * The client identifies the current user via a header (default `x-user-id`).
 * This keeps the demo simple while leaving a single, obvious place to swap in
 * real JWT/session auth for production. The middleware verifies the user
 * exists and attaches `req.userId` for downstream handlers.
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const USER_HEADER = (process.env.DEV_USER_HEADER || "x-user-id").toLowerCase();

export async function requireUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers[USER_HEADER];
  const userId = Array.isArray(header) ? header[0] : header;

  if (!userId) {
    res.status(401).json({
      error: "Unauthorized",
      message: `Missing ${USER_HEADER} header. Provide a valid user id.`,
    });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(401).json({ error: "Unauthorized", message: "Unknown user." });
      return;
    }
    req.userId = user.id;
    next();
  } catch (err) {
    next(err);
  }
}
