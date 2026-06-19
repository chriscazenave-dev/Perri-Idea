import { ItemCategory, TripPurpose } from "@prisma/client";

/**
 * Curated default packing items used by the packing engine. The data is split
 * into independent buckets (base / purpose / activity / weather / duration) so
 * the engine can mix and match based on a trip's attributes.
 */

export type WeatherCondition = "hot" | "cold" | "rainy" | "mild";

export interface DefaultItem {
  name: string;
  category: ItemCategory;
  /** Default quantity. Items scaled by trip duration ignore this. */
  quantity?: number;
  /** Marked with a warning badge in the UI; surfaced first in reminders. */
  isEssential?: boolean;
  notes?: string;
}

/** Items every trip needs regardless of purpose, activity, or weather. */
export const BASE_ITEMS: DefaultItem[] = [
  { name: "Phone", category: ItemCategory.ELECTRONICS, isEssential: true },
  { name: "Phone charger", category: ItemCategory.ELECTRONICS, isEssential: true },
  { name: "Wallet", category: ItemCategory.ACCESSORIES, isEssential: true },
  { name: "Keys", category: ItemCategory.ACCESSORIES, isEssential: true },
  { name: "ID / Driver's license", category: ItemCategory.DOCUMENTS, isEssential: true },
  { name: "Toothbrush", category: ItemCategory.TOILETRIES },
  { name: "Toothpaste", category: ItemCategory.TOILETRIES },
  { name: "Deodorant", category: ItemCategory.TOILETRIES },
  { name: "Shampoo", category: ItemCategory.TOILETRIES },
  { name: "Body wash", category: ItemCategory.TOILETRIES },
  { name: "Hairbrush / comb", category: ItemCategory.TOILETRIES },
  { name: "Prescription medications", category: ItemCategory.TOILETRIES, isEssential: true },
  { name: "Pajamas", category: ItemCategory.CLOTHING },
];

/** Clothing whose quantity scales with the number of trip days. */
export interface DurationScaledItem extends DefaultItem {
  /** quantity = days * perDay + extra (rounded up, minimum 1). */
  perDay: number;
  extra: number;
}

export const DURATION_SCALED_ITEMS: DurationScaledItem[] = [
  { name: "Underwear", category: ItemCategory.CLOTHING, perDay: 1, extra: 1 },
  { name: "Socks", category: ItemCategory.CLOTHING, perDay: 1, extra: 1 },
  { name: "T-shirts", category: ItemCategory.CLOTHING, perDay: 1, extra: 0 },
];

/** Items keyed by the trip's primary purpose. */
export const PURPOSE_ITEMS: Record<TripPurpose, DefaultItem[]> = {
  [TripPurpose.LEISURE]: [
    { name: "Casual outfits", category: ItemCategory.CLOTHING, quantity: 2 },
    { name: "Comfortable walking shoes", category: ItemCategory.CLOTHING },
    { name: "Camera", category: ItemCategory.ELECTRONICS },
    { name: "Book / e-reader", category: ItemCategory.ACCESSORIES },
    { name: "Reusable water bottle", category: ItemCategory.GEAR },
  ],
  [TripPurpose.WORK]: [
    { name: "Business attire", category: ItemCategory.CLOTHING, quantity: 2, isEssential: true },
    { name: "Dress shoes", category: ItemCategory.CLOTHING },
    { name: "Laptop", category: ItemCategory.ELECTRONICS, isEssential: true },
    { name: "Laptop charger", category: ItemCategory.ELECTRONICS, isEssential: true },
    { name: "Notebook", category: ItemCategory.ACCESSORIES },
    { name: "Work badge / access card", category: ItemCategory.DOCUMENTS },
  ],
  [TripPurpose.CONFERENCE]: [
    { name: "Business casual outfits", category: ItemCategory.CLOTHING, quantity: 2 },
    { name: "Laptop", category: ItemCategory.ELECTRONICS, isEssential: true },
    { name: "Laptop charger", category: ItemCategory.ELECTRONICS, isEssential: true },
    { name: "Business cards", category: ItemCategory.ACCESSORIES, isEssential: true },
    { name: "Notebook", category: ItemCategory.ACCESSORIES },
    { name: "Conference badge / ticket", category: ItemCategory.DOCUMENTS, isEssential: true },
    { name: "Portable battery pack", category: ItemCategory.ELECTRONICS },
  ],
  [TripPurpose.ADVENTURE]: [
    { name: "Activewear", category: ItemCategory.CLOTHING, quantity: 2 },
    { name: "Trail shoes", category: ItemCategory.CLOTHING },
    { name: "Daypack", category: ItemCategory.GEAR },
    { name: "Reusable water bottle", category: ItemCategory.GEAR, isEssential: true },
    { name: "First-aid kit", category: ItemCategory.GEAR, isEssential: true },
    { name: "Headlamp / flashlight", category: ItemCategory.GEAR },
  ],
  [TripPurpose.OTHER]: [
    { name: "Casual outfits", category: ItemCategory.CLOTHING, quantity: 2 },
    { name: "Comfortable shoes", category: ItemCategory.CLOTHING },
  ],
};

