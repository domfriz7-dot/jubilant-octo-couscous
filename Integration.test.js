import SettingsService from '../src/services/SettingsService';
import SnapshotService from '../src/services/SnapshotService';
import CalendarService from '../src/services/CalendarService';

jest.mock('expo-sqlite');
jest.mock('../src/services/NativeCalendarSync', () => ({
  __esModule: true,
  default: {
    syncEvent: async () => {},
    removeEvent: async () => {},
  },
}));

// NOTE: These are "critical flow" smoke tests.
// They intentionally avoid rendering UI (fast, stable, CI-friendly).

describe('Critical flows (services smoke)', () => {
  beforeEach(async () => {
    // Reset persisted state between tests
    await SettingsService.resetToDefaults();
    await CalendarService.clearAll();
  });

  test('Settings roundtrip respects canonical schema', async () => {
    const defaults = await SettingsService.getSettings();
    expect(defaults).toBeTruthy();

    // Toggle a couple known fields (exists in canonical schema)
    await SettingsService.updateSetting('dailyDigest', true);
    await SettingsService.updateSetting('eventReminders', false);

    const updated = await SettingsService.getSettings();
    expect(updated.dailyDigest).toBe(true);
    expect(updated.eventReminders).toBe(false);

    // Attempt to write a non-existent key should be ignored (no drift)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (SettingsService as any).updateSettings({ madeUpKey: true });

    const after = await SettingsService.getSettings();
    expect((after as any).madeUpKey).toBeUndefined();
  });

  test('Calendar event add -> snapshot reflects it', async () => {
    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const created = await CalendarService.addEvent({
      title: 'Test date night',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      location: 'Somewhere',
      notes: 'Bring snacks',
      attendees: [],
      reminderMinutes: 30,
      tags: ['date'],
    });

    expect(created?.id).toBeTruthy();

    const snap = await SnapshotService.getSnapshot();
    expect(snap).toBeTruthy();
    expect(Array.isArray(snap.calendar?.events)).toBe(true);

    const found = snap.calendar.events.find((e: any) => e.id === created.id);
    expect(found?.title).toBe('Test date night');
  });
});
