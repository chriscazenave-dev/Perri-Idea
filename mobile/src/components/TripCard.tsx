import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Trip } from "../types";
import { PURPOSE_OPTIONS } from "../constants";
import { colors, radius, shadow, spacing } from "../theme";
import { ChecklistProgress } from "./ChecklistProgress";

interface Props {
  trip: Trip;
  onPress?: () => void;
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return "Dates not set";
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const s = new Date(start).toLocaleDateString(undefined, opts);
  if (!end) return s;
  const e = new Date(end).toLocaleDateString(undefined, opts);
  return `${s} – ${e}`;
}

const STATUS_COLORS: Record<Trip["status"], string> = {
  PLANNING: colors.accent,
  ACTIVE: colors.primary,
  COMPLETED: colors.success,
};

export function TripCard({ trip, onPress }: Props) {
  const purpose =
    PURPOSE_OPTIONS.find((p) => p.value === trip.purpose)?.label ?? trip.purpose;
  const progress = trip.progress;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.headerRow}>
        <Text style={styles.name} numberOfLines={1}>
          {trip.name}
        </Text>
        <View
          style={[styles.statusDot, { backgroundColor: STATUS_COLORS[trip.status] }]}
        />
      </View>
      <Text style={styles.destination}>📍 {trip.destination}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{formatDateRange(trip.startDate, trip.endDate)}</Text>
        <Text style={styles.badge}>{purpose}</Text>
      </View>
      {progress && progress.total > 0 && (
        <View style={styles.progress}>
          <ChecklistProgress packed={progress.packed} total={progress.total} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow,
  },
  pressed: { opacity: 0.85 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: { fontSize: 17, fontWeight: "700", color: colors.text, flex: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginLeft: spacing.sm },
  destination: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  meta: { fontSize: 13, color: colors.textMuted },
  badge: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  progress: { marginTop: spacing.md },
});
