// src/services/IdentityService.ts
// Central place for "current user" identity.
//
// IMPORTANT:
// Do NOT return a hardcoded id (e.g. "1"). When you add backend/auth, every
// device would collide on the same user record.
//
// Strategy:
// - Generate a UUID once per install.
// - Persist it to AsyncStorage.
// - Cache it in-memory for synchronous reads.
//
// Call `initIdentity()` once during app bootstrap (App.tsx) before any services
// create data keyed by user id.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Result } from '../types/result';
import { ok, err, unwrapOrThrow } from '../types/result';

const STORAGE_KEY = '@uandme_device_uuid_v1';
const AUTH_UID_KEY = '@uandme_auth_uid_v1';

let cachedId: string | null = null;
let initPromise: Promise<string> | null = null;

// Keep the device id so we can fall back when signed out.
let cachedDeviceId: string | null = null;

function uuidV4(): string {
  // RFC4122-ish UUID using Math.random (sufficient for a local install id)
  // eslint-disable-next-line no-bitwise
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function initIdentity(): Promise<string> {
  return unwrapOrThrow(await initIdentityResult());
}

export async function initIdentityResult(): Promise<Result<string>> {
  if (cachedId) return ok(cachedId);
  if (initPromise) return ok(await initPromise);

  initPromise = (async () => {
    try {
      // Prefer authenticated uid if previously set.
      const authUid = await AsyncStorage.getItem(AUTH_UID_KEY);
      if (authUid && typeof authUid === 'string') {
        cachedId = authUid;
        return authUid;
      }

      const existing = await AsyncStorage.getItem(STORAGE_KEY);
      if (existing && typeof existing === 'string') {
        cachedId = existing;
        cachedDeviceId = existing;
        return existing;
      }
      const created = uuidV4();
      await AsyncStorage.setItem(STORAGE_KEY, created);
      cachedId = created;
      cachedDeviceId = created;
      return created;
    } catch {
      // Last-resort fallback: still provide a stable in-memory id for this session.
      const fallback = cachedId ?? uuidV4();
      cachedId = fallback;
      cachedDeviceId = cachedDeviceId ?? fallback;
      return fallback;
    } finally {
      initPromise = null;
    }
  })();

  try {
    return ok(await initPromise);
  } catch (e) {
    return err('Failed to initialize identity', 'STORAGE', { cause: e });
  }
}

export async function ensureIdentity(): Promise<string> {
  return cachedId ?? initIdentity();
}

export function getCurrentUserId(): string {
  // Synchronous getter for hot paths.
  // Bootstrap must call initIdentity() first to guarantee this is populated.
  return cachedId ?? 'unknown';
}

export async function setAuthenticatedUserId(uid: string): Promise<void> {
  cachedId = uid;
  try {
    await AsyncStorage.setItem(AUTH_UID_KEY, uid);
  } catch {
    // non-fatal
    // Intentionally ignored — non-critical failure
  }
}

export async function clearAuthenticatedUserId(): Promise<void> {
  try {
    await AsyncStorage.removeItem(AUTH_UID_KEY);
  } catch {
    // non-fatal
    // Intentionally ignored — non-critical failure
  }
  // Revert to device id if we have it.
  if (cachedDeviceId) {
    cachedId = cachedDeviceId;
  } else {
    cachedId = null;
  }
}
