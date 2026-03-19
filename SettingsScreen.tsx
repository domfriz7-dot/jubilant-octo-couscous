import React, { useCallback, useMemo, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import SmartList from '../ui/components/SmartList';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TasksService from '../services/TasksService';
import NotificationService from '../services/NotificationService';
import Screen from '../ui/components/Screen';
import Header from '../ui/components/Header';
import AppText from '../ui/components/AppText';
import Avatar from '../ui/components/Avatar';
import SwipeableTaskItem from '../ui/components/SwipeableTaskItem';
import Input from '../ui/components/Input';
import SearchBar from '../ui/components/SearchBar';
import { useAppTheme } from '../ui/theme/ThemeProvider';
import { haptics } from '../ui/haptics';
import { tokens } from '../config/tokens';
import { useTasks } from '../hooks/useTasks';
import { useUsers } from '../hooks/useUsers';
import { getCurrentUserId } from '../services/IdentityService';
import { useTasksViewModel } from '../viewModels/useTasksViewModel';
import type { TaskCardVM } from '../viewModels/useTasksViewModel';
import { logError } from '../services/logger';
import { confirmDelete, confirmDestructive } from '../utils/confirmDialog';
import { todayKey as todayKeyFn } from '../utils/dateTime';

import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../navigation/types';
import type { Task, TaskDraft } from '../types/tasks';
import type { AppUser } from '../types/connections';
import { getFirstName } from '../utils/partners';

type Props = BottomTabScreenProps<MainTabParamList, 'Tasks'>;

type PriorityId = 'low' | 'med' | 'high';

const PRIS = [{ id: 'low', label: 'Low', color: tokens.priority.low }, { id: 'med', label: 'Med', color: tokens.priority.med }, { id: 'high', label: 'High', color: tokens.priority.high }];
const REM_OPTS = [{ value: 0, label: 'At time' }, { value: 5, label: '5m' }, { value: 15, label: '15m' }, { value: 30, label: '30m' }, { value: 60, label: '1h' }];

// ─── Memoized list items (performance) ───────────────────
const TaskCard = React.memo(function TaskCard({
  card,
  others,
  onToggle,
  onDelete,
}: {
  card: TaskCardVM;
  others: AppUser[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const assignedUser = useMemo(() => {
    const assignedTo = card?._raw?.assignedTo;
    if (!assignedTo) return null;
    if (assignedTo === getCurrentUserId()) return null;
    return others.find((u: AppUser) => u.id === assignedTo) || null;
  }, [card?._raw?.assignedTo, others]);

  const handlePress = useCallback(() => onToggle(card.id), [card.id, onToggle]);
  const handleDelete = useCallback(() => onDelete(card.id), [card.id, onDelete]);
  const handleComplete = useCallback(() => {
    if (!card.completed) onToggle(card.id);
  }, [card.completed, card.id, onToggle]);

  return (
    <SwipeableTaskItem
      task={card}
      onComplete={handleComplete}
      onDelete={handleDelete}
      onPress={handlePress}
      assignedUser={assignedUser}
      dotColorKey={card.priority || 'med'}
      overdueLabel={card.overdueLabel}
    />
  );
});
TaskCard.displayName = 'TaskCard';

const QuickAddChip = React.memo(function QuickAddChip({
  title,
  hint,
  repeating,
  onPress,
}: {
  title: string;
  hint?: string;
  repeating?: boolean;
  onPress: () => void;
}) {
  const { theme } = useAppTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[st.suggestChip, { backgroundColor: theme.bg.card, borderColor: theme.border }]}
      accessibilityRole="button"
      accessibilityLabel={`Use suggested task: ${title}`}
    >
      <AppText style={{ fontSize: 13, fontWeight: '600' }}>{title}</AppText>
      {hint ? <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>{hint}</AppText> : null}
      {repeating ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
          <Feather name="repeat" size={10} color={theme.accent.primary} />
          <AppText style={{ fontSize: 10, color: theme.accent.primary, marginLeft: 3, fontWeight: '500' }}>Repeating</AppText>
        </View>
      ) : null}
    </TouchableOpacity>
  );
});
QuickAddChip.displayName = 'QuickAddChip';

