import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PackingItem } from "../components/PackingItem";
import { WeatherBadge } from "../components/WeatherBadge";
import { ChecklistProgress } from "../components/ChecklistProgress";
import {
  addPackingItem,
  completeTrip,
  deletePackingItem,
  getPackingList,
  getTrip,
  setItemPacked,
} from "../services/api";
import { scheduleNightBeforeReminder } from "../services/notificationService";
import { CATEGORY_META, CATEGORY_ORDER } from "../constants";
import type {
  ItemCategory,
  PackingItem as PackingItemType,
  PackingListResponse,
  RootStackParamList,
} from "../types";
import { colors, radius, spacing } from "../theme";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, "PackingList">;

interface Section {
  title: string;
  category: ItemCategory;
  data: PackingItemType[];
}

export function PackingListScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { tripId } = route.params;

  const [data, setData] = useState<PackingListResponse | null>(null);
  const [items, setItems] = useState<PackingItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItem, setNewItem] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await getPackingList(tripId);
      setData(res);
      setItems(res.items);
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    load();
  }, [load]);

  const progress = useMemo(() => {
    const packed = items.filter((i) => i.isPacked).length;
    return { packed, total: items.length };
  }, [items]);

  const sections = useMemo<Section[]>(() => {
    const byCat = new Map<ItemCategory, PackingItemType[]>();
    for (const item of items) {
      const list = byCat.get(item.category) ?? [];
      list.push(item);
      byCat.set(item.category, list);
    }
    return CATEGORY_ORDER.filter((c) => byCat.has(c)).map((c) => ({
      title: CATEGORY_META[c].label,
      category: c,
      data: (byCat.get(c) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [items]);

  const onToggle = useCallback(
    async (item: PackingItemType) => {
      const next = !item.isPacked;
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isPacked: next } : i))
      );
      try {
        await setItemPacked(tripId, item.id, next);
      } catch (e) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, isPacked: !next } : i))
        );
        Alert.alert("Could not update item", toMessage(e));
      }
    },
    [tripId]
  );

  const onAdd = useCallback(async () => {
    const name = newItem.trim();
    if (!name) return;
    setNewItem("");
    try {
      const created = await addPackingItem(tripId, { name });
      setItems((prev) => [...prev, created]);
    } catch (e) {
      Alert.alert("Could not add item", toMessage(e));
    }
  }, [newItem, tripId]);

  const onRemove = useCallback(
    (item: PackingItemType) => {
      Alert.alert("Remove item", `Remove "${item.name}" from this list?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setItems((prev) => prev.filter((i) => i.id !== item.id));
            try {
              await deletePackingItem(tripId, item.id);
            } catch (e) {
              Alert.alert("Could not remove item", toMessage(e));
              load();
            }
          },
        },
      ]);
    },
    [tripId, load]
  );

  const onScheduleReminder = useCallback(async () => {
    try {
      const trip = await getTrip(tripId);
      const id = await scheduleNightBeforeReminder(trip, progress);
      Alert.alert(
        id ? "Reminder scheduled" : "No reminder set",
        id
          ? "We'll remind you the night before your trip."
          : "Add a future start date to schedule a night-before reminder."
      );
    } catch (e) {
      Alert.alert("Could not schedule reminder", toMessage(e));
    }
  }, [tripId, progress]);

  const onComplete = useCallback(() => {
    Alert.alert(
      "Mark trip complete?",
      "You'll be able to report any items you forgot from the Trip History tab.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          onPress: async () => {
            try {
              await completeTrip(tripId);
              navigation.navigate("Tabs", { screen: "History" });
            } catch (e) {
              Alert.alert("Could not complete trip", toMessage(e));
            }
          },
        },
      ]
    );
  }, [tripId, navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={["bottom"]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered} edges={["bottom"]}>
        <Text style={styles.error}>{error}</Text>
        <Pressable style={styles.retry} onPress={load}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={styles.header}>
            {data && <WeatherBadge weather={data.weather} />}
            <View style={styles.progressCard}>
              <ChecklistProgress packed={progress.packed} total={progress.total} />
            </View>
            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                placeholder="Add a custom item…"
                placeholderTextColor={colors.textMuted}
                value={newItem}
                onChangeText={setNewItem}
                onSubmitEditing={onAdd}
                returnKeyType="done"
              />
              <Pressable style={styles.addBtn} onPress={onAdd}>
                <Text style={styles.addBtnText}>Add</Text>
              </Pressable>
            </View>
            <Text style={styles.hint}>Tap to pack · long-press to remove</Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>
            {CATEGORY_META[section.category].emoji} {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <View style={styles.itemWrap}>
            <PackingItem item={item} onToggle={onToggle} onLongPress={onRemove} />
          </View>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <Pressable style={styles.secondaryBtn} onPress={onScheduleReminder}>
              <Text style={styles.secondaryBtnText}>🔔 Schedule night-before reminder</Text>
            </Pressable>
            <Pressable style={styles.completeBtn} onPress={onComplete}>
              <Text style={styles.completeBtnText}>✓ Mark trip complete</Text>
            </Pressable>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function toMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return "Is the backend running?";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { marginBottom: spacing.md },
  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  addRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  addInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: { color: colors.textInverse, fontWeight: "700" },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  itemWrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  footer: { marginTop: spacing.xl, gap: spacing.md },
  secondaryBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: { color: colors.primaryDark, fontWeight: "700" },
  completeBtn: {
    backgroundColor: colors.success,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  completeBtnText: { color: colors.textInverse, fontWeight: "800" },
  error: { color: colors.danger, textAlign: "center", marginBottom: spacing.md },
  retry: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  retryText: { color: colors.textInverse, fontWeight: "700" },
});
