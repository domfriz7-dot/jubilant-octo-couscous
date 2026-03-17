/**
 * Minimal AsyncStorage mock for Jest.
 * In-memory key-value store that resets between test suites.
 */
let store = {};

const AsyncStorage = {
  getItem: jest.fn(async (key) => {
    return store[key] ?? null;
  }),

  setItem: jest.fn(async (key, value) => {
    store[key] = value;
  }),

  removeItem: jest.fn(async (key) => {
    delete store[key];
  }),

  multiSet: jest.fn(async (pairs) => {
    for (const [key, value] of pairs) {
      store[key] = value;
    }
  }),

  multiGet: jest.fn(async (keys) => {
    return keys.map((key) => [key, store[key] ?? null]);
  }),

  clear: jest.fn(async () => {
    store = {};
  }),

  getAllKeys: jest.fn(async () => Object.keys(store)),

  // Test helper — reset store between tests
  __resetStore: () => { store = {}; },
  __getStore: () => ({ ...store }),
};

module.exports = AsyncStorage;
