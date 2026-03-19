import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import Screen from '../ui/components/Screen';
import Header from '../ui/components/Header';
import Card from '../ui/components/Card';
import SmartList from '../ui/components/SmartList';
import AppText from '../ui/components/AppText';
import Button from '../ui/components/Button';
import { useAppTheme } from '../ui/theme/ThemeProvider';
import { haptics } from '../ui/haptics';
import { generateEmergencyDate } from '../services/EmergencyDateService';
import { generateWithAI as generateAIDate } from '../services/AIEmergencyDateService';
import { tokens } from '../config/tokens';
import type { EmergencySuggestion } from '../services/EmergencyDateService';
import type { AutopilotVibe } from '../services/AutopilotService';
import type { RootStackParamList } from '../navigation/types';

// ─── Components ───────────────────────────────────────────

function UrgencyChip({ urgency, currentUrgency, onPress, theme }) {
  const labels = {
    now: { label: 'Right Now', icon: 'zap', desc: 'Leave in 10 mins' },
    tonight: { label: 'Tonight', icon: 'moon', desc: 'Next 2-4 hours' },
    'this-week': { label: 'This Week', icon: 'calendar', desc: 'Plan ahead' },
  };

  const info = labels[urgency];
  const isActive = currentUrgency === urgency;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        st.urgencyChip,
        {
          backgroundColor: isActive ? theme.accent.primary : theme.bg.muted,
          borderColor: isActive ? theme.accent.primary : 'transparent',
        },
      ]}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      <Feather 
        name={info.icon} 
        size={18} 
        color={isActive ? theme.text.inverse : theme.text.secondary} 
      />
      <View style={{ marginLeft: 10, flex: 1 }}>
        <AppText 
          style={{ 
            fontSize: 15, 
            fontWeight: '700', 
            color: isActive ? theme.text.inverse : theme.text.primary 
          }}
        >
          {info.label}
        </AppText>
        <AppText 
          style={{ 
            fontSize: 12, 
            color: isActive ? '#FFFFFF99' : theme.text.tertiary 
          }}
        >
          {info.desc}
        </AppText>
      </View>
    </TouchableOpacity>
  );
}

const MemoUrgencyChip = React.memo(UrgencyChip);
MemoUrgencyChip.displayName = 'UrgencyChip';

function VibeChip({ vibe, currentVibe, onSelect, theme }) {
  const vibes = {
    romantic: { emoji: '❤️', label: 'Romantic' },
    cozy: { emoji: '☕', label: 'Cozy' },
    playful: { emoji: '🎉', label: 'Playful' },
    thoughtful: { emoji: '📚', label: 'Thoughtful' },
    adventurous: { emoji: '🚀', label: 'Adventurous' },
  };

  const info = vibes[vibe];
  const isActive = currentVibe === vibe;

  return (
    <TouchableOpacity
      onPress={() => onSelect(vibe)}
      style={[
        st.vibeChip,
        {
          backgroundColor: isActive ? theme.accent.primary : theme.bg.muted,
          borderColor: isActive ? theme.accent.primary : theme.divider,
        },
      ]}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      <AppText style={{ fontSize: 18 }}>{info.emoji}</AppText>
      <AppText 
        style={{ 
          fontSize: 13, 
          fontWeight: '600',
          color: isActive ? theme.text.inverse : theme.text.secondary,
          marginLeft: 6,
        }}
      >
        {info.label}
      </AppText>
    </TouchableOpacity>
  );
}

const MemoVibeChip = React.memo(VibeChip);
MemoVibeChip.displayName = 'VibeChip';

function TimeChip({ label, hour, currentHour, onPress, theme }) {
  const isActive = currentHour === hour;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        st.vibeChip,
        {
          backgroundColor: isActive ? theme.accent.primary : theme.bg.muted,
          borderColor: isActive ? theme.accent.primary : theme.divider,
          paddingHorizontal: 12,
        },
      ]}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      <AppText
        style={{
          fontSize: 13,
          fontWeight: '700',
          color: isActive ? theme.text.inverse : theme.text.secondary,
        }}
      >
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

const MemoTimeChip = React.memo(TimeChip);
MemoTimeChip.displayName = 'TimeChip';

