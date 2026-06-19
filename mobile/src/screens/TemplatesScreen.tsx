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
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  deleteTemplate,
  listTemplates,
  useTemplate as apiUseTemplate,
} from "../services/api";
import { useApp } from "../context/AppContext";
import { PURPOSE_OPTIONS } from "../constants";
import type { RootStackParamList, TripTemplate } from "../types";
import { colors, radius, shadow, spacing } from "../theme";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TemplatesScreen() {
  const navigation = useNavigation<Nav>();
  const { refreshTrips } = useApp();
  const [templates, setTemplates] = useState<TripTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingId, setUsingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setTemplates(await listTemplates());
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onUse = useCallback(
    async (template: TripTemplate) => {
      setUsingId(template.id);
      try {
        const trip = await apiUseTemplate(template.id);
        await refreshTrips();
        navigation.navigate("PackingList", {
          tripId: trip.id,
          tripName: trip.name,
        });
      } catch (e) {
        Alert.alert("Could not use template", toMessage(e));
      } finally {
        setUsingId(null);
      }
    },
    [navigation, refreshTrips]
  );

  const onDelete = useCallback(
    (template: TripTemplate) => {
      Alert.alert("Delete template", `Delete "${template.name}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setTemplates((prev) => prev.filter((t) => t.id !== template.id));
            try {
              await deleteTemplate(template.id);
            } catch (e) {
              Alert.alert("Could not delete template", toMessage(e));
              load();
            }
          },
        },
      ]);
    },
    [load]
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
        data={templates}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Templates</Text>
            <Text style={styles.subtitle}>
              Reusable packing lists for trips you take often.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const purpose =
            PURPOSE_OPTIONS.find((p) => p.value === item.purpose)?.label ??
            item.purpose;
          return (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              onPress={() => onUse(item)}
              onLongPress={() => onDelete(item)}
            >
              <View style={styles.cardBody}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {purpose} · {item.itemCount} items
                </Text>
              </View>
              {usingId === item.id ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.use}>Use →</Text>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyText}>
              No templates yet. Save a trip as a template from the Create Trip
              screen.
            </Text>
          </View>
        }
        ListFooterComponent={
          templates.length > 0 ? (
            <Text style={styles.hint}>Tap to use · long-press to delete</Text>
          ) : null
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow,
  },
  pressed: { opacity: 0.85 },
  cardBody: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700", color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  use: { color: colors.primary, fontWeight: "800", fontSize: 15 },
  empty: { alignItems: "center", padding: spacing.xl },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { color: colors.textMuted, textAlign: "center", fontSize: 15 },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
