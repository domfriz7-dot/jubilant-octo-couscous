import React from 'react';
import { FlatList, FlatListProps } from 'react-native';

/**
 * SmartList
 *
 * Wrapper that will use @shopify/flash-list in production builds (EAS Build)
 * where the native AutoLayoutView module is linked. In Expo Go, FlashList's
 * native module is NOT available and will crash with:
 *   "Invariant Violation: View config not found for component 'AutoLayoutView'"
 *
 * For now we always use FlatList. When you switch to a dev-client or
 * production build, flip USE_FLASHLIST to true.
 */

const USE_FLASHLIST = false; // flip to true once using EAS dev-client

let FlashListComponent: React.ComponentType<Record<string, unknown>> | null = null;

if (USE_FLASHLIST) {
  try {
    FlashListComponent = require('@shopify/flash-list').FlashList;
  } catch {
    // package not installed
    // Intentionally ignored — non-critical failure
  }
}

type SmartListProps<T> = FlatListProps<T> & {
  /** Required for FlashList: estimated average item height in pixels. */
  estimatedItemSize?: number;
};

export default function SmartList<T>(props: SmartListProps<T>) {
  const { estimatedItemSize = 80, ...rest } = props as Record<string, unknown>;

  if (FlashListComponent) {
    return <FlashListComponent estimatedItemSize={estimatedItemSize} {...rest} />;
  }

  return <FlatList {...(rest as FlatListProps<T>)} />;
}
