// src/screens/AutopilotSetupScreen.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Screen from '../ui/components/Screen';
import LoadingState from '../ui/components/LoadingState';
import Header from '../ui/components/Header';
import Card from '../ui/components/Card';
import AppText from '../ui/components/AppText';
import Button from '../ui/components/Button';
import Input from '../ui/components/Input';
import { useAppTheme } from '../ui/theme/ThemeProvider';
import { haptics } from '../ui/haptics';
import { tokens } from '../config/tokens';
import ConnectionsService from '../services/ConnectionsService';
import AutopilotService from '../services/AutopilotService';
import PlacesKeyService from '../services/PlacesKeyService';

const DAYS: Array<{ label: string; key: number }> = [
  { label: 'Mon', key: 1 },
  { label: 'Tue', key: 2 },
  { label: 'Wed', key: 3 },
  { label: 'Thu', key: 4 },
  { label: 'Fri', key: 5 },
  { label: 'Sat', key: 6 },
  { label: 'Sun', key: 0 },
];
const VIBES = [
  { key:'romantic', label:'Romantic' },
  { key:'cozy', label:'Cozy' },
  { key:'playful', label:'Playful' },
  { key:'adventurous', label:'Adventurous' },
  { key:'thoughtful', label:'Thoughtful' },
  { key:'variety', label:'Variety' },
];