// Quick-start task templates (shown in the create sheet)
// Quick-start task templates — organized by life category
type TaskCategory = { label: string; icon: string; tasks: Array<{ id: string; title: string; hint?: string; preset?: Partial<{ priority: PriorityId; recurring: boolean; recurDays: number[]; reminder: boolean; reminderMin: number; }> }> };
const TASK_CATEGORIES: TaskCategory[] = [
  {
    label: 'Health & Fitness',
    icon: 'heart',
    tasks: [
      { id: 'gym', title: 'Go to the gym', hint: 'Weights, cardio, or a class', preset: { priority: 'med', recurring: true, recurDays: [1, 3, 5] } },
      { id: 'walk', title: 'Go for a walk', hint: '20-30 min, clear your head', preset: { priority: 'low' } },
      { id: 'mealprep', title: 'Meal prep for the week', hint: 'Cook in bulk, save time later', preset: { priority: 'med', recurring: true, recurDays: [0] } },
      { id: 'water', title: 'Drink 8 glasses of water', hint: 'Stay hydrated', preset: { priority: 'low', recurring: true, recurDays: [0, 1, 2, 3, 4, 5, 6] } },
    ],
  },
  {
    label: 'Home & Chores',
    icon: 'home',
    tasks: [
      { id: 'laundry', title: 'Do the laundry', hint: 'Wash, dry, fold, done', preset: { priority: 'med', recurring: true, recurDays: [6] } },
      { id: 'grocery', title: 'Grocery shopping', hint: 'Check the fridge first', preset: { priority: 'high', reminder: true, reminderMin: 60 } },
      { id: 'clean_kitchen', title: 'Clean the kitchen', hint: 'Dishes, benchtops, floor', preset: { priority: 'med' } },
      { id: 'declutter', title: 'Declutter one space', hint: '15 min, one drawer or shelf', preset: { priority: 'low' } },
      { id: 'bins', title: 'Take out the bins', hint: 'Check collection day', preset: { priority: 'med', recurring: true, recurDays: [0] } },
    ],
  },
  {
    label: 'Productivity',
    icon: 'zap',
    tasks: [
      { id: 'inbox_zero', title: 'Clear email inbox', hint: 'Respond, archive, delete', preset: { priority: 'med' } },
      { id: 'pay_bills', title: 'Pay bills', hint: 'Rent, utilities, subscriptions', preset: { priority: 'high', reminder: true, reminderMin: 30 } },
      { id: 'budget', title: 'Review weekly spending', hint: 'Quick financial check-in', preset: { priority: 'med', recurring: true, recurDays: [0] } },
      { id: 'appointments', title: 'Book an appointment', hint: 'Doctor, dentist, haircut, etc.', preset: { priority: 'med' } },
    ],
  },
  {
    label: 'Self-Care',
    icon: 'book-open',
    tasks: [
      { id: 'read', title: 'Read for 20 minutes', hint: 'Book, article, anything offline', preset: { priority: 'low' } },
      { id: 'journal', title: 'Write in journal', hint: '3 things that went well today', preset: { priority: 'low', recurring: true, recurDays: [0, 1, 2, 3, 4, 5, 6] } },
      { id: 'stretch', title: 'Stretch or meditate', hint: '10 min to reset', preset: { priority: 'low' } },
      { id: 'screens_off', title: 'Screens off by 10pm', hint: 'Better sleep starts here', preset: { priority: 'low', recurring: true, recurDays: [0, 1, 2, 3, 4, 5, 6] } },
    ],
  },
];
// Flat list for backwards compat + quick lookup
const SUGGESTED_TASKS = TASK_CATEGORIES.flatMap((c) => c.tasks);
const DAYS_OF_WEEK = [
  { id: 0, short: 'S', label: 'Sun' }, { id: 1, short: 'M', label: 'Mon' }, { id: 2, short: 'T', label: 'Tue' },
  { id: 3, short: 'W', label: 'Wed' }, { id: 4, short: 'T', label: 'Thu' }, { id: 5, short: 'F', label: 'Fri' },
  { id: 6, short: 'S', label: 'Sat' },
];
function fmtKey(d: Date): string { return todayKeyFn(d); }
function isOverdue(t: Task): boolean { return !t.completed && t.dueDate && new Date(`${t.dueDate}T${t.dueTime || '23:59'}`) < new Date(); }

