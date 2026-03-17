// expo-sqlite v15 mock (Expo SDK 54)
// Matches the async API: openDatabaseAsync / execAsync / getAllAsync /
// getFirstAsync / runAsync / withTransactionAsync
//
// CalendarService._initDb will fail gracefully (table won't exist),
// so getEvents() falls back to AsyncStorage — which is what the tests mock.

const mockDb = {
  execAsync: async () => {},
  getAllAsync: async () => [],
  getFirstAsync: async () => ({ c: 0 }),
  runAsync: async () => ({ lastInsertRowId: 0, changes: 0 }),
  withTransactionAsync: async (fn) => {
    try { await fn(); } catch (_) {}
  },
};

module.exports = {
  openDatabaseAsync: async () => mockDb,
};