type ChipProps = { label: string; selected: boolean; onPress: () => void };
function Chip({ label, selected, onPress }: ChipProps) {
  const { theme } = useAppTheme();
  return (
    <TouchableOpacity
              accessibilityRole="button" onPress={onPress} activeOpacity={0.85}
      style={[s.chip, { backgroundColor: selected ? theme.accent.primary : theme.bg.card }, { borderColor: selected ? 'transparent' : theme.divider }]}>
      <AppText variant="caption" style={{ color: selected ? theme.text.inverse : theme.text.secondary, fontWeight:'600' }}>
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

export default function AutopilotSetupScreen({ navigation }: { navigation: { navigate: (s: string, p?: Record<string, unknown>) => void; goBack: () => void } }) {
  const { theme } = useAppTheme();
  const [users, setUsers] = useState<any[]>([]);
  const [prefs, setPrefs] = useState<Record<string, unknown> | null>(null);
  const [placesApiKey, setPlacesApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    (async () => {
      const all = await ConnectionsService.getAllUsers();
      setUsers(all || []);
      const p = await AutopilotService.getPreferences();
      // pick default partner if missing
      if (!p.partnerId) {
        const partner = (all || []).find((u: { relationship?: string }) => u.relationship === 'partner');
        if (partner) p.partnerId = partner.id;
      }
      setPrefs(p);

      // Load optional Google Places API key for nearby venues.
      const key = await PlacesKeyService.getKey();
      setPlacesApiKey(key || '');
    })();
  }, []);

  const partnerOptions = useMemo(() => (users || []).filter((u: { relationship?: string }) => u.relationship !== 'self'), [users]);

  if (!prefs) return (
    <Screen>
      <Header title="Autopilot Preferences" leftAction={{ icon: 'arrow-left', label: 'Back', onPress: () => navigation.goBack() }} />
      <LoadingState message="Loading preferences..." />
    </Screen>
  );

  const set = (patch: Record<string, unknown>) => setPrefs((prev: unknown) => ({ ...prev, ...(patch||{}) }));

  const toggleInList = (list: unknown[], item: unknown) => {
    const setList = new Set(list || []);
    if (setList.has(item)) setList.delete(item);
    else setList.add(item);
    return Array.from(setList);
  };

  const save = async () => {
    haptics.medium();
    // Persist Places API key (optional) so Tonight/Autopilot can show real venues.
    await PlacesKeyService.setKey(placesApiKey);
    await AutopilotService.savePreferences(prefs);
    navigation.replace('Autopilot');
  };

  return (
    <Screen>
      <Header title="Autopilot Preferences" subtitle="Customise your scheduling preferences" leftAction={{ icon: 'arrow-left', label: 'Back', onPress: () => navigation.goBack() }} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 160 }}>
        <Card>
          <AppText variant="body" style={{ fontWeight:'700', marginBottom: 6 }}>Partner</AppText>
          <AppText variant="caption" color="muted" style={s.mb12}>
            Who should Autopilot schedule dates with?
          </AppText>

          <View style={s.gap10}>
            {partnerOptions.map((u: { id: string; name: string; color?: string }) => (
              <TouchableOpacity
              accessibilityRole="button" key={u.id} activeOpacity={0.85}
                onPress={() => { haptics.light(); set({ partnerId: u.id }); }}
                style={[s.row, { borderColor: theme.divider, backgroundColor: theme.bg.subtle }]}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: u.color, marginRight: 10 }} />
                <AppText variant="body" style={{ flex: 1, fontWeight:'600' }}>{u.name}</AppText>
                {prefs.partnerId === u.id ? <Feather name="check" size={18} color={theme.accent.primary} /> : <Feather name="circle" size={18} color={theme.text.tertiary} />}
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <View style={{ height: 12 }} />

        <Card>
          <AppText variant="body" style={{ fontWeight:'700', marginBottom: 6 }}>Budget</AppText>
          <AppText variant="caption" color="muted" style={s.mb12}>
            Autopilot will pick ideas within your budget.
          </AppText>

          <View style={{ flexDirection:'row', gap: 12 }}>
            {[
              { key:'low', label:'$' },
              { key:'mid', label:'$$' },
              { key:'high', label:'$$$' },
            ].map((b: { id: string; label: string; icon?: string }) => (
              <Chip key={b.key} label={b.label} selected={prefs.budget === b.key} onPress={() => { haptics.light(); set({ budget: b.key }); }} />
            ))}
          </View>
        </Card>

        <View style={{ height: 12 }} />

        <Card>
          <AppText variant="body" style={{ fontWeight:'700', marginBottom: 6 }}>Preferred days</AppText>
          <AppText variant="caption" color="muted" style={s.mb12}>
            Choose the days you like to go out.
          </AppText>

          <View style={{ flexDirection:'row', flexWrap:'wrap', gap: 12 }}>
            {DAYS.map((d: { id: number; label: string }) => (
              <Chip key={d.key} label={d.label} selected={(prefs.preferredDays||[]).includes(d.key)}
                onPress={() => { haptics.light(); set({ preferredDays: toggleInList(prefs.preferredDays, d.key) }); }} />
            ))}
          </View>
        </Card>

        <View style={{ height: 12 }} />

        <Card>
          <AppText variant="body" style={{ fontWeight:'700', marginBottom: 6 }}>Time window</AppText>
          <AppText variant="caption" color="muted" style={s.mb12}>
            Autopilot schedules only inside this window.
          </AppText>

          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
            <View style={s.flex1}>
              <AppText variant="caption" color="muted">Start</AppText>
              <View style={s.stepper}>
                <TouchableOpacity
              accessibilityRole="button" onPress={() => set({ timeWindow: { ...prefs.timeWindow, startHour: Math.max(0, (prefs.timeWindow?.startHour ?? 18) - 1) } })} style={s.stepBtn} activeOpacity={0.85}>
                  <Feather name="minus" size={16} color={theme.text.secondary} />
                </TouchableOpacity>
                <AppText variant="body" style={{ width: 64, textAlign:'center', fontWeight:'700' }}>{(() => { const h = prefs.timeWindow?.startHour ?? 18; if (h === 0 || h === 24) return '12 AM'; if (h === 12) return '12 PM'; return h > 12 ? `${h-12} PM` : `${h} AM`; })()}</AppText>
                <TouchableOpacity
              accessibilityRole="button" onPress={() => set({ timeWindow: { ...prefs.timeWindow, startHour: Math.min((prefs.timeWindow?.endHour ?? 22) - 1, (prefs.timeWindow?.startHour ?? 18) + 1) } })} style={s.stepBtn} activeOpacity={0.85}>
                  <Feather name="plus" size={16} color={theme.text.secondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ width: 12 }} />

            <View style={s.flex1}>
              <AppText variant="caption" color="muted">End</AppText>
              <View style={s.stepper}>
                <TouchableOpacity
              accessibilityRole="button" onPress={() => set({ timeWindow: { ...prefs.timeWindow, endHour: Math.max((prefs.timeWindow?.startHour ?? 18) + 1, (prefs.timeWindow?.endHour ?? 22) - 1) } })} style={s.stepBtn} activeOpacity={0.85}>
                  <Feather name="minus" size={16} color={theme.text.secondary} />
                </TouchableOpacity>
                <AppText variant="body" style={{ width: 64, textAlign:'center', fontWeight:'700' }}>{(() => { const h = prefs.timeWindow?.endHour ?? 22; if (h === 0 || h === 24) return '12 AM'; if (h === 12) return '12 PM'; return h > 12 ? `${h-12} PM` : `${h} AM`; })()}</AppText>
                <TouchableOpacity
              accessibilityRole="button" onPress={() => set({ timeWindow: { ...prefs.timeWindow, endHour: Math.min(24, (prefs.timeWindow?.endHour ?? 22) + 1) } })} style={s.stepBtn} activeOpacity={0.85}>
                  <Feather name="plus" size={16} color={theme.text.secondary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Card>

        <View style={{ height: 12 }} />

        <Card>
          <AppText variant="body" style={{ fontWeight:'700', marginBottom: 6 }}>Vibe preferences</AppText>
          <AppText variant="caption" color="muted" style={s.mb12}>
            When your relationship health dips, Autopilot prioritizes connection (romantic/cozy).
          </AppText>

          <View style={{ flexDirection:'row', flexWrap:'wrap', gap: 12 }}>
            {VIBES.map((v: { id: string; label: string; emoji?: string }) => (
              <Chip key={v.key} label={v.label} selected={(prefs.vibePrefs||[]).includes(v.key)}
                onPress={() => { haptics.light(); set({ vibePrefs: toggleInList(prefs.vibePrefs, v.key) }); }} />
            ))}
          </View>
        </Card>

        <View style={{ height: 12 }} />

        <Card>
          <AppText variant="body" style={{ fontWeight:'700', marginBottom: 6 }}>Practical constraints</AppText>
          <AppText variant="caption" color="muted" style={s.mb12}>
            Optional — helps ideas feel tailored.
          </AppText>

          <View style={s.row}>
            <Feather name="map-pin" size={16} color={theme.text.tertiary} />
            <AppText variant="body" style={{ marginLeft: 10, flex: 1, fontWeight:'600' }}>Max travel distance</AppText>
            <View style={s.stepper}>
              <TouchableOpacity
              accessibilityRole="button" onPress={() => set({ maxDistanceKm: Math.max(1, (prefs.maxDistanceKm || 15) - 5) })} style={s.stepBtn} activeOpacity={0.85}>
                <Feather name="minus" size={16} color={theme.text.secondary} />
              </TouchableOpacity>
              <AppText variant="body" style={{ width: 48, textAlign:'center', fontWeight:'700' }}>{prefs.maxDistanceKm || 15}km</AppText>
              <TouchableOpacity
              accessibilityRole="button" onPress={() => set({ maxDistanceKm: Math.min(100, (prefs.maxDistanceKm || 15) + 5) })} style={s.stepBtn} activeOpacity={0.85}>
                <Feather name="plus" size={16} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 10 }} />

          <TouchableOpacity
              accessibilityRole="button" activeOpacity={1} style={[s.noteBox, { borderColor: theme.divider, backgroundColor: theme.bg.subtle }]}>
            <AppText variant="caption" color="muted" style={s.mb8}>
              Dietary restrictions
            </AppText>
            <Input
              value={prefs.dietary || ''}
              onChangeText={(v: string) => set({ dietary: v })}
              placeholder="e.g. vegetarian, halal, gluten-free"
            />
          </TouchableOpacity>

          <View style={{ height: 10 }} />

          <TouchableOpacity
              accessibilityRole="button" activeOpacity={0.85} onPress={() => setShowApiKey?.(!showApiKey)} style={[s.noteBox, { borderColor: theme.divider, backgroundColor: theme.bg.subtle }]}> 
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText variant="caption" color="muted">
                Venue search API key (optional)
              </AppText>
              <Feather name={showApiKey ? 'chevron-up' : 'chevron-down'} size={14} color={theme.text.tertiary} />
            </View>
            {showApiKey && (
              <>
                <Input
                  value={placesApiKey}
                  onChangeText={setPlacesApiKey}
                  placeholder="Paste your Google Places key"
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={true}
                  style={{ marginTop: 8 }}
                />
                <AppText variant="caption" color="muted" style={s.mt8}>
                  Enables nearby venue suggestions. Stored locally only.
                </AppText>
              </>
            )}
          </TouchableOpacity>
        </Card>

        <View style={{ height: 16 }} />

        <Button title="Save preferences" onPress={save} />

        <View style={{ height: 10 }} />
        <Button title="Cancel" variant="secondary" onPress={() => navigation.goBack()} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection:'row', alignItems:'center', padding: 12, borderRadius: 14, borderWidth: 1 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  stepper: { flexDirection:'row', alignItems:'center', borderRadius: 999, overflow:'hidden' },
  stepBtn: { width: 34, height: 34, alignItems:'center', justifyContent:'center' },
  item: { flexDirection:'row', alignItems:'center', paddingVertical: 12 },
  noteBox: { padding: 12, borderRadius: 14, borderWidth: 1 },
  input: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
  flex1: { flex: 1 },
  gap10: { gap: 12 },
  mb12: { marginBottom: tokens.space.md },
  mb8: { marginBottom: 8 },
  mt8: { marginTop: 8 },
});
