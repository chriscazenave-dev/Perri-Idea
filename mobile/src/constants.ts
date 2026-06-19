import type {
  ActivityChip,
  ItemCategory,
  TripPurpose,
  WeatherCondition,
} from "./types";

export const PURPOSE_OPTIONS: { value: TripPurpose; label: string }[] = [
  { value: "LEISURE", label: "Leisure" },
  { value: "WORK", label: "Work" },
  { value: "CONFERENCE", label: "Conference" },
  { value: "ADVENTURE", label: "Adventure" },
  { value: "OTHER", label: "Other" },
];

/** Selectable activity chips on the Create Trip screen. */
export const ACTIVITY_CHIPS: ActivityChip[] = [
  { label: "Beach", type: "beach" },
  { label: "Hiking", type: "hiking" },
  { label: "Formal dinner", type: "formal" },
  { label: "Sightseeing", type: "sightseeing" },
  { label: "Conference", type: "conference" },
  { label: "Camping", type: "outdoor" },
  { label: "Swimming", type: "beach" },
];

export const CATEGORY_META: Record<
  ItemCategory,
  { label: string; emoji: string }
> = {
  CLOTHING: { label: "Clothing", emoji: "👕" },
  TOILETRIES: { label: "Toiletries", emoji: "🧴" },
  ELECTRONICS: { label: "Electronics", emoji: "🔌" },
  DOCUMENTS: { label: "Documents", emoji: "📄" },
  ACCESSORIES: { label: "Accessories", emoji: "🕶️" },
  GEAR: { label: "Gear", emoji: "🎒" },
  OTHER: { label: "Other", emoji: "📦" },
};

export const CATEGORY_ORDER: ItemCategory[] = [
  "DOCUMENTS",
  "CLOTHING",
  "TOILETRIES",
  "ELECTRONICS",
  "ACCESSORIES",
  "GEAR",
  "OTHER",
];

export const WEATHER_META: Record<
  WeatherCondition,
  { label: string; emoji: string }
> = {
  hot: { label: "Hot", emoji: "☀️" },
  cold: { label: "Cold", emoji: "❄️" },
  rainy: { label: "Rainy", emoji: "🌧️" },
  mild: { label: "Mild", emoji: "⛅" },
};
