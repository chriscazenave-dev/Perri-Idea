import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useTrips } from "../hooks/useTrips";
import {
  getTrip,
  listForgottenItems,
  reportForgottenItem,
} from "../services/api";
import { CATEGORY_META } from "../constants";
import type { ForgottenItem, PackingItem, Trip } from "../types";
import { colors, radius, shadow, spacing } from "../theme";

export function TripHistoryScreen() {
  const { past, refreshTrips } = useTrips();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [itemsByTrip, setItemsByTrip] = useState<Record<string, PackingItem[]>>({});
  const [loadingTrip, setLoadingTrip] = useState<string | null>(null);
  const [reported, setReported] = useState<Set<string>>(new Set());
  const [forgotten, setForgotten] = useState<ForgottenItem[]>([]);

  const loadForgotten = useCallback(async () => {
    try {
      setForgotten(await listForgottenItems());
    } catch {
      setForgotten([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshTrips();
      loadForgotten();
    }, [refreshTrips, loadForgotten])
  );

  const toggleExpand = useCallback(
    async (trip: Trip) => {
      if (expandedId === trip.id) {
        setExpandedId(null);
        return;
      }
      setExpandedId(trip.id);
      if (!itemsByTrip[trip.id]) {
        setLoadingTrip(trip.id);
        try {
          const full = await getTrip(trip.id);
          setItemsByTrip((prev) => ({
            ...prev,
            [trip.id]: full.packingItems ?? [],
          }));
        } catch {
          setItemsByTrip((prev) => ({ ...prev, [trip.id]: [] }));
        } finally {
          setLoadingTrip(null);
        }
      }
    },
    [expandedId, itemsByTrip]
  );

  const onReport = useCallback(
    async (trip: Trip, item: PackingItem) => {
      const key = `${trip.id}:${item.id}`;
      setReported((prev) => new Set(prev).add(key));
      try {
        await reportForgottenItem({
          itemName: item.name,
          category: item.category,
          tripId: trip.id,
        });
        await loadForgotten();
      } catch (e) {
        setReported((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        Alert.alert("Could not report item", toMessage(e));
      }
    },
    [loadForgotten]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FlatList
        data={past}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Trip History</Text>
            <Text style={styles.subtitle}>
              Report what you forgot — PackPal flags it on future trips.
            </Text>

            {forgotten.length > 0 && (
              <View style={styles.forgottenCard}>
                <Text style={styles.forgottenTitle}>⚠️ Frequently forgotten</Text>
                <View style={styles.forgottenChips}>
                  {forgotten.map((f) => (
                    <View key={f.id} style={styles.forgottenChip}>
                      <Text style={styles.forgottenChipText}>
                        {f.itemName} ×{f.forgottenCount}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        }
        renderItem={({ item: trip }) => {
          const expanded = expandedId === trip.id;
          const tripItems = itemsByTrip[trip.id] ?? [];
          return (
            <View style={styles.card}>
              <Pressable style={styles.cardHeader} onPress={() => toggleExpand(trip)}>
                <View style={styles.cardBody}>
                  <Text style={styles.name}>{trip.name}</Text>
                  <Text style={styles.meta}>📍 {trip.destination}</Text>
                </View>
                <Text style={styles.chevron}>{expanded ? "▾" : "▸"}</Text>
              </Pressable>

              {expanded && (
                <View style={styles.expanded}>
                  {loadingTrip === trip.id ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : tripItems.length === 0 ? (
                    <Text style={styles.meta}>No items on this trip.</Text>
                  ) : (
                    <>
                      <Text style={styles.reportHint}>
                        Tap an item you actually forgot:
                      </Text>
                      {tripItems.map((item) => {
                        const key = `${trip.id}:${item.id}`;
                        const isReported = reported.has(key);
                        return (
                          <Pressable
                            key={item.id}
                            style={[styles.itemRow, isReported && styles.itemReported]}
                            onPress={() => !isReported && onReport(trip, item)}
                            disabled={isReported}
                          >
                            <Text style={styles.itemEmoji}>
                              {CATEGORY_META[item.category].emoji}
                            </Text>
                            <Text style={styles.itemName}>{item.name}</Text>
                            <Text style={styles.itemAction}>
                              {isReported ? "Reported ✓" : "I forgot this"}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </>
                  )}
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={styles.emptyText}>
              No completed trips yet. Mark a trip complete to see it here.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function toMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return "Please try again.";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg },
  forgottenCard: {
    backgroundColor: "#FEF3C7",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  forgottenTitle: { fontWeight: "700", color: "#92400E", marginBottom: spacing.sm },
  forgottenChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  forgottenChip: {
    backgroundColor: "#FDE68A",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  forgottenChipText: { color: "#92400E", fontWeight: "600", fontSize: 13 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow,
  },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  cardBody: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700", color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  chevron: { fontSize: 18, color: colors.textMuted },
  expanded: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reportHint: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  itemReported: { opacity: 0.5 },
  itemEmoji: { fontSize: 16 },
  itemName: { flex: 1, fontSize: 15, color: colors.text },
  itemAction: { fontSize: 13, color: colors.danger, fontWeight: "700" },
  empty: { alignItems: "center", padding: spacing.xl },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { color: colors.textMuted, textAlign: "center", fontSize: 15 },
});
