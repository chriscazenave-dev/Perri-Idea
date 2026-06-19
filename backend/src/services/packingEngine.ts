import { ItemCategory, TripPurpose } from "@prisma/client";
import {
  ACTIVITY_ALIASES,
  ACTIVITY_ITEMS,
  BASE_ITEMS,
  DURATION_SCALED_ITEMS,
  PURPOSE_ITEMS,
  WEATHER_ITEMS,
  type DefaultItem,
} from "../data/defaultItems";
import type { WeatherSummary } from "./weatherService";

/**
 * The "smart" packing list generator. It composes a list from several sources:
 * template carryover, base essentials, purpose, activities, weather, and
 * duration-based quantity scaling — then boosts the user's frequently
 * forgotten items so they're flagged as essential.
 */

export interface GeneratedItem {
  name: string;
  category: ItemCategory;
  quantity: number;
  isEssential: boolean;
  notes: string | null;
}

export interface ForgottenItemInput {
  itemName: string;
  category: ItemCategory;
  forgottenCount: number;
}

export interface PackingEngineInput {
  purpose: TripPurpose;
  startDate?: Date | null;
  endDate?: Date | null;
  activities: { name: string; type: string }[];
  weather?: WeatherSummary | null;
  forgottenItems?: ForgottenItemInput[];
  /** Items carried over from a template trip the new trip is based on. */
  templateItems?: GeneratedItem[];
}

const DEFAULT_TRIP_DAYS = 3;

/** Inclusive trip length in days; falls back to a sensible default. */
export function computeTripDays(
  startDate?: Date | null,
  endDate?: Date | null
): number {
  if (!startDate || !endDate) return DEFAULT_TRIP_DAYS;
  const diffMs = endDate.getTime() - startDate.getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return DEFAULT_TRIP_DAYS;
  return Math.max(1, Math.round(diffMs / 86_400_000) + 1);
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/** Inserts an item into the accumulator, merging duplicates by name. */
function addItem(acc: Map<string, GeneratedItem>, item: GeneratedItem): void {
  const key = normalizeName(item.name);
  const existing = acc.get(key);
  if (!existing) {
    acc.set(key, { ...item });
    return;
  }
  existing.quantity = Math.max(existing.quantity, item.quantity);
  existing.isEssential = existing.isEssential || item.isEssential;
  if (!existing.notes && item.notes) existing.notes = item.notes;
}

function toGenerated(item: DefaultItem): GeneratedItem {
  return {
    name: item.name,
    category: item.category,
    quantity: item.quantity ?? 1,
    isEssential: item.isEssential ?? false,
    notes: item.notes ?? null,
  };
}

export function generatePackingList(input: PackingEngineInput): GeneratedItem[] {
  const acc = new Map<string, GeneratedItem>();

  // 1. Template carryover first so explicit template choices win on merges.
  for (const item of input.templateItems ?? []) {
    addItem(acc, { ...item });
  }

  // 2. Base essentials.
  for (const item of BASE_ITEMS) addItem(acc, toGenerated(item));

  // 3. Duration-scaled clothing.
  const days = computeTripDays(input.startDate, input.endDate);
  for (const item of DURATION_SCALED_ITEMS) {
    const quantity = Math.max(1, Math.ceil(days * item.perDay + item.extra));
    addItem(acc, {
      name: item.name,
      category: item.category,
      quantity,
      isEssential: item.isEssential ?? false,
      notes: item.notes ?? null,
    });
  }

  // 4. Purpose-based items.
  for (const item of PURPOSE_ITEMS[input.purpose] ?? []) {
    addItem(acc, toGenerated(item));
  }

  // 5. Activity-based items.
  for (const activity of input.activities) {
    const raw = normalizeName(activity.type || activity.name);
    const key = ACTIVITY_ALIASES[raw] ?? raw;
    for (const item of ACTIVITY_ITEMS[key] ?? []) addItem(acc, toGenerated(item));
  }

  // 6. Weather-adjusted items (only when forecast is available).
  if (input.weather?.available) {
    for (const item of WEATHER_ITEMS[input.weather.condition] ?? []) {
      addItem(acc, toGenerated(item));
    }
  }

  // 7. Forgotten-item boosters: flag as essential with a reminder note.
  for (const forgotten of input.forgottenItems ?? []) {
    const note = forgottenNote(forgotten.forgottenCount);
    const key = normalizeName(forgotten.itemName);
    const existing = acc.get(key);
    if (existing) {
      existing.isEssential = true;
      existing.notes = note;
    } else {
      addItem(acc, {
        name: forgotten.itemName,
        category: forgotten.category,
        quantity: 1,
        isEssential: true,
        notes: note,
      });
    }
  }

  return Array.from(acc.values());
}

function forgottenNote(count: number): string {
  if (count >= 2) return `You've forgotten this ${count} times — don't forget it!`;
  return "You forgot this last time — don't forget it!";
}