/**
 * Items keyed by activity type. Activity names from the UI are normalized
 * (lowercased, trimmed) and matched against these keys, with a few aliases.
 */
export const ACTIVITY_ITEMS: Record<string, DefaultItem[]> = {
  beach: [
    { name: "Swimsuit", category: ItemCategory.CLOTHING, isEssential: true },
    { name: "Beach towel", category: ItemCategory.GEAR },
    { name: "Sunscreen", category: ItemCategory.TOILETRIES, isEssential: true },
    { name: "Flip-flops / sandals", category: ItemCategory.CLOTHING },
    { name: "Sunglasses", category: ItemCategory.ACCESSORIES },
    { name: "Beach hat", category: ItemCategory.ACCESSORIES },
  ],
  hiking: [
    { name: "Hiking boots", category: ItemCategory.CLOTHING, isEssential: true },
    { name: "Moisture-wicking socks", category: ItemCategory.CLOTHING },
    { name: "Water bottle", category: ItemCategory.GEAR, isEssential: true },
    { name: "Trail snacks", category: ItemCategory.GEAR },
    { name: "Insect repellent", category: ItemCategory.TOILETRIES },
    { name: "Trekking poles", category: ItemCategory.GEAR },
  ],
  formal: [
    { name: "Formal outfit", category: ItemCategory.CLOTHING, isEssential: true },
    { name: "Formal shoes", category: ItemCategory.CLOTHING },
    { name: "Dress belt", category: ItemCategory.ACCESSORIES },
    { name: "Jewelry / accessories", category: ItemCategory.ACCESSORIES },
  ],
  outdoor: [
    { name: "Rain shell", category: ItemCategory.CLOTHING },
    { name: "Sunglasses", category: ItemCategory.ACCESSORIES },
    { name: "Insect repellent", category: ItemCategory.TOILETRIES },
    { name: "Multi-tool", category: ItemCategory.GEAR },
  ],
  urban: [
    { name: "Comfortable walking shoes", category: ItemCategory.CLOTHING },
    { name: "Daybag", category: ItemCategory.ACCESSORIES },
    { name: "Public transit card", category: ItemCategory.DOCUMENTS },
    { name: "Portable battery pack", category: ItemCategory.ELECTRONICS },
  ],
};

/**
 * Activity name aliases from the CreateTrip UI chips → canonical ACTIVITY_ITEMS key.
 */
export const ACTIVITY_ALIASES: Record<string, string> = {
  beach: "beach",
  swimming: "beach",
  pool: "beach",
  hiking: "hiking",
  trekking: "hiking",
  "formal dinner": "formal",
  formal: "formal",
  wedding: "formal",
  outdoor: "outdoor",
  camping: "outdoor",
  sightseeing: "urban",
  city: "urban",
  urban: "urban",
  conference: "urban",
};

/** Items keyed by derived weather condition for the destination/date range. */
export const WEATHER_ITEMS: Record<WeatherCondition, DefaultItem[]> = {
  hot: [
    { name: "Light breathable clothing", category: ItemCategory.CLOTHING },
    { name: "Sunglasses", category: ItemCategory.ACCESSORIES },
    { name: "Sunscreen", category: ItemCategory.TOILETRIES, isEssential: true },
    { name: "Sun hat", category: ItemCategory.ACCESSORIES },
    { name: "Extra socks & underwear", category: ItemCategory.CLOTHING },
  ],
  cold: [
    { name: "Warm coat", category: ItemCategory.CLOTHING, isEssential: true },
    { name: "Thermal layers", category: ItemCategory.CLOTHING },
    { name: "Gloves", category: ItemCategory.ACCESSORIES },
    { name: "Beanie / warm hat", category: ItemCategory.ACCESSORIES },
    { name: "Scarf", category: ItemCategory.ACCESSORIES },
    { name: "Lip balm", category: ItemCategory.TOILETRIES },
  ],
  rainy: [
    { name: "Umbrella", category: ItemCategory.ACCESSORIES, isEssential: true },
    { name: "Rain jacket", category: ItemCategory.CLOTHING, isEssential: true },
    { name: "Waterproof shoes", category: ItemCategory.CLOTHING },
    { name: "Dry bag for electronics", category: ItemCategory.GEAR },
  ],
  mild: [
    { name: "Light jacket", category: ItemCategory.CLOTHING },
    { name: "Layerable long-sleeve", category: ItemCategory.CLOTHING },
  ],
};
