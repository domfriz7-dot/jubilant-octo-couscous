import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@uandme_wallpaper_v1';

export type Wallpaper = {
  id: string;
  name: string;
  colors: string[] | null;
};

export const WALLPAPERS: Wallpaper[] = [
  { id: 'none',      name: 'None',      colors: null },
  { id: 'aurora',    name: 'Aurora',    colors: ['#0EA5E9', '#A78BFA', '#F472B6'] },
  { id: 'midnight',  name: 'Midnight',  colors: ['#0B1020', '#1F2A44', '#5B21B6'] },
  { id: 'peach',     name: 'Peach',     colors: ['#FB7185', '#FDBA74', '#FDE68A'] },
  { id: 'ocean',     name: 'Ocean',     colors: ['#06B6D4', '#3B82F6', '#1D4ED8'] },
  { id: 'matcha',    name: 'Matcha',    colors: ['#10B981', '#A7F3D0', '#FDE68A'] },
  { id: 'dusk',      name: 'Dusk',      colors: ['#6366F1', '#A855F7', '#EC4899'] },
  { id: 'sand',      name: 'Sand',      colors: ['#D4A574', '#C4956A', '#B8876B'] },
  { id: 'forest',    name: 'Forest',    colors: ['#065F46', '#047857', '#10B981'] },
];

/**
 * Returns the active wallpaper object, or null if 'none'/unset.
 */
export async function getWallpaper(): Promise<Wallpaper | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj?.id || obj.id === 'none') return null;
    const found = WALLPAPERS.find((w: { id: string }) => w.id === obj.id);
    return found?.colors ? found : null;
  } catch {
    return null;
  }
}

/**
 * Returns the raw wallpaper ID (including 'none') for the selection UI.
 */
export async function getWallpaperId(): Promise<string> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return 'none';
    const obj = JSON.parse(raw);
    return obj?.id || 'none';
  } catch {
    return 'none';
  }
}

export async function setWallpaper(id: string): Promise<Wallpaper | null> {
  const found = WALLPAPERS.find((w: { id: string }) => w.id === id);
  if (!found) return null;
  await AsyncStorage.setItem(KEY, JSON.stringify({ id: found.id }));
  return found.colors ? found : null;
}

export async function clearWallpaper() {
  await AsyncStorage.setItem(KEY, JSON.stringify({ id: 'none' }));
}
