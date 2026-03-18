import React, { useState, useCallback } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../ui/theme/ThemeProvider';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOW, PALETTE } from '../../ui/theme/tokens';
import { reportError } from '../../utils/reportError';

const TASKS_KEY = '@uandme/tasks';

interface Task {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
}

function useTasks() {
  const [tasks, setTasks] = React.useState<Task[]>([]);

  React.useEffect(() => {
    AsyncStorage.getItem(TASKS_KEY)
      .then((v) => { if (v) setTasks(JSON.parse(v)); })
      .catch((e) => reportError('TasksScreen.load', e));
  }, []);

  const save = useCallback((next: Task[]) => {
    setTasks(next);
    AsyncStorage.setItem(TASKS_KEY, JSON.stringify(next)).catch((e) => reportError('TasksScreen.save', e));
  }, []);

  const add = useCallback((text: string) => {
    save([
      ...tasks,
      { id: `task_${Date.now()}`, text, done: false, createdAt: new Date().toISOString() },
    ]);
  }, [tasks, save]);

  const toggle = useCallback((id: string) => {
    save(tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  }, [tasks, save]);

  const remove = useCallback((id: string) => {
    save(tasks.filter((t) => t.id !== id));
  }, [tasks, save]);

  return { tasks, add, toggle, remove };
}

export default function TasksScreen(): JSX.Element {
  const { theme } = useAppTheme();
  const { top } = useSafeAreaInsets();
  const { tasks, add, toggle, remove } = useTasks();
  const [input, setInput] = useState('');

  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  const handleAdd = () => {
    const text = input.trim();
    if (!text) return;
    add(text);
    setInput('');
  };

  const handleLongPress = (id: string) => {
    Alert.alert('Delete task?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(id) },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg.default }]}>
      <LinearGradient
        colors={theme.gradient.primary}
        style={[styles.header, { paddingTop: top + SPACING.lg }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.title}>Tasks</Text>
        <Text style={styles.subtitle}>
          {pending.length} remaining
        </Text>
      </LinearGradient>

      {/* Input */}
      <View style={[styles.inputRow, { backgroundColor: theme.bg.card, borderColor: theme.border.default }]}>
        <TextInput
          style={[styles.input, { color: theme.text.primary }]}
          value={input}
          onChangeText={setInput}
          placeholder="Add a task…"
          placeholderTextColor={theme.text.tertiary}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />
        <TouchableOpacity
          onPress={handleAdd}
          style={[styles.addBtn, { backgroundColor: theme.primary, opacity: input.trim() ? 1 : 0.4 }]}
          disabled={!input.trim()}
          accessibilityLabel="Add task"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={20} color={PALETTE.white} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={[...pending, ...done]}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>✅</Text>
            <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
              All clear! Add a task above.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.taskCard, { backgroundColor: theme.bg.card, borderColor: theme.border.default }, SHADOW.sm]}
            onPress={() => toggle(item.id)}
            onLongPress={() => handleLongPress(item.id)}
            activeOpacity={0.8}
          >
            <View style={[
              styles.checkbox,
              { borderColor: item.done ? theme.success : theme.border.default },
              item.done && { backgroundColor: theme.success },
            ]}>
              {item.done && <Ionicons name="checkmark" size={14} color={PALETTE.white} />}
            </View>
            <Text style={[
              styles.taskText,
              { color: item.done ? theme.text.tertiary : theme.text.primary },
              item.done && styles.taskDone,
            ]}>
              {item.text}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: SPACING.screen, paddingBottom: SPACING.lg },
  title: { ...TYPOGRAPHY.heading, color: PALETTE.white },
  subtitle: { ...TYPOGRAPHY.caption, marginTop: 2, color: 'rgba(255,255,255,0.75)' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.screen,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  input: { flex: 1, ...TYPOGRAPHY.body },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingHorizontal: SPACING.screen, paddingBottom: 100, gap: SPACING.sm },
  emptyBox: { alignItems: 'center', paddingVertical: SPACING.xxxl, gap: SPACING.md },
  emptyEmoji: { fontSize: 44 },
  emptyText: { ...TYPOGRAPHY.body },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskText: { ...TYPOGRAPHY.body, flex: 1 },
  taskDone: { textDecorationLine: 'line-through' },
});
