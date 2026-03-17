type ProcessLike = { env?: Record<string, unknown> };

function readEnvRaw(key: string): unknown {
  // Metro inlines EXPO_PUBLIC_* vars at build-time, but during runtime we may also
  // have a global process shim depending on environment.
  try {
    const v = (process.env as Record<string, string | undefined>)?.[key];
    if (v !== undefined) return v;
  } catch {
    // ignore
    // Intentionally ignored — non-critical failure
  }

  try {
    const g = globalThis as unknown as { process?: ProcessLike };
    return g?.process?.env?.[key];
  } catch {
    // ignore
    // Intentionally ignored — non-critical failure
  }

  return undefined;
}

export function optionalEnv(key: string): string {
  const raw = readEnvRaw(key);
  return typeof raw === 'string' ? raw.trim() : '';
}

export function requireEnv(key: string): string {
  const v = optionalEnv(key);
  if (!v) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      throw new Error(`Missing env var: ${key}`);
    }
    return '';
  }
  return v;
}
