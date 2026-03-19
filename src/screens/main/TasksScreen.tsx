import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { useAwardXP } from '../../app/context/XPContext';

const TASKS_KEY = '@uandme/tasks';

interface Task {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
}

function isFirebaseConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_FIREBASE_API_KEY);
}

// ─── useTasks ─────────────────────────────────────────────────────────────────

function useTasks() {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [uid, setUid] = React.useState<string | null>(null);
  // Track whether Firestore listener has taken over from AsyncStorage
  const firestoreActive = useRef(false);

  // 1. Load from AsyncStorage immediately for fast first render
  useEffect(() => {
    AsyncStorage.getItem(TASKS_KEY)
      .then((v) => {
        if (v && !firestoreActive.current) setTasks(JSON.parse(v));
      })
      .catch((e) => reportError('TasksScreen.load', e));
  }, []);

  // 2. Watch auth state to get uid
  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    let authUnsub: (() => void) | undefined;
    (async () => {
      try {
        const { getAuth, onAuthStateChanged } = await import('firebase/auth');
        authUnsub = onAuthStateChanged(getAuth(), (user) => setUid(user?.uid ?? null));
      } catch (e) {
        reportError('TasksScreen.auth', e);
      }
    })();
    return () => authUnsub?.();
  }, []);

  // 3. Real-time Firestore listener — replaces AsyncStorage as source of truth
  useEffect(() => {
    if (!uid || !isFirebaseConfigured()) return;
    let alive = true;
    let unsub: () => void = () => {};

    (async () => {
      try {
        const { getFirestore, collection, query, orderBy, onSnapshot } = await import('firebase/firestore');
        if (!alive) return;
        firestoreActive.current = true;

        unsub = onSnapshot(
          query(collection(getFirestore(), 'users', uid, 'tasks'), orderBy('createdAt', 'asc')),
          (snap) => {
            const remote = snap.docs.map((d) => d.data() as Task);
            setTasks(remote);
            AsyncStorage.setItem(TASKS_KEY, JSON.stringify(remote)).catch(() => {});
          },
          (err) => reportError('TasksScreen.subscribe', err)
        );
      } catch (e) {
        reportError('TasksScreen.subscribe.init', e);
      }
    })();

    return () => {
      alive = false;
      firestoreActive.current = false;
      unsub();
    };
  }, [uid]);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const saveLocal = useCallback((next: Task[]) => {
    setTasks(next);
    AsyncStorage.setItem(TASKS_KEY, JSON.stringify(next)).catch((e) => reportError('TasksScreen.save', e));
  }, []);

  const add = useCallback(async (text: string) => {
    const task: Task = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text,
      done: false,
      createdAt: new Date().toISOString(),
    };

    if (uid && isFirebaseConfigured()) {
      try {
        const { getFirestore, doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(getFirestore(), 'users', uid, 'tasks', task.id), task);
        // Firestore listener updates state
      } catch (e) {
        reportError('TasksScreen.add', e);
        // Fallback to local
        setTasks((prev) => {
          const next = [...prev, task];
          AsyncStorage.setItem(TASKS_KEY, JSON.stringify(next)).catch(() => {});
          return next;
        });
      }
    } else {
      saveLocal([...tasks, task]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, tasks, saveLocal]);

  const toggle = useCallback(async (id: string): Promise<boolean> => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return false;
    const willComplete = !task.done;

    if (uid && isFirebaseConfigured()) {
      try {
        const { getFirestore, doc, updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(getFirestore(), 'users', uid, 'tasks', id), { done: willComplete });
      } catch (e) {
        reportError('TasksScreen.toggle', e);
        setTasks((prev) => {
          const next = prev.map((t) => t.id === id ? { ...t, done: !t.done } : t);
          AsyncStorage.setItem(TASKS_KEY, JSON.stringify(next)).catch(() => {});
          return next;
        });
      }
    } else {
      saveLocal(tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t));
    }
    return willComplete;
  }, [uid, tasks, saveLocal]);

  const remove = useCallback(async (id: string) => {
    if (uid && isFirebaseConfigured()) {
      try {
        const { getFirestore, doc, deleteDoc } = await import('firebase/firestore');
        await deleteDoc(doc(getFirestore(), 'users', uid, 'tasks', id));
      } catch (e) {
        reportError('TasksScreen.remove', e);
        saveLocal(tasks.filter((t) => t.id !== id));
      }
    } else {
      saveLocal(tasks.filter((t) => t.id !== id));
    }
  }, [uid, tasks, saveLocal]);

  return { tasks, add, toggle, remove };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TasksScreen(): JSX.Element {
  const { theme } = useAppTheme();
  const { top } = useSafeAreaInsets();
  const { tasks, add, toggle, remove } = useTasks();
  const awardXP = useAwardXP();
  const [input, setInput] = useState('');

  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  const handleAdd = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    await add(text);
  };

  const handleToggle = async (id: string) => {
    const completed = await toggle(id);
    if (completed) {
      awardXP(5, 'Completed a task').catch(() => {});
    }
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
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
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
            onPress={() => handleToggle(item.id)}
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
    width: 36,
    height: 36,
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
