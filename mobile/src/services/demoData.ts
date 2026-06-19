/**
 * In-memory demo backend for the web preview build.
 *
 * When `EXPO_PUBLIC_DEMO_MODE` is enabled the api client routes every call here
 * instead of hitting the Express server, so the UI is fully clickable with
 * realistic data and no database. Mutations persist for the browser session.
 *
 * The packing-list generation mirrors the real backend packing engine
 * (base + duration scaling + purpose + activity + weather + forgotten boosters)
 * so generated lists look authentic.
 */
import type {
  CreateTripPayload,
  ForgottenItem,
  ItemCategory,
  PackingItem,
  PackingListResponse,
  Reminder,
  Trip,
  TripActivity,
  TripPurpose,
  TripTemplate,
  User,
  WeatherCondition,
  WeatherSummary,
} from "../types";

// --- id / time helpers -----------------------------------------------------

let seq = 1;
const id = (prefix: string): string => `${prefix}_${seq++}`;
const iso = (offsetDays: number): string =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString();

/** Small artificial latency so loading states render naturally. */
const delay = <T>(value: T, ms = 140): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

// --- curated dataset (mirrors backend/src/data/defaultItems.ts) ------------

interface SeedItem {
  name: string;
  category: ItemCategory;
  quantity?: number;
  isEssential?: boolean;
  notes?: string;
}

const BASE_ITEMS: SeedItem[] = [
  { name: "Phone", category: "ELECTRONICS", isEssential: true },
  { name: "Phone charger", category: "ELECTRONICS", isEssential: true },
  { name: "Wallet", category: "ACCESSORIES", isEssential: true },
  { name: "Keys", category: "ACCESSORIES", isEssential: true },
  { name: "ID / Driver's license", category: "DOCUMENTS", isEssential: true },
  { name: "Toothbrush", category: "TOILETRIES" },
  { name: "Toothpaste", category: "TOILETRIES" },
  { name: "Deodorant", category: "TOILETRIES" },
  { name: "Shampoo", category: "TOILETRIES" },
  { name: "Body wash", category: "TOILETRIES" },
  { name: "Hairbrush / comb", category: "TOILETRIES" },
  { name: "Prescription medications", category: "TOILETRIES", isEssential: true },
  { name: "Pajamas", category: "CLOTHING" },
];

interface DurationItem extends SeedItem {
  perDay: number;
  extra: number;
}

const DURATION_SCALED_ITEMS: DurationItem[] = [
  { name: "Underwear", category: "CLOTHING", perDay: 1, extra: 1 },
  { name: "Socks", category: "CLOTHING", perDay: 1, extra: 1 },
  { name: "T-shirts", category: "CLOTHING", perDay: 1, extra: 0 },
];

const PURPOSE_ITEMS: Record<TripPurpose, SeedItem[]> = {
  LEISURE: [
    { name: "Casual outfits", category: "CLOTHING", quantity: 2 },
    { name: "Comfortable walking shoes", category: "CLOTHING" },
    { name: "Camera", category: "ELECTRONICS" },
    { name: "Book / e-reader", category: "ACCESSORIES" },
    { name: "Reusable water bottle", category: "GEAR" },
  ],
  WORK: [
    { name: "Business attire", category: "CLOTHING", quantity: 2, isEssential: true },
    { name: "Dress shoes", category: "CLOTHING" },
    { name: "Laptop", category: "ELECTRONICS", isEssential: true },
    { name: "Laptop charger", category: "ELECTRONICS", isEssential: true },
    { name: "Notebook", category: "ACCESSORIES" },
    { name: "Work badge / access card", category: "DOCUMENTS" },
  ],
  CONFERENCE: [
    { name: "Business casual outfits", category: "CLOTHING", quantity: 2 },
    { name: "Laptop", category: "ELECTRONICS", isEssential: true },
    { name: "Laptop charger", category: "ELECTRONICS", isEssential: true },
    { name: "Business cards", category: "ACCESSORIES", isEssential: true },
    { name: "Notebook", category: "ACCESSORIES" },
    { name: "Conference badge / ticket", category: "DOCUMENTS", isEssential: true },
    { name: "Portable battery pack", category: "ELECTRONICS" },
  ],
  ADVENTURE: [
    { name: "Activewear", category: "CLOTHING", quantity: 2 },
    { name: "Trail shoes", category: "CLOTHING" },
    { name: "Daypack", category: "GEAR" },
    { name: "Reusable water bottle", category: "GEAR", isEssential: true },
    { name: "First-aid kit", category: "GEAR", isEssential: true },
    { name: "Headlamp / flashlight", category: "GEAR" },
  ],
  OTHER: [
    { name: "Casual outfits", category: "CLOTHING", quantity: 2 },
    { name: "Comfortable shoes", category: "CLOTHING" },
  ],
};

