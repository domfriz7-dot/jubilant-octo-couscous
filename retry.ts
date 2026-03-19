import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import { safeJsonParse, safeZodParse } from './json';
import type { Result } from '../types/result';
import { ok } from '../types/result';
import { logError } from '../services/logger';

/**
 * Safe AsyncStorage JSON helpers:
 * - Never throws on malformed JSON
 * - Validates with Zod at the boundary
 * - Returns a caller-provided default on invalid/missing data
 */
export async function readJsonWithSchema<T>(
  key: string,
  // Use the broader ZodType signature so callers don't need double-casts.
  schema: z.ZodType<T, any, any>,
  defaultValue: T,
  name?: string
): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return defaultValue;

    const parsed = safeJsonParse<unknown>(raw);
    if (!parsed.ok) return defaultValue;

    const validated = safeZodParse(schema, parsed.value, name ?? key);
    if (!validated.ok) return defaultValue;

    return validated.value as T;
  } catch (e) {
    logError('storage.readJsonWithSchema', e);
    return defaultValue;
  }
}

export async function writeJson<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    logError('storage.writeJson', e);
  }
}

export async function removeKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    logError('storage.removeKey', e);
  }
}
