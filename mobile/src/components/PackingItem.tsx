import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { PackingItem as PackingItemType } from "../types";
import { colors, radius, spacing } from "../theme";

interface Props {
  item: PackingItemType;
  onToggle: (item: PackingItemType) => void;
  onLongPress?: (item: PackingItemType) => void;
}

/** A single packing checklist row with checkbox, quantity, and essential badge. */
export function PackingItem({ item, onToggle, onLongPress }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={() => onToggle(item)}
      onLongPress={onLongPress ? () => onLongPress(item) : undefined}
    >
      <View style={[styles.checkbox, item.isPacked && styles.checkboxChecked]}>
        {item.isPacked && <Text style={styles.check}>✓</Text>}
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.name, item.isPacked && styles.namePacked]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {item.quantity > 1 && (
            <Text style={styles.qty}>×{item.quantity}</Text>
          )}
          {item.isEssential && <Text style={styles.essential}>⚠️</Text>}
        </View>
        {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: spacing.md,
  },
  pressed: { opacity: 0.6 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  check: { color: colors.textInverse, fontSize: 15, fontWeight: "800" },
  body: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { fontSize: 15, color: colors.text, fontWeight: "500" },
  namePacked: {
    textDecorationLine: "line-through",
    color: colors.textMuted,
  },
  qty: { fontSize: 13, color: colors.textMuted, fontWeight: "700" },
  essential: { fontSize: 14 },
  notes: { fontSize: 12, color: colors.accent, marginTop: 2 },
});