const ACTIVITY_ITEMS: Record<string, SeedItem[]> = {
  beach: [
    { name: "Swimsuit", category: "CLOTHING", isEssential: true },
    { name: "Beach towel", category: "GEAR" },
    { name: "Sunscreen", category: "TOILETRIES", isEssential: true },
    { name: "Flip-flops / sandals", category: "CLOTHING" },
    { name: "Sunglasses", category: "ACCESSORIES" },
    { name: "Beach hat", category: "ACCESSORIES" },
  ],
  hiking: [
    { name: "Hiking boots", category: "CLOTHING", isEssential: true },
    { name: "Moisture-wicking socks", category: "CLOTHING" },
    { name: "Water bottle", category: "GEAR", isEssential: true },
    { name: "Trail snacks", category: "GEAR" },
    { name: "Insect repellent", category: "TOILETRIES" },
    { name: "Trekking poles", category: "GEAR" },
  ],
  formal: [
    { name: "Formal outfit", category: "CLOTHING", isEssential: true },
    { name: "Formal shoes", category: "CLOTHING" },
    { name: "Dress belt", category: "ACCESSORIES" },
    { name: "Jewelry / accessories", category: "ACCESSORIES" },
  ],
  outdoor: [
    { name: "Rain shell", category: "CLOTHING" },
    { name: "Sunglasses", category: "ACCESSORIES" },
    { name: "Insect repellent", category: "TOILETRIES" },
    { name: "Multi-tool", category: "GEAR" },
  ],
  urban: [
    { name: "Comfortable walking shoes", category: "CLOTHING" },
    { name: "Daybag", category: "ACCESSORIES" },
    { name: "Public transit card", category: "DOCUMENTS" },
    { name: "Portable battery pack", category: "ELECTRONICS" },
  ],
};

