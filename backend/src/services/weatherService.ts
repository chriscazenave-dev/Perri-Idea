import axios from "axios";
import type { WeatherCondition } from "../data/defaultItems";

/**
 * Weather integration (OpenWeatherMap). Designed to degrade gracefully: when no
 * API key is configured, or a request fails, callers receive a summary with
 * `available: false` and the packing engine simply skips weather suggestions.
 */

export interface WeatherSummary {
  available: boolean;
  condition: WeatherCondition;
  avgTempC: number | null;
  minTempC: number | null;
  maxTempC: number | null;
  /** Probability of precipitation across the forecast window, 0..1. */
  rainProbability: number | null;
  description: string;
  source: "openweather" | "unavailable";
}

export interface WeatherQuery {
  city?: string;
  lat?: number;
  lon?: number;
  startDate?: Date | null;
  endDate?: Date | null;
}

const BASE_URL =
  process.env.OPENWEATHER_BASE_URL || "https://api.openweathermap.org";

const UNAVAILABLE: WeatherSummary = {
  available: false,
  condition: "mild",
  avgTempC: null,
  minTempC: null,
  maxTempC: null,
  rainProbability: null,
  description: "Weather data unavailable",
  source: "unavailable",
};

interface ForecastEntry {
  dt: number;
  main: { temp: number };
  weather: { main: string; description: string }[];
  pop?: number;
}

export function deriveCondition(
  avgTempC: number | null,
  rainProbability: number | null
): WeatherCondition {
  if (rainProbability !== null && rainProbability >= 0.4) return "rainy";
  if (avgTempC === null) return "mild";
  if (avgTempC >= 24) return "hot";
  if (avgTempC <= 10) return "cold";
  return "mild";
}

async function geocodeCity(
  apiKey: string,
  city: string
): Promise<{ lat: number; lon: number } | null> {
  const url = `${BASE_URL}/geo/1.0/direct`;
  const { data } = await axios.get(url, {
    params: { q: city, limit: 1, appid: apiKey },
    timeout: 8000,
  });
  if (Array.isArray(data) && data.length > 0) {
    return { lat: data[0].lat, lon: data[0].lon };
  }
  return null;
}

/**
 * Returns a structured weather summary for a destination + date range. The free
 * OpenWeatherMap forecast endpoint covers ~5 days in 3-hour steps; we filter to
 * the trip window when possible and otherwise summarize the whole forecast.
 */
export async function getWeatherSummary(
  query: WeatherQuery
): Promise<WeatherSummary> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return UNAVAILABLE;

  try {
    let { lat, lon } = query;
    if ((lat === undefined || lon === undefined) && query.city) {
      const geo = await geocodeCity(apiKey, query.city);
      if (!geo) return { ...UNAVAILABLE, description: "Destination not found" };
      lat = geo.lat;
      lon = geo.lon;
    }
    if (lat === undefined || lon === undefined) return UNAVAILABLE;

    const { data } = await axios.get(`${BASE_URL}/data/2.5/forecast`, {
      params: { lat, lon, appid: apiKey, units: "metric" },
      timeout: 8000,
    });

    const entries: ForecastEntry[] = Array.isArray(data?.list) ? data.list : [];
    if (entries.length === 0) return UNAVAILABLE;

    const startMs = query.startDate ? query.startDate.getTime() : null;
    const endMs = query.endDate ? query.endDate.getTime() : null;

    let windowed = entries;
    if (startMs !== null && endMs !== null) {
      const inWindow = entries.filter((e) => {
        const t = e.dt * 1000;
        return t >= startMs && t <= endMs;
      });
      if (inWindow.length > 0) windowed = inWindow;
    }

    const temps = windowed.map((e) => e.main.temp);
    const avgTempC = round(temps.reduce((a, b) => a + b, 0) / temps.length);
    const minTempC = round(Math.min(...temps));
    const maxTempC = round(Math.max(...temps));
    const rainProbability = round(
      Math.max(...windowed.map((e) => e.pop ?? 0)),
      2
    );

    const condition = deriveCondition(avgTempC, rainProbability);
    const dominant = mostCommonDescription(windowed);

    return {
      available: true,
      condition,
      avgTempC,
      minTempC,
      maxTempC,
      rainProbability,
      description: dominant,
      source: "openweather",
    };
  } catch {
    return UNAVAILABLE;
  }
}

function mostCommonDescription(entries: ForecastEntry[]): string {
  const counts = new Map<string, number>();
  for (const e of entries) {
    const desc = e.weather?.[0]?.description;
    if (desc) counts.set(desc, (counts.get(desc) ?? 0) + 1);
  }
  let best = "";
  let bestCount = -1;
  for (const [desc, count] of counts) {
    if (count > bestCount) {
      best = desc;
      bestCount = count;
    }
  }
  return best || "Mixed conditions";
}

function round(n: number, decimals = 1): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}