export default function TasksScreen(_props: Props) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { tasks, active, completed, reload } = useTasks();
  const { others } = useUsers();
  const [view, setView] = useState<'focus' | 'all' | 'done'>('focus');
  const [showAdd, setShowAdd] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    reload();
    setRefreshing(false);
  }, [reload]);

  // Add form state
  const [text, setText] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<PriorityId>('med');
  const [assignTo, setAssignTo] = useState<string | null>(null);
  const [shareWith, setShareWith] = useState<string[]>([]);
  const [reminder, setReminder] = useState(false);
  const [reminderMin, setReminderMin] = useState(15);
  const [recurring, setRecurring] = useState(false);
  const [recurDays, setRecurDays] = useState<number[]>([]); // [1,3,5] = Mon,Wed,Fri

  const todayKeyStr = useMemo(() => fmtKey(new Date()), []);
  const overdue = useMemo(() => active.filter(isOverdue), [active]);

  // ── ViewModel ───────────────────────────────────────────
  const vm = useTasksViewModel({ active, completed, overdue, view, others });

  // ── Actions ──────────────────────────────────────────────
  const toggle = useCallback(async (id: string) => {
    const { wasCompleted } = await TasksService.toggleTaskWithEffects(id);
    wasCompleted ? haptics.success() : haptics.light();
  }, []);

  const del = useCallback((id: string) => {
    const t = tasks.find((x: Task) => x.id === id);
    const name = t?.text || t?.title || 'Task';
    confirmDelete(name, async () => {
      haptics.warning();
      await TasksService.deleteTaskWithCleanup(id);
    });
  }, [tasks]);

  const resetForm = () => { setText(''); setDueDate(''); setDueTime(''); setPriority('med'); setAssignTo(null); setShareWith([]); setReminder(false); setReminderMin(15); setRecurring(false); setRecurDays([]); };

  const applySuggestedTask = useCallback((tplId: string) => {
    const tpl = SUGGESTED_TASKS.find((x) => x.id === tplId);
    if (!tpl) return;
    haptics.light();
    setText(tpl.title);
    if (tpl.preset?.priority) setPriority(tpl.preset.priority);
    if (tpl.preset?.recurring) {
      setRecurring(true);
      setRecurDays(tpl.preset.recurDays || []);
    } else {
      setRecurring(false);
      setRecurDays([]);
    }
    if (typeof tpl.preset?.reminder === 'boolean') setReminder(tpl.preset.reminder);
    if (typeof tpl.preset?.reminderMin === 'number') setReminderMin(tpl.preset.reminderMin);
    // Default due date to today if empty
    setDueDate((prev) => prev || todayKeyStr);
  }, [todayKeyStr]);

  const addTask = useCallback(async () => {
    const t = text.trim(); if (!t) return;
    const myId = getCurrentUserId();
    const shared = assignTo ? [assignTo === myId ? undefined : myId, ...shareWith].filter(Boolean) : shareWith;
    const recurrence = recurring && recurDays.length > 0 ? { type: 'weekly' as const, days: recurDays } : null;
    const task: TaskDraft = { text: t, completed: false, dueDate: dueDate || todayKeyStr, dueTime: dueTime || null, priority,
      assignedTo: assignTo || getCurrentUserId(), sharedWith: shared, recurrence,
      reminder: reminder ? { enabled: true, minutesBefore: reminderMin } : { enabled: false } };
    if (reminder && dueDate && dueTime) {
      try { task.notificationId = await NotificationService.scheduleEventReminder({ id: Date.now().toString(), title: `Task: ${t}`, date: dueDate || todayKeyStr, time: dueTime, reminder: { enabled: true, minutesBefore: reminderMin } }); } catch (e) { logError('TasksScreen', e); }
    }
    haptics.success(); await TasksService.addTask(task);
    if (recurrence) { try { await TasksService.generateRecurringInstances(); } catch (e) { logError('TasksScreen', e); } }
    resetForm(); setShowAdd(false);
  }, [text, dueDate, dueTime, priority, assignTo, shareWith, reminder, reminderMin, recurring, recurDays, todayKeyStr]);

  const toggleShareWith = (uid: string) => setShareWith((prev: string[]) => prev.includes(uid) ? prev.filter((x: string) => x !== uid) : [...prev, uid]);

  // ── Section Header ──────────────────────────────────────
  const SectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={st.sectionHeader}>
      <View style={[st.sectionDot, { backgroundColor: section.color }]} />
      <Feather name={section.icon} size={12} color={section.color} style={st.mr6} />
      <AppText style={[st.sectionTitle, { color: section.color }]}>{section.title}</AppText>
      <AppText variant="caption" color="tertiary" style={st.ml8}>{section.data.length}</AppText>
    </View>
  );

  // Build flat list data with section headers
  const listData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const items: Array<{ key: string; card?: TaskCardVM; section?: { title: string }; type?: string }> = [];
    for (const section of vm.sections) {
      const filtered = q
        ? section.data.filter((card: TaskCardVM) => (card.text || card._raw?.title || '').toLowerCase().includes(q))
        : section.data;
      if (filtered.length === 0) continue;
      items.push({ type: 'section', key: `sec_${section.title}`, section: { ...section, data: filtered } });
      for (const card of filtered) {
        items.push({ type: 'task', key: card.id, card });
      }
    }
    return items;
  }, [vm.sections, searchQuery]);

  // Memoize list callbacks (FlashList/SmartList)
  const renderRow = useCallback(({ item }: { item: { key: string; card?: TaskCardVM; section?: { title: string }; type?: string } }) => {
    if (item.type === 'section') return <SectionHeader section={item.section} />;
    return <TaskCard card={item.card} others={others} onToggle={toggle} onDelete={del} />;
  }, [others, toggle, del]);

  // ── LAYOUT ──────────────────────────────────────────────
  return (
    <Screen>
      <Header title={vm.header.title} subtitle={vm.header.subtitle} />

      {/* Insight line */}
      {vm.header.insight && (
        <View style={{ paddingHorizontal: tokens.space.lg, marginBottom: 6 }}>
          <AppText variant="bodySm" color="tertiary" style={{ fontStyle: 'italic' }}>{vm.header.insight}</AppText>
        </View>
      )}

      {/* Search */}
      <View style={{ paddingHorizontal: tokens.space.lg, marginBottom: tokens.space.sm }}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search tasks..."
        />
      </View>

      {/* View toggle */}
      <View style={st.toggleBar}>
        {vm.toggles.map((t: { key: string; icon: string; label: string; active: boolean }) => (
          <TouchableOpacity
            key={t.key} onPress={() => { haptics.light(); setView(t.key as 'focus' | 'all' | 'done'); }}
            style={[st.toggleBtn, { backgroundColor: t.active ? theme.accent.primary : 'transparent' }]} activeOpacity={0.8}
            accessibilityRole="tab" accessibilityState={{ selected: t.active }}>
            <Feather name={t.icon} size={14} color={t.active ? theme.text.inverse : theme.text.secondary} style={st.mr6} />
            <AppText style={{ fontSize: 13, fontWeight: '600', color: t.active ? theme.text.inverse : theme.text.secondary }}>{t.label}</AppText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Task list with sections */}
      <SmartList style={{ flex: 1 }}
        data={listData}
        keyExtractor={(item: { key: string }) => item.key}
        estimatedItemSize={96}
        contentContainerStyle={{ paddingHorizontal: tokens.space.lg, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent.primary} colors={[theme.accent.primary]} />}
        renderItem={renderRow}
        ListEmptyComponent={
          <View style={st.empty}>
            <View style={[st.emptyIcon, { backgroundColor: theme.accent.primary + '12' }]}>
              <Feather name={vm.emptyState.icon} size={32} color={theme.accent.primary} />
            </View>
            <AppText variant="body" style={{ fontWeight: '700', marginTop: 14 }}>All clear</AppText>
            <AppText variant="bodySm" color="secondary" style={{ marginTop: 4, textAlign: 'center', maxWidth: 260 }}>{vm.emptyState.text}</AppText>
            <View style={st.emptyCategoryRow}>
              {[{ icon: 'heart', label: 'Health' }, { icon: 'home', label: 'Home' }, { icon: 'zap', label: 'Productivity' }, { icon: 'book-open', label: 'Self-Care' }].map((cat) => (
                <View key={cat.label} style={[st.emptyCategoryPill, { backgroundColor: theme.bg.subtle }]}>
                  <Feather name={cat.icon} size={12} color={theme.text.tertiary} />
                  <AppText style={{ fontSize: 11, color: theme.text.tertiary, marginLeft: 4 }}>{cat.label}</AppText>
                </View>
              ))}
            </View>
            <TouchableOpacity
              onPress={() => { haptics.medium(); setDueDate(todayKeyStr); setShowAdd(true); }}
              activeOpacity={0.85}
              style={[st.emptyAddBtn, { backgroundColor: theme.accent.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Add your first task"
            >
              <Feather name="plus" size={18} color="#FFF" />
              <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '600', marginLeft: 8 }}>Add a task</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={vm.footer ? (
          <TouchableOpacity
              accessibilityRole="button" onPress={() => confirmDestructive('Clear completed tasks?', 'This will remove all completed tasks from your list.', 'Clear', async () => { await TasksService.clearCompleted(); haptics.success(); })} style={{ alignSelf: 'center', marginTop: 12 }}
          activeOpacity={0.8}
        >
            <AppText variant="caption" color="secondary">{vm.footer.text}</AppText>
          </TouchableOpacity>
        ) : null}
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => { haptics.medium(); setDueDate(todayKeyStr); setShowAdd(true); }}
        activeOpacity={0.85} style={[st.fab, { backgroundColor: theme.accent.primary, bottom: Math.max(insets.bottom, 16) + 70 }]}
        accessibilityLabel="Add a task" accessibilityRole="button">
        <Feather name="plus" size={18} color="#FFF" />
        <AppText style={{ color: '#FFF', fontSize: 14, fontWeight: '600', marginLeft: 6 }}>New task</AppText>
      </TouchableOpacity>

      {/* Add task bottom sheet */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity
              accessibilityRole="button" accessibilityLabel="Close add task" accessibilityHint="Closes the add task sheet" style={st.overlay} activeOpacity={1} onPress={() => { Keyboard.dismiss(); setShowAdd(false); resetForm(); }} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
            style={[st.sheet, { backgroundColor: theme.bg.card, paddingBottom: Math.max(insets.bottom, 16) }]}
          >
          <View style={st.sheetHandle} />

          {/* Scrollable content so iOS keyboard never crushes layout */}
          <ScrollView style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            {/* Suggested tasks */}
            <View style={{ paddingHorizontal: tokens.space.lg, marginBottom: tokens.space.md }}>
              <AppText variant="caption" color="secondary" style={{ marginBottom: 10 }}>Quick add</AppText>
              {TASK_CATEGORIES.map((cat) => (
                <View key={cat.label} style={{ marginBottom: tokens.space.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Feather name={cat.icon as string} size={12} color={theme.text.tertiary} style={{ marginRight: 5 }} />
                    <AppText variant="caption" color="tertiary" style={{ fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>{cat.label}</AppText>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 6 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {cat.tasks.map((s) => (
                        <QuickAddChip
                          key={s.id}
                          title={s.title}
                          hint={s.hint}
                          repeating={!!s.preset?.recurring}
                          onPress={() => applySuggestedTask(s.id)}
                        />
                      ))}
                    </View>
                  </ScrollView>
                </View>
              ))}
            </View>

            {/* Main input */}
            <Input
              value={text}
              onChangeText={setText}
              placeholder="What needs doing?"
              autoFocus
              multiline
              style={{ marginHorizontal: tokens.space.lg, marginBottom: tokens.space.md }}
              inputStyle={{ minHeight: 56 }}
            />

            <View style={st.formSection}>
            <AppText variant="caption" color="secondary" style={st.formLabel}>When</AppText>
            <View style={st.pillRow}>
              {[{ label: 'Today', value: todayKeyStr }, { label: 'Tomorrow', value: fmtKey(new Date(Date.now() + 86400000)) }, { label: 'Next week', value: fmtKey(new Date(Date.now() + 7 * 86400000)) }].map((opt, idx) => (
                <TouchableOpacity
              accessibilityRole="button" key={`${opt.label}-${idx}`} onPress={() => { haptics.light(); setDueDate(opt.value); setRecurring(false); setRecurDays([]); }}
                  style={[st.datePill, { backgroundColor: dueDate === opt.value && !recurring ? theme.accent.light : theme.bg.subtle }]}
          activeOpacity={0.8}
        >
                  <AppText style={{ fontSize: 12, fontWeight: dueDate === opt.value && !recurring ? '600' : '400', color: dueDate === opt.value && !recurring ? theme.accent.primary : theme.text.secondary }}>{opt.label}</AppText>
                </TouchableOpacity>
              ))}
            </View>

            {/* Specific day of week (non-recurring only) */}
            {!recurring && (
              <>
                <AppText variant="caption" color="secondary" style={st.formLabelSpaced}>Pick a day</AppText>
                <View style={st.pillRow}>
                  {DAYS_OF_WEEK.map((d: { id: number; label: string }) => {
                    const nextDate = (() => {
                      const now = new Date();
                      const diff = (d.id - now.getDay() + 7) % 7 || 7;
                      const target = new Date(now);
                      target.setDate(target.getDate() + diff);
                      return fmtKey(target);
                    })();
                    const active = dueDate === nextDate && !recurring;
                    return (
                      <TouchableOpacity
              accessibilityRole="button"
                        key={d.id}
                        onPress={() => { haptics.light(); setDueDate(nextDate); setRecurring(false); setRecurDays([]); }}
                        style={[st.dayCircle, { backgroundColor: active ? theme.accent.primary : theme.bg.subtle }]}
                      
          activeOpacity={0.8}
        >
                        <AppText style={{ fontSize: 11, fontWeight: '600', color: active ? theme.text.inverse : theme.text.secondary }}>{d.label}</AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* Recurring toggle */}
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => {
                haptics.light();
                setRecurring((v: boolean) => {
                  const next = !v;
                  if (next) {
                    // Initialize weekly selection from current due date (if any)
                    try {
                      const d = dueDate ? new Date(dueDate + 'T00:00:00') : new Date();
                      setRecurDays([d.getDay()]);
                    } catch { setRecurDays([]); }
                  } else {
                    setRecurDays([]);
                  }
                  return next;
                });
              }}
              style={[st.remRow, { marginTop: 10 }]}
            
          activeOpacity={0.8}
        >
              <Feather name="repeat" size={14} color={recurring ? theme.accent.primary : theme.text.tertiary} />
              <AppText variant="body" style={{ flex: 1, marginLeft: 8 }}>Repeats weekly</AppText>
              <View style={[st.toggle, { backgroundColor: recurring ? theme.accent.primary : theme.bg.subtle }]}>
                <View style={[st.knob, { transform: [{ translateX: recurring ? 16 : 0 }] }]} />
              </View>
            </TouchableOpacity>

            {recurring && (
              <>
                <AppText variant="caption" color="secondary" style={st.formLabelSpaced}>Repeats on</AppText>
                <View style={[st.pillRow, { marginTop: 0 }]}>
                {DAYS_OF_WEEK.map((d: { id: number; label: string }) => {
                  const active = recurDays.includes(d.id);
                  return (
                    <TouchableOpacity
              accessibilityRole="button" key={d.id} onPress={() => { haptics.light(); setRecurDays((prev: number[]) => active ? prev.filter((x: number) => x !== d.id) : [...prev, d.id].sort()); }}
                      style={[st.dayCircle, { backgroundColor: active ? theme.accent.primary : theme.bg.subtle }]}
          activeOpacity={0.8}
        >
                      <AppText style={{ fontSize: 11, fontWeight: '600', color: active ? theme.text.inverse : theme.text.secondary }}>{d.label}</AppText>
                    </TouchableOpacity>
                  );
                })}
                </View>
              </>
            )}

            <View style={[st.pillRow, { marginTop: 8 }]}>
              <Input
                value={dueTime}
                onChangeText={setDueTime}
                placeholder="Time (e.g. 09:00)"
                keyboardType="numbers-and-punctuation"
                style={{ width: 150 }}
              />
            </View>
          </View>

          <View style={st.formSection}>
            <AppText variant="caption" color="secondary" style={st.formLabel}>Priority</AppText>
            <View style={st.pillRow}>
              {PRIS.map((p: { id: string; label: string; color: string }) => (
                <TouchableOpacity
              accessibilityRole="button" key={p.id} onPress={() => { haptics.light(); setPriority(p.id as PriorityId); }}
                  style={[st.datePill, { backgroundColor: priority === p.id ? p.color + '20' : theme.bg.subtle }]}
          activeOpacity={0.8}
        >
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: p.color, marginRight: 5 }} />
                  <AppText style={{ fontSize: 12, fontWeight: priority === p.id ? '600' : '400', color: priority === p.id ? p.color : theme.text.secondary }}>{p.label}</AppText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {others.length > 0 && (
            <View style={st.formSection}>
              <AppText variant="caption" color="secondary" style={st.formLabel}>Assign to</AppText>
              <View style={st.pillRow}>
                <TouchableOpacity
              accessibilityRole="button" onPress={() => { haptics.light(); setAssignTo(null); }}
                  style={[st.personPill, { backgroundColor: !assignTo ? theme.accent.light : theme.bg.subtle }]}
          activeOpacity={0.8}
        >
                  <Feather name="user" size={12} color={!assignTo ? theme.accent.primary : theme.text.tertiary} />
                  <AppText style={{ fontSize: 12, marginLeft: 4, fontWeight: !assignTo ? '600' : '400', color: !assignTo ? theme.accent.primary : theme.text.secondary }}>Me</AppText>
                </TouchableOpacity>
                {others.map((u: AppUser) => (
                  <TouchableOpacity
              accessibilityRole="button" key={u.id} onPress={() => { haptics.light(); setAssignTo(assignTo === u.id ? null : u.id); }}
                    style={[st.personPill, { backgroundColor: assignTo === u.id ? u.color + '20' : theme.bg.subtle }]}
          activeOpacity={0.8}
        >
                    <Avatar name={u.name} color={u.color} size={16} />
                    <AppText style={{ fontSize: 12, marginLeft: 4, fontWeight: assignTo === u.id ? '600' : '400', color: assignTo === u.id ? u.color : theme.text.secondary }}>{getFirstName(u.name)}</AppText>
                  </TouchableOpacity>
                ))}
              </View>
              <AppText variant="caption" color="secondary" style={st.formLabelSpaced}>Share with</AppText>
              <View style={st.pillRow}>
                {others.map((u: AppUser) => (
                  <TouchableOpacity
              accessibilityRole="button" key={u.id} onPress={() => { haptics.light(); toggleShareWith(u.id); }}
                    style={[st.personPill, { backgroundColor: shareWith.includes(u.id) ? u.color + '20' : theme.bg.subtle }]}
          activeOpacity={0.8}
        >
                    <Avatar name={u.name} color={u.color} size={16} />
                    <AppText style={{ fontSize: 12, marginLeft: 4, fontWeight: shareWith.includes(u.id) ? '600' : '400', color: shareWith.includes(u.id) ? u.color : theme.text.secondary }}>{getFirstName(u.name)}</AppText>
                    {shareWith.includes(u.id) && <Feather name="check" size={12} color={u.color} style={{ marginLeft: 4 }} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity
              accessibilityRole="button" onPress={() => { haptics.light(); setReminder((v: boolean) => !v); }} style={[st.remRow, { marginTop: 12 }]}
          activeOpacity={0.8}
        >
            <Feather name={reminder ? 'bell' : 'bell-off'} size={14} color={reminder ? theme.accent.primary : theme.text.tertiary} />
            <AppText variant="body" style={{ flex: 1, marginLeft: 8 }}>Reminder</AppText>
            <View style={[st.toggle, { backgroundColor: reminder ? theme.accent.primary : theme.bg.subtle }]}>
              <View style={[st.knob, { transform: [{ translateX: reminder ? 16 : 0 }] }]} />
            </View>
          </TouchableOpacity>
          {reminder && (
            <View style={[st.pillRow, { marginTop: 6 }]}>
              {REM_OPTS.map((r: { label: string; value: number }) => (
                <TouchableOpacity
              accessibilityRole="button" key={r.value} onPress={() => { haptics.light(); setReminderMin(r.value); }}
                  style={[st.datePill, { backgroundColor: reminderMin === r.value ? theme.accent.light : theme.bg.subtle }]}
          activeOpacity={0.8}
        >
                  <AppText style={{ fontSize: 12, color: reminderMin === r.value ? theme.accent.primary : theme.text.secondary }}>{r.label}</AppText>
                </TouchableOpacity>
              ))}
            </View>
          )}

            <TouchableOpacity
              accessibilityRole="button"
              onPress={addTask}
              disabled={!text.trim()}
              style={[st.addBtn, { backgroundColor: text.trim() ? theme.accent.primary : theme.bg.subtle, marginTop: 16 }]}
              activeOpacity={0.85}
            >
              <Feather name="plus" size={18} color={text.trim() ? theme.text.inverse : theme.text.tertiary} />
              <AppText style={{ marginLeft: 8, fontSize: 15, fontWeight: '600', color: text.trim() ? theme.text.inverse : theme.text.tertiary }}>Add task</AppText>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
        </View>
      </Modal>
    </Screen>
  );
}

const st = StyleSheet.create({
  toggleBar: { flexDirection: 'row', marginHorizontal: tokens.space.lg, marginBottom: tokens.space.sm, gap: 8 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: tokens.radius.pill },

  // Section headers
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingTop: tokens.space.lg, paddingBottom: tokens.space.sm },
  sectionDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },


  // Empty
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },

  pill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  fab: { position: 'absolute', right: tokens.space.lg, bottom: 24, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, height: 52, borderRadius: 26, ...tokens.shadow.lg },

  // Form section
  formSection: { marginTop: 12 },
  formLabel: { marginBottom: 6 },
  formLabelSpaced: { marginTop: 10, marginBottom: 6 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 8, maxHeight: '85%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(150,150,150,0.35)', alignSelf: 'center', marginBottom: 16 },
  mainInput: { fontSize: 16, paddingVertical: 8, borderBottomWidth: 1 },
  // Avoid `gap` (can be inconsistent with wrap on iOS). Spacing is applied on the pills instead.
  pillRow: { flexDirection: 'row', flexWrap: 'wrap' },
  datePill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: tokens.radius.pill, flexDirection: 'row', alignItems: 'center', marginRight: 8, marginBottom: 8 },
  dayCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginBottom: 8 },
  timeInput: { width: 70, paddingHorizontal: 10, paddingVertical: 6, borderRadius: tokens.radius.pill, fontSize: 12, textAlign: 'center' },
  personPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: tokens.radius.pill, marginRight: 8, marginBottom: 8 },
  remRow: { flexDirection: 'row', alignItems: 'center' },
  toggle: { width: 44, height: 26, borderRadius: 13, padding: 2 },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: tokens.radius.lg },
  // Suggested quick-add cards (premium look)
  suggestChip: {
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 176,
    maxWidth: 220,
    ...tokens.shadow.sm,
  },
  emptyCategoryRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 20, gap: 8 },
  emptyCategoryPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: tokens.radius.pill },
  emptyAddBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 14, borderRadius: tokens.radius.pill, marginTop: 20 },
  flex1: { flex: 1 },
  ml8: { marginLeft: 8 },
  mr6: { marginRight: 6 },
});