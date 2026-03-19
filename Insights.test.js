// Lightweight mock for expo-sqlite.
// We intentionally force SQL calls to fail so CalendarService falls back to AsyncStorage.

function openDatabase() {
  return {
    transaction: (cb, onError, onSuccess) => {
      try {
        cb({
          executeSql: (_sql, _params, _onSuccess, onFailure) => {
            if (onFailure) onFailure(null, new Error('sqlite mocked: disabled'));
            return false;
          },
        });
        if (onSuccess) onSuccess();
      } catch (e) {
        if (onError) onError(e);
      }
    },
  };
}

module.exports = { openDatabase };
