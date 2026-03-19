import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { reportError } from '../utils/reportError';

const BACKUP_TS_KEY = '@uandme/last_backup_ts';
const BACKUP_INTERVAL_MS = 1000 * 60 * 60 * 24; // 24 h

const DataBackupService = {
  async autoBackupIfNeeded(): Promise<void> {
    try {
      const lastStr = await AsyncStorage.getItem(BACKUP_TS_KEY);
      const last = lastStr ? parseInt(lastStr, 10) : 0;
      if (Date.now() - last < BACKUP_INTERVAL_MS) return;
      await this.performBackup();
    } catch (e) {
      reportError('DataBackupService.autoBackup', e);
    }
  },

  async performBackup(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const pairs = await AsyncStorage.multiGet(keys);
      const snapshot: Record<string, string | null> = {};
      for (const [k, v] of pairs) snapshot[k] = v;

      const dir = FileSystem.documentDirectory + 'backups/';
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const filename = `backup_${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(dir + filename, JSON.stringify(snapshot));
      await AsyncStorage.setItem(BACKUP_TS_KEY, String(Date.now()));

      // Keep only the last 3 backups
      const { exists } = await FileSystem.getInfoAsync(dir);
      if (exists) {
        const files = await FileSystem.readDirectoryAsync(dir);
        const sorted = files
          .filter((f) => f.startsWith('backup_') && f.endsWith('.json'))
          .sort();
        for (const old of sorted.slice(0, Math.max(0, sorted.length - 3))) {
          await FileSystem.deleteAsync(dir + old, { idempotent: true });
        }
      }
    } catch (e) {
      reportError('DataBackupService.performBackup', e);
    }
  },
};

export default DataBackupService;