const ACTIVITY_ALIASES: Record<string, string> = {
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

const WEATHER_ITEMS: Record<WeatherCondition, SeedItem[]> = {
  hot: [
    { name: "Light breathable clothing", category: "CLOTHING" },
    { name: "Sunglasses", category: "ACCESSORIES" },
    { name: "Sunscreen", category: "TOILETRIES", isEssential: true },
    { name: "Sun hat", category: "ACCESSORIES" },
    { name: "Extra socks & underwear", category: "CLOTHING" },
  ],
  cold: [
    { name: "Warm coat", category: "CLOTHING", isEssential: true },
    { name: "Thermal layers", category: "CLOTHING" },
    { name: "Gloves", category: "ACCESSORIES" },
    { name: "Beanie / warm hat", category: "ACCESSORIES" },
    { name: "Scarf", category: "ACCESSORIES" },
    { name: "Lip balm", category: "TOILETRIES" },
  ],
  rainy: [
    { name: "Umbrella", category: "ACCESSORIES", isEssential: true },
    { name: "Rain jacket", category: "CLOTHING", isEssential: true },
    { name: "Waterproof shoes", category: "CLOTHING" },
    { name: "Dry bag for electronics", category: "GEAR" },
  ],
  mild: [
    { name: "Light jacket", category: "CLOTHING" },
    { name: "Layerable long-sleeve", category: "CLOTHING" },
  ],
};

// --- weather (deterministic from destination) ------------------------------

const CONDITION_TEMP: Record<WeatherCondition, { avg: number; rain: number; desc: string }> = {
  hot: { avg: 30, rain: 0.1, desc: "Sunny and warm" },
  cold: { avg: -1, rain: 0.2, desc: "Cold with a chance of snow" },
  rainy: { avg: 13, rain: 0.8, desc: "Showers expected" },
  mild: { avg: 17, rain: 0.3, desc: "Mild and partly cloudy" },
};

function pickCondition(destination: string): WeatherCondition {
  const d = destination.toLowerCase();
  if (/(miami|beach|hawaii|phoenix|austin|tampa|cancun|maui|vegas)/.test(d)) return "hot";
  if (/(denver|ski|aspen|alaska|reykjavik|oslo|alps|whistler)/.test(d)) return "cold";
  if (/(seattle|london|portland|rain|vancouver|dublin)/.test(d)) return "rainy";
  if (/(new york|nyc|chicago|paris|boston|tokyo|berlin)/.test(d)) return "mild";
  // Deterministic fallback so a destination always maps to the same weather.
  const order: WeatherCondition[] = ["mild", "hot", "rainy", "cold"];
  let hash = 0;
  for (let i = 0; i < d.length; i += 1) hash = (hash * 31 + d.charCodeAt(i)) >>> 0;
  return order[hash % order.length];
}

function demoWeather(destination: string): WeatherSummary {
  const condition = pickCondition(destination);
  const { avg, rain, desc } = CONDITION_TEMP[condition];
  return {
    available: true,
    condition,
    avgTempC: avg,
    minTempC: avg - 4,
    maxTempC: avg + 4,
    rainProbability: rain,
    description: desc,
    source: "openweather",
  };
}

// --- packing engine (mirrors backend) --------------------------------------

const DEFAULT_TRIP_DAYS = 3;

function computeTripDays(start?: string | null, end?: string | null): number {
  if (!start || !end) return DEFAULT_TRIP_DAYS;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  if (Number.isNaN(diff) || diff < 0) return DEFAULT_TRIP_DAYS;
  return Math.max(1, Math.round(diff / 86_400_000) + 1);
}

type Generated = Omit<PackingItem, "id" | "tripId" | "isPacked">;

function forgottenNote(count: number): string {
  if (count >= 2) return `You've forgotten this ${count} times — don't forget it!`;
  return "You forgot this last time — don't forget it!";
}

function mergeItem(acc: Map<string, Generated>, item: Generated): void {
  const key = item.name.trim().toLowerCase();
  const existing = acc.get(key);
  if (!existing) {
    acc.set(key, { ...item });
    return;
  }
  existing.quantity = Math.max(existing.quantity, item.quantity);
  existing.isEssential = existing.isEssential || item.isEssential;
  if (!existing.notes && item.notes) existing.notes = item.notes;
}

function toGenerated(item: SeedItem): Generated {
  return {
    name: item.name,
    category: item.category,
    quantity: item.quantity ?? 1,
    isEssential: item.isEssential ?? false,
    notes: item.notes ?? null,
  };
}

function generateItems(
  purpose: TripPurpose,
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  activities: { name: string; type: string }[],
  weather: WeatherSummary,
  forgotten: ForgottenItem[]
): Generated[] {
  const acc = new Map<string, Generated>();

  for (const item of BASE_ITEMS) mergeItem(acc, toGenerated(item));

  const days = computeTripDays(startDate, endDate);
  for (const item of DURATION_SCALED_ITEMS) {
    mergeItem(acc, {
      name: item.name,
      category: item.category,
      quantity: Math.max(1, Math.ceil(days * item.perDay + item.extra)),
      isEssential: item.isEssential ?? false,
      notes: item.notes ?? null,
    });
  }

  for (const item of PURPOSE_ITEMS[purpose] ?? []) mergeItem(acc, toGenerated(item));

  for (const activity of activities) {
    const raw = (activity.type || activity.name).trim().toLowerCase();
    const key = ACTIVITY_ALIASES[raw] ?? raw;
    for (const item of ACTIVITY_ITEMS[key] ?? []) mergeItem(acc, toGenerated(item));
  }

  if (weather.available) {
    for (const item of WEATHER_ITEMS[weather.condition] ?? []) {
      mergeItem(acc, toGenerated(item));
    }
  }

  for (const f of forgotten) {
    const key = f.itemName.trim().toLowerCase();
    const note = forgottenNote(f.forgottenCount);
    const existing = acc.get(key);
    if (existing) {
      existing.isEssential = true;
      existing.notes = note;
    } else {
      mergeItem(acc, {
        name: f.itemName,
        category: f.category,
        quantity: 1,
        isEssential: true,
        notes: note,
      });
    }
  }

  return Array.from(acc.values());
}

// --- store -----------------------------------------------------------------

interface Store {
  user: User;
  trips: Trip[];
  forgotten: ForgottenItem[];
}

function materialize(items: Generated[], tripId: string, packedNames: string[] = []): PackingItem[] {
  const packed = new Set(packedNames.map((n) => n.toLowerCase()));
  return items.map((item) => ({
    ...item,
    id: id("item"),
    tripId,
    isPacked: packed.has(item.name.toLowerCase()),
  }));
}

function buildTrip(args: {
  name: string;
  destination: string;
  purpose: TripPurpose;
  startDate: string | null;
  endDate: string | null;
  status?: Trip["status"];
  isTemplate?: boolean;
  notes?: string | null;
  activityTypes?: { name: string; type: string }[];
  packedNames?: string[];
  forgotten?: ForgottenItem[];
}): Trip {
  const tripId = id("trip");
  const activities: TripActivity[] = (args.activityTypes ?? []).map((a) => ({
    id: id("act"),
    tripId,
    name: a.name,
    type: a.type,
  }));
  const weather = demoWeather(args.destination);
  const generated = generateItems(
    args.purpose,
    args.startDate,
    args.endDate,
    args.activityTypes ?? [],
    weather,
    args.forgotten ?? []
  );
  const packingItems = materialize(generated, tripId, args.packedNames);
  return {
    id: tripId,
    userId: "demo-user",
    name: args.name,
    destination: args.destination,
    destinationLat: null,
    destinationLon: null,
    purpose: args.purpose,
    startDate: args.startDate,
    endDate: args.endDate,
    notes: args.notes ?? null,
    isTemplate: args.isTemplate ?? false,
    templateId: null,
    status: args.status ?? "PLANNING",
    createdAt: new Date().toISOString(),
    activities,
    packingItems,
  };
}

function progressOf(trip: Trip): { packed: number; total: number } {
  const items = trip.packingItems ?? [];
  return { packed: items.filter((i) => i.isPacked).length, total: items.length };
}

function withProgress(trip: Trip): Trip {
  return { ...trip, progress: progressOf(trip) };
}

function seed(): Store {
  const forgotten: ForgottenItem[] = [
    {
      id: id("forg"),
      userId: "demo-user",
      itemName: "Sunglasses",
      category: "ACCESSORIES",
      forgottenCount: 3,
      lastForgottenDate: iso(-40),
      tripId: null,
    },
    {
      id: id("forg"),
      userId: "demo-user",
      itemName: "Phone charger",
      category: "ELECTRONICS",
      forgottenCount: 2,
      lastForgottenDate: iso(-22),
      tripId: null,
    },
    {
      id: id("forg"),
      userId: "demo-user",
      itemName: "Toothbrush",
      category: "TOILETRIES",
      forgottenCount: 1,
      lastForgottenDate: iso(-12),
      tripId: null,
    },
  ];

  const trips: Trip[] = [
    buildTrip({
      name: "Miami Beach Getaway",
      destination: "Miami, US",
      purpose: "LEISURE",
      startDate: iso(9),
      endDate: iso(13),
      activityTypes: [
        { name: "Beach", type: "beach" },
        { name: "Swimming", type: "beach" },
      ],
      packedNames: ["Phone", "Phone charger", "Wallet", "Swimsuit", "Sunscreen", "Toothbrush"],
      forgotten,
    }),
    buildTrip({
      name: "NYC Client Workshop",
      destination: "New York, US",
      purpose: "WORK",
      startDate: iso(3),
      endDate: iso(6),
      activityTypes: [
        { name: "Sightseeing", type: "sightseeing" },
        { name: "Formal dinner", type: "formal" },
      ],
      packedNames: ["Laptop", "Laptop charger", "Business attire"],
      forgotten,
    }),
    buildTrip({
      name: "Aspen Ski Weekend",
      destination: "Aspen, US",
      purpose: "ADVENTURE",
      startDate: iso(24),
      endDate: iso(27),
      activityTypes: [{ name: "Camping", type: "outdoor" }],
      forgotten,
    }),
    buildTrip({
      name: "Portland Food Tour",
      destination: "Portland, US",
      purpose: "LEISURE",
      startDate: iso(-30),
      endDate: iso(-27),
      status: "COMPLETED",
      activityTypes: [{ name: "Sightseeing", type: "sightseeing" }],
      packedNames: ["Phone", "Wallet", "Camera"],
      forgotten,
    }),
    // Templates.
    buildTrip({
      name: "Weekend Beach Getaway (template)",
      destination: "Tampa, US",
      purpose: "LEISURE",
      startDate: null,
      endDate: null,
      isTemplate: true,
      activityTypes: [{ name: "Beach", type: "beach" }],
    }),
    buildTrip({
      name: "Tech Conference (template)",
      destination: "San Francisco, US",
      purpose: "CONFERENCE",
      startDate: null,
      endDate: null,
      isTemplate: true,
      activityTypes: [{ name: "Conference", type: "conference" }],
    }),
  ];

  return {
    user: {
      id: "demo-user",
      email: "demo@packpal.app",
      name: "Demo Traveler",
      homeLatitude: 30.2672,
      homeLongitude: -97.7431,
      createdAt: iso(-90),
    },
    trips,
    forgotten,
  };
}

const store: Store = seed();

function findTrip(tripId: string): Trip {
  const trip = store.trips.find((t) => t.id === tripId);
  if (!trip) throw new Error("Trip not found.");
  return trip;
}

// --- public api (mirrors services/api.ts) ----------------------------------

export function listUsers(): Promise<User[]> {
  return delay([store.user]);
}

export function createUser(input: { email: string; name: string }): Promise<User> {
  store.user = { ...store.user, email: input.email, name: input.name };
  return delay(store.user);
}

export function updateUserHome(
  _userId: string,
  homeLatitude: number,
  homeLongitude: number
): Promise<User> {
  store.user = { ...store.user, homeLatitude, homeLongitude };
  return delay(store.user);
}

export function listTrips(): Promise<Trip[]> {
  return delay(store.trips.filter((t) => !t.isTemplate).map(withProgress));
}

export function getTrip(tripId: string): Promise<Trip> {
  return delay(withProgress(findTrip(tripId)));
}

export function createTrip(
  payload: CreateTripPayload
): Promise<{ trip: Trip; weatherAvailable: boolean }> {
  const trip = buildTrip({
    name: payload.name,
    destination: payload.destination,
    purpose: payload.purpose,
    startDate: payload.startDate ?? null,
    endDate: payload.endDate ?? null,
    notes: payload.notes ?? null,
    activityTypes: payload.activities ?? [],
    forgotten: store.forgotten,
  });
  store.trips.unshift(trip);
  return delay({ trip: withProgress(trip), weatherAvailable: true });
}

export function completeTrip(
  tripId: string
): Promise<{ trip: Trip; forgottenCandidates: PackingItem[] }> {
  const trip = findTrip(tripId);
  trip.status = "COMPLETED";
  const forgottenCandidates = (trip.packingItems ?? []).filter((i) => !i.isPacked);
  return delay({ trip: withProgress(trip), forgottenCandidates });
}

export function cloneTrip(tripId: string): Promise<Trip> {
  const source = findTrip(tripId);
  const clone = buildTrip({
    name: `${source.name} (copy)`,
    destination: source.destination,
    purpose: source.purpose,
    startDate: source.startDate,
    endDate: source.endDate,
    notes: source.notes,
    activityTypes: (source.activities ?? []).map((a) => ({ name: a.name, type: a.type })),
    forgotten: store.forgotten,
  });
  store.trips.unshift(clone);
  return delay(withProgress(clone));
}

export function deleteTrip(tripId: string): Promise<void> {
  store.trips = store.trips.filter((t) => t.id !== tripId);
  return delay(undefined);
}

export function getPackingList(tripId: string): Promise<PackingListResponse> {
  const trip = findTrip(tripId);
  return delay({
    trip: { id: trip.id, name: trip.name, destination: trip.destination },
    weather: demoWeather(trip.destination),
    progress: progressOf(trip),
    items: trip.packingItems ?? [],
  });
}

export function setItemPacked(
  tripId: string,
  itemId: string,
  isPacked: boolean
): Promise<PackingItem> {
  const trip = findTrip(tripId);
  const item = (trip.packingItems ?? []).find((i) => i.id === itemId);
  if (!item) throw new Error("Item not found.");
  item.isPacked = isPacked;
  return delay(item);
}

export function addPackingItem(
  tripId: string,
  input: { name: string; category?: ItemCategory; quantity?: number }
): Promise<PackingItem> {
  const trip = findTrip(tripId);
  const item: PackingItem = {
    id: id("item"),
    tripId,
    name: input.name,
    category: input.category ?? "OTHER",
    quantity: input.quantity ?? 1,
    isPacked: false,
    notes: null,
    isEssential: false,
  };
  trip.packingItems = [...(trip.packingItems ?? []), item];
  return delay(item);
}

export function deletePackingItem(tripId: string, itemId: string): Promise<void> {
  const trip = findTrip(tripId);
  trip.packingItems = (trip.packingItems ?? []).filter((i) => i.id !== itemId);
  return delay(undefined);
}

export function listTemplates(): Promise<TripTemplate[]> {
  return delay(
    store.trips
      .filter((t) => t.isTemplate)
      .map((t) => ({ ...withProgress(t), itemCount: (t.packingItems ?? []).length }))
  );
}

export function saveTemplate(tripId: string, name?: string): Promise<Trip> {
  const source = findTrip(tripId);
  const template = buildTrip({
    name: name ?? `${source.name} (template)`,
    destination: source.destination,
    purpose: source.purpose,
    startDate: null,
    endDate: null,
    isTemplate: true,
    activityTypes: (source.activities ?? []).map((a) => ({ name: a.name, type: a.type })),
  });
  store.trips.push(template);
  return delay(template);
}

export function useTemplate(
  templateId: string,
  overrides?: { name?: string; destination?: string; startDate?: string; endDate?: string }
): Promise<Trip> {
  const template = findTrip(templateId);
  const baseName = template.name.replace(/\s*\(template\)\s*$/i, "");
  const trip = buildTrip({
    name: overrides?.name ?? baseName,
    destination: overrides?.destination ?? template.destination,
    purpose: template.purpose,
    startDate: overrides?.startDate ?? null,
    endDate: overrides?.endDate ?? null,
    activityTypes: (template.activities ?? []).map((a) => ({ name: a.name, type: a.type })),
    forgotten: store.forgotten,
  });
  trip.templateId = template.id;
  store.trips.unshift(trip);
  return delay(trip);
}

export function deleteTemplate(templateId: string): Promise<void> {
  store.trips = store.trips.filter((t) => t.id !== templateId);
  return delay(undefined);
}

export function listForgottenItems(): Promise<ForgottenItem[]> {
  return delay([...store.forgotten].sort((a, b) => b.forgottenCount - a.forgottenCount));
}

export function reportForgottenItem(input: {
  itemName: string;
  category?: ItemCategory;
  tripId?: string;
}): Promise<ForgottenItem> {
  const key = input.itemName.trim().toLowerCase();
  const existing = store.forgotten.find((f) => f.itemName.toLowerCase() === key);
  if (existing) {
    existing.forgottenCount += 1;
    existing.lastForgottenDate = new Date().toISOString();
    if (input.tripId) existing.tripId = input.tripId;
    return delay(existing);
  }
  const created: ForgottenItem = {
    id: id("forg"),
    userId: "demo-user",
    itemName: input.itemName,
    category: input.category ?? "OTHER",
    forgottenCount: 1,
    lastForgottenDate: new Date().toISOString(),
    tripId: input.tripId ?? null,
  };
  store.forgotten.push(created);
  return delay(created);
}

export function getDepartureReminders(_hours = 24): Promise<Reminder[]> {
  const soon = store.trips
    .filter((t) => !t.isTemplate && t.status !== "COMPLETED" && t.startDate)
    .sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime());
  const next = soon[0];
  if (!next) return delay([]);
  const essentials = (next.packingItems ?? [])
    .filter((i) => i.isEssential && !i.isPacked)
    .slice(0, 3)
    .map((i) => i.name);
  const list = essentials.length > 0 ? essentials.join(", ") : "your essentials";
  return delay([
    {
      tripId: next.id,
      type: "departure",
      title: `Headed to ${next.destination}?`,
      body: `Don't forget: ${list}.`,
    },
  ]);
}
