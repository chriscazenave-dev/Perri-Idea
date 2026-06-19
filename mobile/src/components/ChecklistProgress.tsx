import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../theme";

interface Props {
  packed: number;
  total: number;
  showLabel?: boolean;
}

/** A horizontal progress bar showing packed / total items. */
export function ChecklistProgress({ packed, total, showLabel = true }: Props) {
  const ratio = total > 0 ? packed / total : 0;
  const pct = Math.round(ratio * 100);
  const complete = total > 0 && packed === total;

  return (
    <View style={styles.container}>
      {showLabel && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            {packed}/{total} packed
          </Text>
          <Text style={[styles.pct, complete && styles.pctComplete]}>{pct}%</Text>
        </View>
      )}
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${pct}%` },
            complete && styles.fillComplete,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%" },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  pct: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  pctComplete: { color: colors.success },
  track: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  fillComplete: { backgroundColor: colors.success },
});
