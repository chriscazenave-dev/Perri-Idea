import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTrips } from "../hooks/useTrips";
import { useLocation } from "../hooks/useLocation";
import { TripCard } from "../components/TripCard";
import { getDepartureReminders } from "../services/api";
import type { Reminder, RootStackParamList, Trip } from "../types";
import { colors, radius, shadow, spacing } from "../theme";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { upcoming, loading, refreshTrips } = useTrips();
  const { checkDeparture, hasHome } = useLocation();
  const [refreshing, setRefreshing] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const load = useCallback(async () => {
    await refreshTrips();
    try {
      setReminders(await getDepartureReminders(24));
    } catch {
      setReminders([]);
    }
  }, [refreshTrips]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onCheckDeparture = useCallback(async () => {
    const left = await checkDeparture();
    Alert.alert(
      left ? "You've left home!" : "Still home",
      left
        ? "Sent a departure reminder for your upcoming trip."
        : "You're within your home area. No departure reminder needed."
    );
  }, [checkDeparture]);

  const openTrip = useCallback(
    (trip: Trip) =>
      navigation.navigate("PackingList", {
        tripId: trip.id,
        tripName: trip.name,
      }),
    [navigation]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FlatList
        data={upcoming}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>PackPal</Text>
            <Text style={styles.subtitle}>Smart packing, never forget a thing.</Text>

            {reminders.map((r) => (
              <View key={r.tripId} style={styles.reminder}>
                <Text style={styles.reminderTitle}>🔔 {r.title}</Text>
                <Text style={styles.reminderBody}>{r.body}</Text>
              </View>
            ))}

            <View style={styles.actions}>
              <Pressable
                style={[styles.action, styles.actionPrimary]}
                onPress={() => navigation.navigate("CreateTrip")}
              >
                <Text style={styles.actionPrimaryText}>＋ New Trip</Text>
              </Pressable>
              <Pressable
                style={[styles.action, styles.actionSecondary]}
                onPress={() => navigation.navigate("Tabs", { screen: "Templates" })}
              >
                <Text style={styles.actionSecondaryText}>📋 From Template</Text>
              </Pressable>
            </View>

            {hasHome && (
              <Pressable style={styles.depart} onPress={onCheckDeparture}>
                <Text style={styles.departText}>
                  🚗 Simulate leaving home (departure check)
                </Text>
              </Pressable>
            )}

            <Text style={styles.sectionHeader}>Upcoming trips</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TripCard trip={item} onPress={() => openTrip(item)} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🧳</Text>
            <Text style={styles.emptyText}>
              No upcoming trips yet. Tap “New Trip” to start packing!
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: 32, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 15, color: colors.textMuted, marginBottom: spacing.lg },
  reminder: {
    backgroundColor: "#FEF3C7",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  reminderTitle: { fontWeight: "700", color: "#92400E", fontSize: 15 },
  reminderBody: { color: "#92400E", marginTop: 2, fontSize: 13 },
  actions: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  action: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    ...shadow,
  },
  actionPrimary: { backgroundColor: colors.primary },
  actionPrimaryText: { color: colors.textInverse, fontWeight: "700", fontSize: 15 },
  actionSecondary: { backgroundColor: colors.surface },
  actionSecondaryText: { color: colors.primaryDark, fontWeight: "700", fontSize: 15 },
  depart: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  departText: { color: colors.textMuted, fontWeight: "600", fontSize: 13 },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginVertical: spacing.md,
  },
  empty: { alignItems: "center", padding: spacing.xl },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { color: colors.textMuted, textAlign: "center", fontSize: 15 },
});
