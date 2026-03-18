import AsyncStorage from '@react-native-async-storage/async-storage';
import { reportError } from '../utils/reportError';

const MIGRATION_VERSION_KEY = '@uandme/migration_version';
const CURRENT_VERSION = 3;

interface IntegrityResult {
  ok: boolean;
  issues: string[];
}

type Migration = { version: number; up: () => Promise<void> };

const migrations: Migration[] = [
  {
    version: 1,
    async up() {
      // v0 → v1: rename legacy key
      const old = await AsyncStorage.getItem('calendar_events');
      if (old) {
        await AsyncStorage.setItem('@uandme/events', old);
        await AsyncStorage.removeItem('calendar_events');
      }
    },
  },
  {
    version: 2,
    async up() {
      // v1 → v2: ensure every event has a sharedWith array
      const raw = await AsyncStorage.getItem('@uandme/events');
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const events = parsed as Record<string, unknown>[];
      const updated = events.map((e) => ({ sharedWith: [], ...e }));
      await AsyncStorage.setItem('@uandme/events', JSON.stringify(updated));
    },
  },
  {
    version: 3,
    async up() {
      // v2 → v3: add xp field to user profile if missing
      const raw = await AsyncStorage.getItem('@uandme/profile');
      if (!raw) return;
      const profile = JSON.parse(raw);
      if (profile.xp == null) {
        await AsyncStorage.setItem('@uandme/profile', JSON.stringify({ xp: 0, level: 1, ...profile }));
      }
    },
  },
];

export async function runMigrations(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(MIGRATION_VERSION_KEY);
    const currentVersion = stored ? parseInt(stored, 10) : 0;

    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        await migration.up();
        await AsyncStorage.setItem(MIGRATION_VERSION_KEY, String(migration.version));
      }
    }
  } catch (e) {
    reportError('StorageMigration', e);
  }
}

export async function checkDataIntegrity(): Promise<IntegrityResult> {
  const issues: string[] = [];
  try {
    const eventsRaw = await AsyncStorage.getItem('@uandme/events');
    if (eventsRaw) {
      const events = JSON.parse(eventsRaw);
      if (!Array.isArray(events)) issues.push('events: not an array');
    }
  } catch (e) {
    issues.push(`events: parse error — ${String(e)}`);
  }
  return { ok: issues.length === 0, issues };
}
