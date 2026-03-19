import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_STORAGE = '@uandme/google_places_key';
let _key: string | null = null;

const PlacesKeyService = {
  async init(): Promise<void> {
    // Prefer the env var; fall back to user-supplied key stored in AsyncStorage.
    const envKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (envKey) {
      _key = envKey;
      return;
    }
    const stored = await AsyncStorage.getItem(KEY_STORAGE).catch(() => null);
    if (stored) _key = stored;
  },

  getKey(): string | null {
    return _key;
  },

  async saveUserKey(key: string): Promise<void> {
    _key = key;
    await AsyncStorage.setItem(KEY_STORAGE, key);
  },
};

export default PlacesKeyService;
