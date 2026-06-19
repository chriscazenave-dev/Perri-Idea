// Shared domain types mirroring the PackPal backend API.
import type { NavigatorScreenParams } from "@react-navigation/native";

export type TripPurpose =
  | "LEISURE"
  | "WORK"
  | "CONFERENCE"
  | "ADVENTURE"
  | "OTHER";

export type TripStatus = "PLANNING" | "ACTIVE" | "COMPLETED";

export type ItemCategory =
  | "CLOTHING"
  | "TOILETRIES"
  | "ELECTRONICS"
  | "DOCUMENTS"
  | "ACCESSORIES"
  | "GEAR"
  | "OTHER";

export type WeatherCondition = "hot" | "cold" | "rainy" | "mild";

export interface User {
  id: string;
  email: string;
  name: string;
  homeLatitude: number | null;
  homeLongitude: number | null;
  createdAt: string;
}

export interface TripActivity {
  id: string;
  tripId: string;
  name: string;
  type: string;
}

export interface PackingItem {
  id: string;
  tripId: string;
  name: string;
  category: ItemCategory;
  isPacked: boolean;
  quantity: number;
  notes: string | null;
  isEssential: boolean;
}

export interface Progress {
  packed: number;
  total: number;
}

export interface Trip {
  id: string;
  userId: string;
  name: string;
  destination: string;
  destinationLat: number | null;
  destinationLon: number | null;
  purpose: TripPurpose;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  isTemplate: boolean;
  templateId: string | null;
  status: TripStatus;
  createdAt: string;
  activities?: TripActivity[];
  packingItems?: PackingItem[];
  progress?: Progress;
}

export interface TripTemplate extends Trip {
  itemCount: number;
}

export interface WeatherSummary {
  available: boolean;
  condition: WeatherCondition;
  avgTempC: number | null;
  minTempC: number | null;
  maxTempC: number | null;
  rainProbability: number | null;
  description: string;
  source: "openweather" | "unavailable";
}

export interface PackingListResponse {
  trip: { id: string; name: string; destination: string };
  weather: WeatherSummary;
  progress: Progress;
  items: PackingItem[];
}

export interface ForgottenItem {
  id: string;
  userId: string;
  itemName: string;
  category: ItemCategory;
  forgottenCount: number;
  lastForgottenDate: string;
  tripId: string | null;
}

export interface Reminder {
  tripId: string;
  type: "departure" | "night_before";
  title: string;
  body: string;
}

export interface ActivityChip {
  label: string;
  type: string;
}

export interface CreateTripPayload {
  name: string;
  destination: string;
  destinationLat?: number;
  destinationLon?: number;
  purpose: TripPurpose;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string;
  activities?: { name: string; type: string }[];
  generatePackingList?: boolean;
}

// Navigation param lists.
export type TabParamList = {
  Home: undefined;
  Templates: undefined;
  History: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  CreateTrip: { templateId?: string } | undefined;
  PackingList: { tripId: string; tripName?: string };
};
