# 🧳 PackPal

**PackPal** is a full-stack smart packing assistant. It generates tailored packing
lists for every trip, remembers the things you tend to forget, integrates weather
forecasts, supports reusable trip templates, and fires a geo-triggered reminder
when you leave home for an imminent trip.

---

## ✨ Features

- **Smart packing engine** — builds a list from trip purpose, activities, trip
  length, destination weather, and your personal forgotten-item history.
- **Weather-aware suggestions** — pulls the OpenWeatherMap forecast for the
  destination/date range and adds rain gear, layers, sunscreen, etc.
- **Forgotten-item memory** — report what you forgot after a trip; PackPal marks
  those items **essential** (⚠️) on future lists.
- **Reusable templates** — save any trip as a template and spin up a fresh trip
  from it in one tap ("Tampa Work Trip", "Weekend Beach Getaway", …).
- **Duration-based scaling** — clothing quantities scale with trip length
  (e.g. underwear = days + 1).
- **Geo-triggered departure reminders** — a geofence around your home detects
  when you leave and notifies you of unpacked essentials for trips starting soon.
- **Night-before reminders** — local notification the evening before departure
  with your packing progress.

---

## 🧱 Tech Stack

| Layer        | Technology                                              |
| ------------ | ------------------------------------------------------- |
| Mobile       | React Native (Expo), TypeScript, React Navigation       |
| Backend      | Node.js, Express, TypeScript                            |
| Database     | PostgreSQL + Prisma ORM                                 |
| Weather      | OpenWeatherMap API (optional, graceful fallback)        |
| Notifications| Expo Notifications                                      |
| Geolocation  | Expo Location (geofencing) + Expo TaskManager           |

---

## 📁 Project Structure

```
/
├── backend/                 # Express + Prisma API
│   ├── prisma/
│   │   ├── schema.prisma     # User, Trip, PackingItem, ForgottenItem, TripActivity
│   │   └── seed.ts           # Demo data seeder
│   └── src/
│       ├── index.ts          # Express entry point
│       ├── routes/           # trips, packingLists, templates, items, reminders, users
│       ├── services/         # weatherService, packingEngine, reminderService, packingListBuilder
│       ├── data/             # defaultItems.ts (curated packing dataset)
│       ├── middleware/       # auth.ts (dev header auth)
│       └── lib/              # http helpers + Zod schemas
└── mobile/                  # Expo React Native app
    ├── App.tsx               # Navigation + providers
    └── src/
        ├── screens/          # Home, CreateTrip, PackingList, Templates, TripHistory
        ├── components/       # PackingItem, TripCard, WeatherBadge, ChecklistProgress
        ├── services/         # api, locationService, notificationService
        ├── hooks/            # useTrips, useLocation
        ├── context/          # AppContext
        └── types/            # shared TypeScript types
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ running locally (or a connection string to a hosted DB)
- [Expo Go](https://expo.dev/go) on a phone, or an iOS/Android simulator

### 1. Backend

```bash
cd backend
cp .env.example .env          # then edit DATABASE_URL (and OPENWEATHER_API_KEY if you have one)
npm install
npm run prisma:generate       # generate the Prisma client
npm run prisma:push           # create the schema in your database
npm run seed                  # (optional) load demo user, trips & forgotten items
npm run dev                   # starts the API on http://localhost:4000
```

Health check: `curl http://localhost:4000/health`

### 2. Mobile

```bash
cd mobile
npm install
npx expo start                # press i (iOS), a (Android), or scan the QR with Expo Go
```

> **Talking to the backend from a device:** `localhost` points at the phone, not
> your computer. Set `expo.extra.apiBaseUrl` in `mobile/app.json` to your machine's
> LAN IP (e.g. `http://192.168.1.20:4000`) when testing on a physical device.

The app bootstraps a demo user automatically (or reuses the seeded one), so you can
start creating trips immediately.

---

## 🔑 Environment Variables (`backend/.env`)

| Variable              | Required | Description                                                                 |
| --------------------- | -------- | --------------------------------------------------------------------------- |
| `DATABASE_URL`        | ✅       | PostgreSQL connection string used by Prisma.                                |
| `PORT`                | ❌       | API port (default `4000`).                                                  |
| `OPENWEATHER_API_KEY` | ❌       | OpenWeatherMap key. If unset, packing still works — just without weather.   |
| `OPENWEATHER_BASE_URL`| ❌       | Override the OpenWeatherMap base URL (rarely needed).                       |
| `DEV_USER_HEADER`     | ❌       | Header used for dev auth (default `x-user-id`).                             |

