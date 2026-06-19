import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useApp } from "../context/AppContext";
import { saveTemplate } from "../services/api";
import { ACTIVITY_CHIPS, PURPOSE_OPTIONS } from "../constants";
import type { RootStackParamList, TripPurpose } from "../types";
import { colors, radius, spacing } from "../theme";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function CreateTripScreen() {
  const navigation = useNavigation<Nav>();
  const { createTrip } = useApp();

  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [purpose, setPurpose] = useState<TripPurpose>("LEISURE");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [picker, setPicker] = useState<"start" | "end" | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [notes, setNotes] = useState("");
  const [asTemplate, setAsTemplate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => name.trim().length > 0 && destination.trim().length > 0 && !submitting,
    [name, destination, submitting]
  );

  const toggleActivity = useCallback((index: number) => {
    setSelected((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  }, []);

  const onChangeDate = useCallback(
    (event: { type: string }, date?: Date) => {
      const which = picker;
      if (Platform.OS !== "ios") setPicker(null);
      if (event.type === "dismissed" || !date) return;
      if (which === "start") setStartDate(date);
      else if (which === "end") setEndDate(date);
    },
    [picker]
  );

  const onSubmit = useCallback(async () => {
    if (!canSubmit) return;
    if (startDate && endDate && endDate < startDate) {
      Alert.alert("Invalid dates", "End date must be after the start date.");
      return;
    }
    setSubmitting(true);
    try {
      const activities = selected.map((i) => ({
        name: ACTIVITY_CHIPS[i].label,
        type: ACTIVITY_CHIPS[i].type,
      }));
      const { trip } = await createTrip({
        name: name.trim(),
        destination: destination.trim(),
        purpose,
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
        notes: notes.trim() || undefined,
        activities,
        generatePackingList: true,
      });
      if (asTemplate) {
        await saveTemplate(trip.id, `${trip.name} (template)`);
      }
      navigation.replace("PackingList", { tripId: trip.id, tripName: trip.name });
    } catch (e) {
      Alert.alert("Could not create trip", toMessage(e));
    } finally {
      setSubmitting(false);
    }
  }, [
    canSubmit,
    startDate,
    endDate,
    selected,
    createTrip,
    name,
    destination,
    purpose,
    notes,
    asTemplate,
    navigation,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="Trip name">
          <TextInput
            style={styles.input}
            placeholder="e.g. Miami Beach Getaway"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
        </Field>

        <Field label="Destination">
          <TextInput
            style={styles.input}
            placeholder="City, Country (e.g. Miami, US)"
            placeholderTextColor={colors.textMuted}
            value={destination}
            onChangeText={setDestination}
          />
        </Field>

        <Field label="Purpose">
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={purpose}
              onValueChange={(v) => setPurpose(v as TripPurpose)}
            >
              {PURPOSE_OPTIONS.map((opt) => (
                <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
              ))}
            </Picker>
          </View>
        </Field>

        <View style={styles.dateRow}>
          <Field label="Start date" style={styles.dateField}>
            <Pressable style={styles.input} onPress={() => setPicker("start")}>
              <Text style={startDate ? styles.dateText : styles.datePlaceholder}>
                {startDate ? startDate.toLocaleDateString() : "Select"}
              </Text>
            </Pressable>
          </Field>
          <Field label="End date" style={styles.dateField}>
            <Pressable style={styles.input} onPress={() => setPicker("end")}>
              <Text style={endDate ? styles.dateText : styles.datePlaceholder}>
                {endDate ? endDate.toLocaleDateString() : "Select"}
              </Text>
            </Pressable>
          </Field>
        </View>

        {picker && (
          <DateTimePicker
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            value={
              (picker === "start" ? startDate : endDate) ?? new Date()
            }
            onChange={onChangeDate}
          />
        )}

        <Field label="Activities">
          <View style={styles.chips}>
            {ACTIVITY_CHIPS.map((chip, index) => {
              const active = selected.includes(index);
              return (
                <Pressable
                  key={`${chip.label}-${index}`}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleActivity(index)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Field label="Notes (optional)">
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Anything else to remember…"
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </Field>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Also save as reusable template</Text>
          <Switch
            value={asTemplate}
            onValueChange={setAsTemplate}
            trackColor={{ true: colors.primary }}
          />
        </View>

        <Pressable
          style={[styles.submit, !canSubmit && styles.submitDisabled]}
          onPress={onSubmit}
          disabled={!canSubmit}
        >
          {submitting ? (
            <ActivityIndicator color={colors.textMuted} />
          ) : (
            <Text style={[styles.submitText, !canSubmit && styles.submitTextDisabled]}>
              Generate Packing List
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function toMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return "Please try again.";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  field: { marginBottom: spacing.lg },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
    justifyContent: "center",
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  pickerWrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  dateRow: { flexDirection: "row", gap: spacing.md },
  dateField: { flex: 1 },
  dateText: { fontSize: 15, color: colors.text },
  datePlaceholder: { fontSize: 15, color: colors.textMuted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: "600", fontSize: 14 },
  chipTextActive: { color: colors.textInverse },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  switchLabel: { fontSize: 15, color: colors.text, fontWeight: "600", flex: 1 },
  submit: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  submitDisabled: { backgroundColor: colors.border },
  submitText: { color: colors.textInverse, fontWeight: "800", fontSize: 16 },
  submitTextDisabled: { color: colors.textMuted },
});
