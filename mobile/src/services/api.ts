import axios, { type AxiosInstance } from "axios";
import Constants from "expo-constants";
import type {
  CreateTripPayload,
  ForgottenItem,
  ItemCategory,
  PackingItem,
  PackingListResponse,
  Reminder,
  Trip,
  TripTemplate,
  User,
} from "../types";
import * as demo from "./demoData";

/**
 * Axios client for the PackPal backend. The base URL comes from app.json's
 * `extra.apiBaseUrl` (override per-environment). The current user's id is sent
 * as the `x-user-id` header, matching the backend's dev auth middleware.
 */

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiBaseUrl?: string;
  demoUserId?: string;
};

export const API_BASE_URL = extra.apiBaseUrl || "http://localhost:4000";
export const CONFIGURED_DEMO_USER_ID = extra.demoUserId || "";

/**
 * When enabled, every call is served by an in-memory demo store instead of the
 * backend (used for the standalone web preview deploy). Toggled at build time
 * via `EXPO_PUBLIC_DEMO_MODE=1` or `extra.demoMode` in app config.
 */
export const DEMO_MODE =
  process.env.EXPO_PUBLIC_DEMO_MODE === "1" ||
  (extra as { demoMode?: boolean }).demoMode === true;

const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

let currentUserId: string | null = null;

export function setAuthUser(userId: string | null): void {
  currentUserId = userId;
}

client.interceptors.request.use((config) => {
  if (currentUserId) {
    config.headers.set("x-user-id", currentUserId);
  }
  return config;
});

// --- Users -----------------------------------------------------------------

export async function listUsers(): Promise<User[]> {
  if (DEMO_MODE) return demo.listUsers();
  const { data } = await client.get<User[]>("/api/users");
  return data;
}

export async function createUser(input: {
  email: string;
  name: string;
  homeLatitude?: number;
  homeLongitude?: number;
}): Promise<User> {
  if (DEMO_MODE) return demo.createUser(input);
  const { data } = await client.post<User>("/api/users", input);
  return data;
}

export async function updateUserHome(
  userId: string,
  homeLatitude: number,
  homeLongitude: number
): Promise<User> {
  if (DEMO_MODE) return demo.updateUserHome(userId, homeLatitude, homeLongitude);
  const { data } = await client.put<User>(`/api/users/${userId}`, {
    homeLatitude,
    homeLongitude,
  });
  return data;
}

// --- Trips -----------------------------------------------------------------

export async function listTrips(): Promise<Trip[]> {
  if (DEMO_MODE) return demo.listTrips();
  const { data } = await client.get<Trip[]>("/api/trips");
  return data;
}

export async function getTrip(tripId: string): Promise<Trip> {
  if (DEMO_MODE) return demo.getTrip(tripId);
  const { data } = await client.get<Trip>(`/api/trips/${tripId}`);
  return data;
}

export async function createTrip(
  payload: CreateTripPayload
): Promise<{ trip: Trip; weatherAvailable: boolean }> {
  if (DEMO_MODE) return demo.createTrip(payload);
  const { data } = await client.post<{ trip: Trip; weatherAvailable: boolean }>(
    "/api/trips",
    payload
  );
  return data;
}

export async function completeTrip(tripId: string): Promise<{
  trip: Trip;
  forgottenCandidates: PackingItem[];
}> {
  if (DEMO_MODE) return demo.completeTrip(tripId);
  const { data } = await client.post(`/api/trips/${tripId}/complete`);
  return data;
}

export async function cloneTrip(tripId: string): Promise<Trip> {
  if (DEMO_MODE) return demo.cloneTrip(tripId);
  const { data } = await client.post<Trip>(`/api/trips/${tripId}/clone`);
  return data;
}

export async function deleteTrip(tripId: string): Promise<void> {
  if (DEMO_MODE) return demo.deleteTrip(tripId);
  await client.delete(`/api/trips/${tripId}`);
}

// --- Packing list ----------------------------------------------------------

export async function getPackingList(
  tripId: string
): Promise<PackingListResponse> {
  if (DEMO_MODE) return demo.getPackingList(tripId);
  const { data } = await client.get<PackingListResponse>(
    `/api/trips/${tripId}/packing-list`
  );
  return data;
}

export async function setItemPacked(
  tripId: string,
  itemId: string,
  isPacked: boolean
): Promise<PackingItem> {
  if (DEMO_MODE) return demo.setItemPacked(tripId, itemId, isPacked);
  const { data } = await client.put<PackingItem>(
    `/api/trips/${tripId}/packing-list/${itemId}`,
    { isPacked }
  );
  return data;
}

export async function addPackingItem(
  tripId: string,
  input: { name: string; category?: ItemCategory; quantity?: number }
): Promise<PackingItem> {
  if (DEMO_MODE) return demo.addPackingItem(tripId, input);
  const { data } = await client.post<PackingItem>(
    `/api/trips/${tripId}/packing-list`,
    input
  );
  return data;
}

export async function deletePackingItem(
  tripId: string,
  itemId: string
): Promise<void> {
  if (DEMO_MODE) return demo.deletePackingItem(tripId, itemId);
  await client.delete(`/api/trips/${tripId}/packing-list/${itemId}`);
}

// --- Templates -------------------------------------------------------------

export async function listTemplates(): Promise<TripTemplate[]> {
  if (DEMO_MODE) return demo.listTemplates();
  const { data } = await client.get<TripTemplate[]>("/api/templates");
  return data;
}

export async function saveTemplate(
  tripId: string,
  name?: string
): Promise<Trip> {
  if (DEMO_MODE) return demo.saveTemplate(tripId, name);
  const { data } = await client.post<Trip>("/api/templates", { tripId, name });
  return data;
}

export async function useTemplate(
  templateId: string,
  overrides?: { name?: string; destination?: string; startDate?: string; endDate?: string }
): Promise<Trip> {
  if (DEMO_MODE) return demo.useTemplate(templateId, overrides);
  const { data } = await client.post<Trip>(
    `/api/templates/${templateId}/use`,
    overrides ?? {}
  );
  return data;
}

export async function deleteTemplate(templateId: string): Promise<void> {
  if (DEMO_MODE) return demo.deleteTemplate(templateId);
  await client.delete(`/api/templates/${templateId}`);
}

// --- Forgotten items -------------------------------------------------------

export async function listForgottenItems(): Promise<ForgottenItem[]> {
  if (DEMO_MODE) return demo.listForgottenItems();
  const { data } = await client.get<ForgottenItem[]>("/api/forgotten-items");
  return data;
}

export async function reportForgottenItem(input: {
  itemName: string;
  category?: ItemCategory;
  tripId?: string;
}): Promise<ForgottenItem> {
  if (DEMO_MODE) return demo.reportForgottenItem(input);
  const { data } = await client.post<ForgottenItem>(
    "/api/forgotten-items",
    input
  );
  return data;
}

// --- Reminders -------------------------------------------------------------

export async function getDepartureReminders(
  hours = 24
): Promise<Reminder[]> {
  if (DEMO_MODE) return demo.getDepartureReminders(hours);
  const { data } = await client.get<{ reminders: Reminder[] }>(
    "/api/reminders/departures",
    { params: { hours } }
  );
  return data.reminders;
}

export default client;
