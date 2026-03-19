/**
 * PlacesKeyService
 *
 * Simple persistence for a Google Places API key.
 * - Stored locally (AsyncStorage)
 * - Applied to in-memory config via setPlacesApiKey
 *
 * This keeps the app "no-backend" friendly while letting
 * you enable nearby venues in Autopilot/Tonight without
 * hardcoding keys in source.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { setPlacesApiKey, getPlacesConfig } from '../config/places';

const KEY = '@uandme_places_api_key_v1';

async function init() {
  // If the key is already provided via env/config, don't override it.
  const cfg = getPlacesConfig();
  if (cfg?.apiKey) return cfg.apiKey;

  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) setPlacesApiKey(raw);
    return raw || '';
  } catch {
    return '';
  }
}

async function getKey() {
  const cfg = getPlacesConfig();
  if (cfg?.apiKey) return cfg.apiKey;
  try {
    return (await AsyncStorage.getItem(KEY)) || '';
  } catch {
    return '';
  }
}

async function setKey(next) {
  const v = (next || '').trim();
  setPlacesApiKey(v);
  try {
    if (!v) await AsyncStorage.removeItem(KEY);
    else await AsyncStorage.setItem(KEY, v);
  } catch {
    // ignore
    // Intentionally ignored — non-critical failure
  }
  return v;
}

export default { init, getKey, setKey };
