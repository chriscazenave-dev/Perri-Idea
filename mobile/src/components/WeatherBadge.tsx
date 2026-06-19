import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { WeatherSummary } from "../types";
import { WEATHER_META } from "../constants";
import { colors, radius, spacing } from "../theme";

interface Props {
  weather: WeatherSummary;
}

/** Banner summarizing the destination forecast (or a graceful fallback). */
export function WeatherBadge({ weather }: Props) {
  if (!weather.available) {
    return (
      <View style={[styles.container, styles.unavailable]}>
        <Text style={styles.emoji}>🌍</Text>
        <View style={styles.body}>
          <Text style={styles.title}>Weather unavailable</Text>
          <Text style={styles.subtitle}>
            Packing list generated without weather adjustments.
          </Text>
        </View>
      </View>
    );
  }

  const meta = WEATHER_META[weather.condition];
  const temp =
    weather.avgTempC != null ? `${Math.round(weather.avgTempC)}°C avg` : "";
  const rain =
    weather.rainProbability != null
      ? `${Math.round(weather.rainProbability * 100)}% rain`
      : "";

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{meta.emoji}</Text>
      <View style={styles.body}>
        <Text style={styles.title}>
          {meta.label} · {weather.description}
        </Text>
        <Text style={styles.subtitle}>
          {[temp, rain].filter(Boolean).join("  ·  ")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  unavailable: { backgroundColor: colors.border },
  emoji: { fontSize: 28 },
  body: { flex: 1 },
  title: { fontSize: 15, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});
