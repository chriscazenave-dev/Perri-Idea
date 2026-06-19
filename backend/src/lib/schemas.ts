import { ItemCategory, TripPurpose, TripStatus } from "@prisma/client";
import { z } from "zod";

/** Shared Zod schemas for request validation across routes. */

export const tripPurposeSchema = z.nativeEnum(TripPurpose);
export const tripStatusSchema = z.nativeEnum(TripStatus);
export const itemCategorySchema = z.nativeEnum(ItemCategory);

// Accept ISO date strings or null; transform to Date.
const isoDate = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
  .transform((v) => new Date(v));

export const activitySchema = z.object({
  name: z.string().min(1).max(120),
  type: z.string().min(1).max(60),
});

export const createTripSchema = z.object({
  name: z.string().min(1).max(120),
  destination: z.string().min(1).max(160),
  destinationLat: z.number().min(-90).max(90).optional(),
  destinationLon: z.number().min(-180).max(180).optional(),
  purpose: tripPurposeSchema.default(TripPurpose.LEISURE),
  startDate: isoDate.nullish(),
  endDate: isoDate.nullish(),
  notes: z.string().max(2000).optional(),
  templateId: z.string().min(1).optional(),
  activities: z.array(activitySchema).max(30).optional(),
  /** Generate the packing list immediately after creating the trip. */
  generatePackingList: z.boolean().default(true),
});

export const updateTripSchema = z
  .object({
    name: z.string().min(1).max(120),
    destination: z.string().min(1).max(160),
    destinationLat: z.number().min(-90).max(90).nullable(),
    destinationLon: z.number().min(-180).max(180).nullable(),
    purpose: tripPurposeSchema,
    startDate: isoDate.nullable(),
    endDate: isoDate.nullable(),
    notes: z.string().max(2000).nullable(),
    status: tripStatusSchema,
    activities: z.array(activitySchema).max(30),
  })
  .partial();

export const addPackingItemSchema = z.object({
  name: z.string().min(1).max(120),
  category: itemCategorySchema.default(ItemCategory.OTHER),
  quantity: z.number().int().min(1).max(99).default(1),
  isEssential: z.boolean().default(false),
  notes: z.string().max(500).optional(),
});

export const updatePackingItemSchema = z
  .object({
    name: z.string().min(1).max(120),
    category: itemCategorySchema,
    quantity: z.number().int().min(1).max(99),
    isPacked: z.boolean(),
    isEssential: z.boolean(),
    notes: z.string().max(500).nullable(),
  })
  .partial();

export const saveTemplateSchema = z.object({
  /** Existing trip to snapshot into a template. */
  tripId: z.string().min(1),
  /** Optional override name for the template. */
  name: z.string().min(1).max(120).optional(),
});

export const useTemplateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  destination: z.string().min(1).max(160).optional(),
  startDate: isoDate.nullish(),
  endDate: isoDate.nullish(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  homeLatitude: z.number().min(-90).max(90).optional(),
  homeLongitude: z.number().min(-180).max(180).optional(),
});

export const updateUserSchema = z
  .object({
    name: z.string().min(1).max(120),
    homeLatitude: z.number().min(-90).max(90).nullable(),
    homeLongitude: z.number().min(-180).max(180).nullable(),
  })
  .partial();

export const reportForgottenItemSchema = z.object({
  itemName: z.string().min(1).max(120),
  category: itemCategorySchema.default(ItemCategory.OTHER),
  tripId: z.string().min(1).optional(),
});
