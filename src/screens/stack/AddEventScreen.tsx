import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useAppTheme } from '../../ui/theme/ThemeProvider';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOW, PALETTE, EVENT_COLORS } from '../../ui/theme/tokens';
import CalendarService from '../../services/CalendarService';
import { getUserId } from '../../services/IdentityService';

type RouteType = RouteProp<RootStackParamList, 'AddEvent'>;

const MOCK_USERS = [
  { id: 'u1', name: 'Jordan' },
  { id: 'u2', name: 'Sam' },
];

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function isValidTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hh, mm] = value.split(':').map(Number);
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

export default function AddEventScreen(): JSX.Element {
  const { theme } = useAppTheme();
  const { top, bottom } = useSafeAreaInsets();
  const nav = useNavigation<StackNavigationProp<RootStackParamList, 'AddEvent'>>();
  const { params } = useRoute<RouteType>();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(params?.selectedDate ?? new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('09:00');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [color, setColor] = useState(EVENT_COLORS[0]);
  const [sharedWith, setSharedWith] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleShare = (id: string) =>
    setSharedWith((prev) => prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]);

  const handleSave = async () => {
    if (!title.trim()) { setError('Please enter a title.'); return; }

    // Validate date: format YYYY-MM-DD and must be a real calendar date
    if (!isValidDate(date)) { setError('Date must be a valid date (YYYY-MM-DD).'); return; }

    // Validate time: format HH:MM with valid range
    if (!isValidTime(time)) { setError('Start time must be a valid time (HH:MM).'); return; }

    // Validate optional end time only if provided
    if (endTime.trim() && !isValidTime(endTime.trim())) {
      setError('End time must be a valid time (HH:MM).');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await CalendarService.addEvent({
        title: title.trim(),
        date,
        time,
        endTime: endTime.trim() || undefined,
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        color,
        createdBy: getUserId(),
        sharedWith,
      });
      nav.goBack();
    } catch (e: any) {
      setError('Failed to save event. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.bg.default }]}
      behavior="padding"
    >
      {/* Header bar */}
      <View style={[styles.header, { paddingTop: top + SPACING.md, borderBottomColor: theme.border.default }]}>
        <TouchableOpacity
          onPress={() => nav.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Discard and close"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>New Event</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: saving ? 0.6 : 1 }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color={PALETTE.white} />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: bottom + SPACING.xxxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: `${theme.danger}18`, borderColor: theme.danger }]}>
            <Text style={[styles.errorText, { color: theme.text.danger }]}>{error}</Text>
          </View>
        ) : null}

        {/* Title */}
        <TextInput
          style={[styles.titleInput, { color: theme.text.primary, borderBottomColor: theme.border.default }]}
          value={title}
          onChangeText={setTitle}
          placeholder="Event title"
          placeholderTextColor={theme.text.tertiary}
          autoFocus
          returnKeyType="next"
        />

        {/* Fields card */}
        <View style={[styles.card, { backgroundColor: theme.bg.card, borderColor: theme.border.default }, SHADOW.sm]}>
          <Field icon="calendar-outline" label="Date">
            <TextInput
              style={[styles.fieldInput, { color: theme.text.primary }]}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.text.tertiary}
              keyboardType="numbers-and-punctuation"
            />
          </Field>
          <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />
          <Field icon="time-outline" label="Start time">
            <TextInput
              style={[styles.fieldInput, { color: theme.text.primary }]}
              value={time}
              onChangeText={setTime}
              placeholder="HH:MM"
              placeholderTextColor={theme.text.tertiary}
              keyboardType="numbers-and-punctuation"
            />
          </Field>
          <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />
          <Field icon="time-outline" label="End time (opt.)">
            <TextInput
              style={[styles.fieldInput, { color: theme.text.primary }]}
              value={endTime}
              onChangeText={setEndTime}
              placeholder="HH:MM"
              placeholderTextColor={theme.text.tertiary}
              keyboardType="numbers-and-punctuation"
            />
          </Field>
          <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />
          <Field icon="location-outline" label="Location (opt.)">
            <TextInput
              style={[styles.fieldInput, { color: theme.text.primary }]}
              value={location}
              onChangeText={setLocation}
              placeholder="Add location"
              placeholderTextColor={theme.text.tertiary}
            />
          </Field>
        </View>

        {/* Notes */}
        <View style={[styles.card, { backgroundColor: theme.bg.card, borderColor: theme.border.default }, SHADOW.sm]}>
          <Field icon="document-text-outline" label="Notes">
            <TextInput
              style={[styles.fieldInput, { color: theme.text.primary, minHeight: 60 }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add notes…"
              placeholderTextColor={theme.text.tertiary}
              multiline
              textAlignVertical="top"
            />
          </Field>
        </View>

        {/* Colour picker */}
        <Text style={[styles.sectionLabel, { color: theme.text.secondary }]}>Colour</Text>
        <View style={styles.colorRow}>
          {EVENT_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSelected]}
              onPress={() => setColor(c)}
            >
              {color === c && <Ionicons name="checkmark" size={16} color={PALETTE.white} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Share with */}
        <Text style={[styles.sectionLabel, { color: theme.text.secondary }]}>Share with</Text>
        <View style={[styles.card, { backgroundColor: theme.bg.card, borderColor: theme.border.default }, SHADOW.sm]}>
          {MOCK_USERS.map((u, i) => (
            <React.Fragment key={u.id}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />}
              <TouchableOpacity
                style={styles.shareRow}
                onPress={() => toggleShare(u.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.shareUserName, { color: theme.text.primary }]}>{u.name}</Text>
                <View style={[
                  styles.checkbox,
                  { borderColor: sharedWith.includes(u.id) ? theme.primary : theme.border.default },
                  sharedWith.includes(u.id) && { backgroundColor: theme.primary },
                ]}>
                  {sharedWith.includes(u.id) && <Ionicons name="checkmark" size={12} color={PALETTE.white} />}
                </View>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ icon, label, children }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  children: React.ReactNode;
}) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.fieldRow}>
      <Ionicons name={icon} size={18} color={theme.text.secondary} style={styles.fieldIcon} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.fieldLabel, { color: theme.text.secondary }]}>{label}</Text>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.screen,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  headerTitle: { ...TYPOGRAPHY.subheading, flex: 1, textAlign: 'center' },
  saveBtn: { borderRadius: RADIUS.full, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, minWidth: 60, alignItems: 'center' },
  saveBtnText: { ...TYPOGRAPHY.bodyBold, color: PALETTE.white },
  body: { padding: SPACING.screen, gap: SPACING.lg },
  errorBox: { borderRadius: RADIUS.md, borderWidth: 1, padding: SPACING.md },
  errorText: { ...TYPOGRAPHY.caption },
  titleInput: {
    ...TYPOGRAPHY.title,
    borderBottomWidth: 1,
    paddingBottom: SPACING.md,
    paddingTop: SPACING.xs,
  },
  card: { borderRadius: RADIUS.xl, borderWidth: 1, overflow: 'hidden' },
  fieldRow: { flexDirection: 'row', alignItems: 'flex-start', padding: SPACING.md, gap: SPACING.md },
  fieldIcon: { marginTop: 18, width: 22 },
  fieldLabel: { ...TYPOGRAPHY.label, marginBottom: 2 },
  fieldInput: { ...TYPOGRAPHY.body, paddingTop: 0 },
  divider: { height: 1, marginLeft: SPACING.md + 22 + SPACING.md },
  sectionLabel: { ...TYPOGRAPHY.label },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: PALETTE.white,
    ...SHADOW.sm,
  },
  shareRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.md },
  shareUserName: { ...TYPOGRAPHY.body, flex: 1 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