function IdeaCard({ idea, theme, onUse, onSchedule }) {
  const actionInfo = {
    book: { icon: 'calendar', label: 'Book Table', color: theme.error },
    tickets: { icon: 'film', label: 'Get Tickets', color: theme.accent.primary },
    navigate: { icon: 'map-pin', label: 'Find Nearby', color: theme.success },
    plan: { icon: 'list', label: 'Pick Recipe', color: theme.warning },
    go: { icon: 'zap', label: 'Leave Now!', color: theme.error },
    // Feather doesn't have "calendar-plus"; use a valid icon.
    schedule: { icon: 'calendar', label: 'Add to Calendar', color: theme.info },
  };

  const action = idea.actionable || {};
  const actionStyle = actionInfo[action.type] || actionInfo.schedule;

  return (
    <Card style={{ marginTop: tokens.space.md }}>
      {/* Header */}
      <View style={st.ideaHeader}>
        <AppText style={{ fontSize: 20 }}>{idea.timeEmoji || '✨'}</AppText>
        <View style={st.flex1ml10}>
          <AppText style={[st.ideaTitle, { color: theme.text.primary }]}>
            {idea.title}
          </AppText>
          <View style={st.ideaMeta}>
            <AppText style={[st.ideaMetaText, { color: theme.text.tertiary }]}>
              {idea.vibe}
            </AppText>
            <AppText style={[st.ideaMetaText, { color: theme.text.tertiary }]}>•</AppText>
            <AppText style={[st.ideaMetaText, { color: theme.text.tertiary }]}>
              ~{idea.durationMins} mins
            </AppText>
            <AppText style={[st.ideaMetaText, { color: theme.text.tertiary }]}>•</AppText>
            <AppText style={[st.ideaMetaText, { color: theme.accent.primary, fontWeight: '600' }]}>
              {idea.when}
            </AppText>
          </View>
        </View>
      </View>

      {/* Details */}
      {!!idea.details && (
        <AppText style={[st.ideaDetails, { color: theme.text.secondary }]}>
          {idea.details}
        </AppText>
      )}

      {Array.isArray(idea.plan) && idea.plan.length > 0 && (
        <View style={st.planList}>
          {idea.plan.slice(0, 3).map((step, idx) => (
            <View key={`${idea.id || idea.title}-step-${idx}`} style={st.planRow}>
              <View style={[st.planDot, { backgroundColor: theme.divider }]} />
              <AppText style={[st.planText, { color: theme.text.tertiary }]}>{step}</AppText>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={st.ideaActions}>
        <TouchableOpacity
          onPress={() => {
            haptics.success();
            onUse(idea);
          }}
          accessibilityRole="button"
          style={[st.actionBtn, st.primaryActionBtn, { backgroundColor: actionStyle.color }]}
          activeOpacity={0.8}
        >
          <Feather name={actionStyle.icon} size={16} color="#FFF" />
          <AppText style={st.actionBtnText}>{actionStyle.label}</AppText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            haptics.light();
            onSchedule(idea);
          }}
          accessibilityRole="button"
          style={[st.actionBtn, st.secondaryActionBtn, { borderColor: theme.divider }]}
          activeOpacity={0.8}
        >
          <Feather name="calendar" size={16} color={theme.text.secondary} />
          <AppText style={[st.secondaryActionText, { color: theme.text.secondary }]}>
            Schedule
          </AppText>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const MemoIdeaCard = React.memo(IdeaCard);
MemoIdeaCard.displayName = 'IdeaCard';

function ContextBanner({ timeContext, theme }) {
  return (
    <View style={[st.contextBanner, { backgroundColor: theme.accent.light }]}>
      <AppText style={{ fontSize: 24 }}>{timeContext.emoji}</AppText>
      <View style={st.flex1ml12}>
        <AppText style={[st.contextTitle, { color: theme.text.primary }]}>
          {timeContext.label} Ideas
        </AppText>
        <AppText style={[st.contextBody, { color: theme.text.secondary }]}>
          Context-aware suggestions based on current time
        </AppText>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────

type EmergencyRouteParams = RootStackParamList['EmergencyDate'];
type EmergencyVibe = Exclude<AutopilotVibe, 'variety'>;
type EmergencyUrgency = 'now' | 'tonight' | 'this-week';

export default function EmergencyDateScreen({ navigation, route }: { navigation: { navigate: (s: string, p?: Record<string, unknown>) => void; goBack: () => void }; route: { params?: EmergencyRouteParams } }) {
  const { theme } = useAppTheme();
  const initialUrgency: EmergencyUrgency = (route.params?.urgency as EmergencyUrgency) || 'tonight';
  
  const [urgency, setUrgency] = useState(initialUrgency);
  const [vibe, setVibe] = useState<EmergencyVibe | null>(null); // null = all vibes

  const handleSelectVibe = useCallback((next: EmergencyVibe) => {
    setVibe(prev => (prev === next ? null : next));
  }, []);

  const [budget] = useState<'low' | 'mid' | 'high'>('mid'); // Could make this selectable too

  // Optional: user-selected time (so ideas update when they pick a time)
  const [targetHour, setTargetHour] = useState<number | null>(null);

  const buildTargetTime = useCallback(() => {
    if (typeof targetHour !== 'number') return null;
    const d = new Date();
    d.setSeconds(0);
    d.setMilliseconds(0);
    d.setHours(targetHour, 0, 0, 0);
    return d.toISOString();
  }, [targetHour]);

  const [result, setResult] = useState<{ timeContext: { emoji: string; label: string }; ideas: EmergencySuggestion[]; count: number }>({ timeContext: { emoji: '✨', label: 'Tonight' }, ideas: [], count: 0 });
  const [loading, setLoading] = useState(true);

  // Defensive normalization (prevents hard crashes if a service returns undefined/null)
  const ideas = Array.isArray(result?.ideas) ? result.ideas : [];
  const ideasCount = typeof result?.count === 'number' ? result.count : ideas.length;

  // Generate ideas based on current selections (async)
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        // Try AI-powered generation first (uses Claude if configured)
        const aiResult = await generateAIDate({
          urgency,
          vibe,
          budget,
          targetTime: buildTargetTime(),
          count: 6,
        });

        // Fall back to local catalog if AI is unavailable
        const res = aiResult || await generateEmergencyDate({
          urgency,
          vibe,
          budget,
          targetTime: buildTargetTime(),
          count: 6,
        });
        if (!alive) return;
        setResult({
          ...(res || {}),
          ideas: Array.isArray(res?.ideas) ? res.ideas : [],
          count: typeof res?.count === 'number' ? res.count : (Array.isArray(res?.ideas) ? res.ideas.length : 0),
          timeContext: res?.timeContext || { emoji: '✨', label: 'Tonight' },
        });
      } catch {
        if (!alive) return;
        setResult({ timeContext: { emoji: '✨', label: 'Tonight' }, ideas: [], count: 0 });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [urgency, vibe, budget, buildTargetTime]);

  // Reset the selected time when urgency changes to "now" (it makes less sense there).
  useEffect(() => {
    if (urgency === 'now') setTargetHour(null);
  }, [urgency]);

  const handleUseIdea = useCallback((idea: EmergencySuggestion) => {
    // Handle different action types
    const action = idea.actionable?.action;
    
    if (action === 'create_event') {
      navigation.navigate('AddEvent', {
        preset: {
          title: idea.title,
          durationMins: idea.durationMins,
          category: idea.vibe,
        },
      });
    } else if (action === 'search_restaurants' || action === 'search_movies' || action === 'search_parks') {
      // Could integrate with maps/search
      alert('Opening search... (integrate with Maps API)');
    } else {
      // Default: add to calendar
      navigation.navigate('AddEvent', {
        preset: {
          title: idea.title,
          durationMins: idea.durationMins,
          category: idea.vibe,
        },
      });
    }
  }, [navigation]);

  const handleScheduleIdea = useCallback((idea: EmergencySuggestion) => {
    navigation.navigate('AddEvent', {
      preset: {
        title: idea.title,
        durationMins: idea.durationMins,
        category: idea.vibe,
      },
    });
  }, [navigation]);

  return (
    <Screen>
      <Header 
        title="Emergency Date" 
        leftAction={{ icon: 'arrow-left', label: 'Back', onPress: () => navigation.goBack() }}
      />
      
      <ScrollView
        style={st.flex1}
        contentContainerStyle={{ padding: tokens.space.lg, paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {/* Context Banner */}
        <ContextBanner timeContext={result.timeContext} theme={theme} />

        {/* Urgency Selection */}
        <View style={{ marginTop: tokens.space.lg }}>
          <AppText style={[st.sectionTitle, { color: theme.text.primary }]}>
            When do you need this?
          </AppText>
          
          <View style={st.urgencyRow}>
            <MemoUrgencyChip 
              urgency="now" 
              currentUrgency={urgency}
              onPress={() => { setUrgency('now'); haptics.light(); }}
              theme={theme}
            />
            <MemoUrgencyChip 
              urgency="tonight" 
              currentUrgency={urgency}
              onPress={() => { setUrgency('tonight'); haptics.light(); }}
              theme={theme}
            />
            <MemoUrgencyChip 
              urgency="this-week" 
              currentUrgency={urgency}
              onPress={() => { setUrgency('this-week'); haptics.light(); }}
              theme={theme}
            />
          </View>
        </View>

        {/* Time Selection (regenerates ideas) */}
        {urgency !== 'now' && (
          <View style={{ marginTop: tokens.space.lg }}>
            <View style={st.sectionHeader}>
              <AppText style={[st.sectionTitle, { color: theme.text.primary, flex: 1 }]}>When?</AppText>
              {typeof targetHour === 'number' && (
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => {
                    setTargetHour(null);
                    haptics.light();
                  }}
                  style={st.clearBtn}
                
          activeOpacity={0.8}
        >
                  <AppText style={{ fontSize: 13, color: theme.accent.primary, fontWeight: '600' }}>Clear</AppText>
                </TouchableOpacity>
              )}
            </View>

            <View style={st.vibeRow}>
              {urgency === 'tonight' && (
                <>
                  <MemoTimeChip label="6pm" hour={18} currentHour={targetHour} onPress={() => { setTargetHour(18); haptics.light(); }} theme={theme} />
                  <MemoTimeChip label="7pm" hour={19} currentHour={targetHour} onPress={() => { setTargetHour(19); haptics.light(); }} theme={theme} />
                  <MemoTimeChip label="8pm" hour={20} currentHour={targetHour} onPress={() => { setTargetHour(20); haptics.light(); }} theme={theme} />
                  <MemoTimeChip label="9pm" hour={21} currentHour={targetHour} onPress={() => { setTargetHour(21); haptics.light(); }} theme={theme} />
                </>
              )}

              {urgency === 'this-week' && (
                <>
                  <MemoTimeChip label="Morning" hour={10} currentHour={targetHour} onPress={() => { setTargetHour(10); haptics.light(); }} theme={theme} />
                  <MemoTimeChip label="Afternoon" hour={14} currentHour={targetHour} onPress={() => { setTargetHour(14); haptics.light(); }} theme={theme} />
                  <MemoTimeChip label="Evening" hour={18} currentHour={targetHour} onPress={() => { setTargetHour(18); haptics.light(); }} theme={theme} />
                </>
              )}
            </View>
          </View>
        )}

        {/* Vibe Selection */}
        <View style={{ marginTop: tokens.space.lg }}>
          <View style={st.sectionHeader}>
            <AppText style={[st.sectionTitle, { color: theme.text.primary, flex: 1 }]}>
              Pick a vibe
            </AppText>
            {vibe && (
              <TouchableOpacity
              accessibilityRole="button" 
                onPress={() => {
             setVibe(null); haptics.light(); }}
                style={st.clearBtn}
              
          activeOpacity={0.8}
        >
                <AppText style={{ fontSize: 13, color: theme.accent.primary, fontWeight: '600' }}>
                  Clear
                </AppText>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={st.vibeRow}>
            {(['romantic', 'cozy', 'playful', 'thoughtful', 'adventurous'] as EmergencyVibe[]).map((v) => (
              <MemoVibeChip
                key={v}
                vibe={v}
                currentVibe={vibe}
                onSelect={handleSelectVibe}
                theme={theme}
              />
            ))}
          </View>
        </View>

        {/* Ideas */}
        <View style={{ marginTop: tokens.space.lg }}>
          <AppText style={[st.sectionTitle, { color: theme.text.primary }]}>
            {ideasCount} {ideasCount === 1 ? 'Idea' : 'Ideas'} for You
          </AppText>

          {loading && (
            <Card style={{ marginTop: tokens.space.md, alignItems: 'center', padding: tokens.space.xl }}>
              <AppText style={{ fontSize: 28, marginBottom: 8 }}>⏳</AppText>
              <AppText style={{ color: theme.text.secondary }}>Generating ideas…</AppText>
            </Card>
          )}
          
          {!loading && ideas.length > 0 && (
            <SmartList
              data={ideas}
              keyExtractor={(item: EmergencySuggestion, index: number) => String((item as { id?: string }).id || `${item?.title || 'idea'}-${index}`)}
              estimatedItemSize={190}
              scrollEnabled={false}
              renderItem={({ item, index }) => (
                <MemoIdeaCard
                  idea={item}
                  theme={theme}
                  onUse={() => handleUseIdea(item)}
                  onSchedule={() => handleScheduleIdea(item)}
                />
              )}
            />
          )}
        </View>

        {/* No Results */}
        {!loading && ideas.length === 0 && (
          <Card style={{ marginTop: tokens.space.lg, alignItems: 'center', padding: tokens.space.xl }}>
            <AppText style={{ fontSize: 32, marginBottom: 8 }}>🤔</AppText>
            <AppText style={[st.noResultsTitle, { color: theme.text.primary }]}>
              No ideas match these filters
            </AppText>
            <AppText style={[st.noResultsBody, { color: theme.text.secondary }]}>
              Try adjusting your vibe or urgency level
            </AppText>
          </Card>
        )}

        {/* Pro Tip */}
        <Card style={{ marginTop: tokens.space.lg, backgroundColor: theme.accent.light }}>
          <View style={st.row}>
            <Feather name="zap" size={16} color={theme.accent.primary} style={st.mt2} />
            <View style={st.flex1ml10}>
              <AppText style={[st.tipTitle, { color: theme.text.primary }]}>
                Pro Tip
              </AppText>
              <AppText style={[st.tipBody, { color: theme.text.secondary }]}>
                Ideas adapt to the time of day. Come back in the evening for dinner suggestions, 
                or morning for breakfast ideas!
              </AppText>
            </View>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────

const st = StyleSheet.create({
  contextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.space.md,
    borderRadius: tokens.radius.lg,
  },
  contextTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  contextBody: {
    fontSize: 13,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: tokens.space.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.space.sm,
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  urgencyRow: {
    gap: tokens.space.sm,
  },
  urgencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.space.md,
    borderRadius: tokens.radius.lg,
    borderWidth: 2,
  },
  vibeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
  },
  vibeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: tokens.radius.pill,
    borderWidth: 1.5,
  },
  ideaHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  ideaTitle: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  ideaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  ideaMetaText: {
    fontSize: 12,
  },
  ideaDetails: {
    marginTop: tokens.space.sm,
    fontSize: 13,
    lineHeight: 18,
  },
  planList: {
    marginTop: tokens.space.sm,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  planDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    marginRight: 8,
  },
  planText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  ideaActions: {
    flexDirection: 'row',
    marginTop: tokens.space.md,
    gap: tokens.space.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: tokens.radius.md,
    gap: 8,
  },
  primaryActionBtn: {
    flex: 2,
  },
  secondaryActionBtn: {
    flex: 1,
    borderWidth: 1.5,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    // color set dynamically via theme.text.inverse
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  noResultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  noResultsBody: {
    fontSize: 14,
    textAlign: 'center',
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  tipBody: {
    fontSize: 12,
    lineHeight: 16,
  },
  flex1: { flex: 1 },
  flex1ml10: { flex: 1, marginLeft: 10 },
  flex1ml12: { flex: 1, marginLeft: 12 },
  mt2: { marginTop: 2 },
  row: { flexDirection: 'row' },
});