> ⚠️ Weather is **optional**. Without an API key the packing engine skips
> weather-specific items and the app shows a "Weather unavailable" banner.

---

## 🌐 API Overview

All routes except `/api/users` and `/health` expect an `x-user-id` header
identifying the current user (a placeholder for real auth).

| Method | Endpoint                                   | Description                                  |
| ------ | ------------------------------------------ | -------------------------------------------- |
| GET    | `/health`                                  | Health check                                 |
| POST   | `/api/users`                               | Create / fetch a user by email               |
| GET    | `/api/users`                               | List users (demo convenience)                |
| PUT    | `/api/users/:id`                           | Update profile + home geofence coords        |
| POST   | `/api/trips`                               | Create a trip (optionally generate the list) |
| GET    | `/api/trips`                               | List the user's trips with packing progress  |
| GET    | `/api/trips/:id`                           | Trip details + packing list + activities     |
| PUT    | `/api/trips/:id`                           | Update a trip                                 |
| DELETE | `/api/trips/:id`                           | Delete a trip                                 |
| POST   | `/api/trips/:id/complete`                  | Mark complete, return unpacked candidates     |
| POST   | `/api/trips/:id/clone`                     | Clone a trip                                  |
| GET    | `/api/trips/:id/packing-list`              | Packing list + weather + progress            |
| POST   | `/api/trips/:id/packing-list`              | Add a custom item                            |
| PUT    | `/api/trips/:id/packing-list/:itemId`      | Toggle packed / edit item                    |
| DELETE | `/api/trips/:id/packing-list/:itemId`      | Remove an item                               |
| POST   | `/api/trips/:id/packing-list/regenerate`   | Rebuild the list                             |
| POST   | `/api/templates`                           | Save a trip as a template                    |
| GET    | `/api/templates`                           | List templates                              |
| POST   | `/api/templates/:id/use`                   | Create a new trip from a template            |
| DELETE | `/api/templates/:id`                       | Delete a template                            |
| POST   | `/api/forgotten-items`                     | Report a forgotten item                      |
| GET    | `/api/forgotten-items`                     | List frequently forgotten items             |
| GET    | `/api/reminders/departures?hours=24`       | Departure reminders for imminent trips       |

---

## 🧠 How the Packing Engine Works

The engine (`backend/src/services/packingEngine.ts`) composes a list in layers,
de-duplicating by item name (later layers can upgrade quantity / essential flag):

1. **Template carryover** — start from a template's items if the trip was cloned.
2. **Base essentials** — phone, wallet, ID, medications, toiletries…
3. **Duration scaling** — clothing quantities computed from trip length.
4. **Purpose items** — Work → laptop & business clothes, Conference → badge &
   business cards, Adventure → gear, etc.
5. **Activity items** — Beach → swimsuit, sunscreen, towel; Hiking → boots, water.
6. **Weather items** — hot/cold/rainy adjustments from the forecast.
7. **Forgotten-item boosters** — items you've forgotten before are added and
   flagged **essential** with a reminder note.

---

## 📱 App Screens

- **Home** — upcoming trips with packing progress, quick actions, departure alerts.
- **Create Trip** — destination, purpose, dates, activity chips, "Generate Packing
  List", and an option to save as a template.
- **Packing List** — weather banner, progress bar, items grouped by category, add
  custom items, schedule reminders, mark complete.
- **Templates** — saved templates; tap to start a new trip, long-press to delete.
- **Trip History** — completed trips; flag the items you actually forgot to teach
  PackPal for next time.

---

## 🖼️ Screenshots / Mockups

> _Placeholder — add screenshots or simulator recordings here._

| Home | Packing List | Templates |
| ---- | ------------ | --------- |
| _TODO_ | _TODO_     | _TODO_    |

---

## 🛠️ Useful Scripts

**Backend**

| Command                    | Description                          |
| -------------------------- | ------------------------------------ |
| `npm run dev`              | Start the API with hot reload        |
| `npm run build`            | Generate Prisma client + compile TS  |
| `npm run typecheck`        | Type-check without emitting          |
| `npm run prisma:push`      | Push the schema to the database      |
| `npm run seed`             | Seed demo data                       |

**Mobile**

| Command             | Description                  |
| ------------------- | ---------------------------- |
| `npx expo start`    | Start the Expo dev server    |
| `npm run typecheck` | Type-check the app           |

---

## 📄 License

MIT
