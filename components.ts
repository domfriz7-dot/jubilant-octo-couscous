// Global ambient declarations used across the app.
// Keep this file tiny and intentional.

declare const __DEV__: boolean;

// Expo injects process.env for EXPO_PUBLIC_* at build time.
// Node typings cover this in most setups, but keep a fallback for safety.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const process: { env: Record<string, string | undefined> };
