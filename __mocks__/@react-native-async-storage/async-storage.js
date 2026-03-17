// Jest manual mock for @react-native-async-storage/async-storage.
// Backed by a plain in-memory Map so tests can read/write without touching
// any real storage.  Each test file gets a fresh store via jest.resetModules()
// or by calling AsyncStorage.clear() in a beforeEach.

const store = new Map();

const AsyncStorage = {
  setItem: jest.fn((key, value) => {
    store.set(key, value);
    return Promise.resolve();
  }),

  getItem: jest.fn((key) => {
    return Promise.resolve(store.has(key) ? store.get(key) : null);
  }),

  removeItem: jest.fn((key) => {
    store.delete(key);
    return Promise.resolve();
  }),

  clear: jest.fn(() => {
    store.clear();
    return Promise.resolve();
  }),

  getAllKeys: jest.fn(() => {
    return Promise.resolve([...store.keys()]);
  }),

  multiGet: jest.fn((keys) => {
    return Promise.resolve(keys.map((k) => [k, store.get(k) ?? null]));
  }),

  multiSet: jest.fn((pairs) => {
    pairs.forEach(([k, v]) => store.set(k, v));
    return Promise.resolve();
  }),

  multiRemove: jest.fn((keys) => {
    keys.forEach((k) => store.delete(k));
    return Promise.resolve();
  }),

  mergeItem: jest.fn((key, value) => {
    const existing = store.get(key);
    if (existing) {
      try {
        const merged = JSON.stringify({
          ...JSON.parse(existing),
          ...JSON.parse(value),
        });
        store.set(key, merged);
      } catch {
        store.set(key, value);
      }
    } else {
      store.set(key, value);
    }
    return Promise.resolve();
  }),

  multiMerge: jest.fn((pairs) => {
    pairs.forEach(([k, v]) => AsyncStorage.mergeItem(k, v));
    return Promise.resolve();
  }),
};

export default AsyncStorage;
