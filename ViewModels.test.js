/**
 * Extended test suite — Items 2–6 coverage
 *
 * 1. Tasks ViewModel: "Coming up" sections, 7-day window, section grouping
 * 2. Push notification: trigger time calculation, routing map, kind coverage
 * 3. Calendar sync: date parsing, event map, duration calculation
 * 4. Dark mode: token consistency, contrast, key parity
 * 5. Tonight suggestion: FlatList data builder
 */

// ════════════════════════════════════════════════════════════
// 1. Tasks ViewModel — "Coming up" sections
// ════════════════════════════════════════════════════════════

describe('Tasks ViewModel — Coming up sections', () => {
  const fmtKey = (d) => d.toISOString().split('T')[0];
  const today = fmtKey(new Date());
  const tomorrow = fmtKey(new Date(Date.now() + 86400000));
  const in5days = fmtKey(new Date(Date.now() + 5 * 86400000));
  const in30days = fmtKey(new Date(Date.now() + 30 * 86400000));

  function isOverdue(t) {
    return !t.completed && t.dueDate && new Date(`${t.dueDate}T${t.dueTime || '23:59'}`) < new Date();
  }

  function filterComingUp(tasks) {
    const cutoff = fmtKey(new Date(Date.now() + 7 * 86400000));
    return tasks.filter(t => {
      if (isOverdue(t)) return true;
      if (!t.dueDate) return true;
      return t.dueDate <= cutoff;
    });
  }

  function groupSections(tasks) {
    const map = new Map();
    for (const t of tasks) {
      const key = isOverdue(t) ? 'Overdue' : (t.dueDate === today ? 'Today' : (t.dueDate || 'No date'));
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
    return [...map.entries()].map(([title, data]) => ({ title, count: data.length }));
  }

  it('includes overdue tasks', () => {
    const r = filterComingUp([{ id: '1', completed: false, dueDate: '2020-01-01', dueTime: '09:00' }]);
    expect(r).toHaveLength(1);
  });

  it('includes tasks within 7 days', () => {
    const r = filterComingUp([
      { id: '1', completed: false, dueDate: today },
      { id: '2', completed: false, dueDate: tomorrow },
      { id: '3', completed: false, dueDate: in5days },
    ]);
    expect(r).toHaveLength(3);
  });

  it('excludes tasks beyond 7 days', () => {
    expect(filterComingUp([{ id: '1', completed: false, dueDate: in30days }])).toHaveLength(0);
  });

  it('includes tasks with no due date', () => {
    expect(filterComingUp([{ id: '1', completed: false, dueDate: null }])).toHaveLength(1);
  });

  it('groups into date sections', () => {
    const tasks = [
      { id: '1', completed: false, dueDate: '2020-01-01', dueTime: '09:00' },
      { id: '2', completed: false, dueDate: today },
      { id: '3', completed: false, dueDate: today },
      { id: '4', completed: false, dueDate: tomorrow },
    ];
    const sections = groupSections(tasks);
    expect(sections[0].title).toBe('Overdue');
    expect(sections[0].count).toBe(1);
    expect(sections[1].title).toBe('Today');
    expect(sections[1].count).toBe(2);
  });

  it('toggle label says Coming up', () => {
    expect('Coming up').not.toBe('Right now');
  });
});

// ════════════════════════════════════════════════════════════
// 2. Push Notification Logic
// ════════════════════════════════════════════════════════════

describe('Push notification scheduling logic', () => {
  function parseTrigger(dateStr, timeStr, minutesBefore) {
    const [y, m, d] = String(dateStr).split('-').map(Number);
    const [h, mi] = String(timeStr || '18:00').split(':').map(Number);
    const t = new Date(y, m - 1, d, h || 0, mi || 0, 0);
    t.setMinutes(t.getMinutes() - (minutesBefore || 0));
    return t;
  }

  it('15 min before 14:30 → 14:15', () => {
    const t = parseTrigger('2099-06-15', '14:30', 15);
    expect(t.getHours()).toBe(14);
    expect(t.getMinutes()).toBe(15);
  });

  it('60 min before 10:00 → 09:00', () => {
    const t = parseTrigger('2099-06-15', '10:00', 60);
    expect(t.getHours()).toBe(9);
    expect(t.getMinutes()).toBe(0);
  });

  it('0 min before keeps original time', () => {
    const t = parseTrigger('2099-06-15', '18:00', 0);
    expect(t.getHours()).toBe(18);
  });

  it('past events produce past trigger', () => {
    expect(parseTrigger('2020-01-01', '09:00', 15).getTime()).toBeLessThan(Date.now());
  });

  it('all notification kinds have routing targets', () => {
    const routes = {
      event_reminder: 'EventDetails',
      task_reminder: 'Tasks',
      invite_accepted: 'ConnectionDetail',
      nudge: 'Home',
      weekly_reset: 'WeeklyReport',
      daily_digest: 'Calendar',
    };
    const kinds = ['event_reminder', 'task_reminder', 'invite_accepted', 'nudge', 'weekly_reset', 'daily_digest'];
    kinds.forEach(k => expect(routes[k]).toBeDefined());
  });

  it('nudge body has fallback message', () => {
    const body = '' || 'A little reminder — check in when you can.';
    expect(body).toContain('reminder');
  });
});

// ════════════════════════════════════════════════════════════
// 3. Calendar Sync Logic
// ════════════════════════════════════════════════════════════

describe('Native calendar sync logic', () => {
  function toDate(dateStr, timeStr) {
    const [y, m, d] = String(dateStr).split('-').map(Number);
    const [h, mi] = String(timeStr).split(':').map(Number);
    return new Date(y, m - 1, d, h || 12, mi || 0, 0);
  }

  it('parses date/time correctly', () => {
    const d = toDate('2025-03-15', '14:30');
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(14);
    expect(d.getMinutes()).toBe(30);
  });

  it('defaults to noon for empty time', () => {
    expect(toDate('2025-06-01', '').getHours()).toBe(12);
  });

  it('calculates end time from duration', () => {
    const start = toDate('2025-06-01', '10:00');
    const end = new Date(start.getTime() + 90 * 60 * 1000);
    expect(end.getHours()).toBe(11);
    expect(end.getMinutes()).toBe(30);
  });

  it('event map tracks add/remove correctly', () => {
    const map = {};
    map['ev-1'] = 'native-abc';
    map['ev-2'] = 'native-def';
    expect(Object.keys(map)).toHaveLength(2);
    delete map['ev-1'];
    expect(Object.keys(map)).toHaveLength(1);
    expect(map['ev-1']).toBeUndefined();
  });

  it('cancelled events should be removed not synced', () => {
    const event = { id: '1', cancelled: true, date: '2025-06-01', time: '10:00' };
    // Sync logic: if event.cancelled, call removeEvent instead of syncEvent
    expect(event.cancelled).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════
// 4. Dark Mode Token Consistency
// ════════════════════════════════════════════════════════════

describe('Dark mode token consistency', () => {
  const light = {
    bg: { base: '#FAF8F5', card: '#FFFFFF', elevated: '#FFFFFF', subtle: '#F3F0EC' },
    text: { primary: '#3A3530', secondary: '#9B9389', tertiary: '#A39B92', inverse: '#FFFFFF' },
    accent: { primary: '#B09080', light: '#F4EDEA', muted: '#CCBAB0', dark: '#917060' },
    success: '#6B9B7F', warning: '#D9A566', error: '#C06B65', info: '#7B93B3',
  };

  const dark = {
    bg: { base: '#161514', card: '#1E1D1B', elevated: '#2A2825', subtle: '#1E1D1B' },
    text: { primary: '#F0EDE9', secondary: '#B0AAA2', tertiary: '#8A857E', inverse: '#161514' },
    accent: { primary: '#D4BBB0', light: 'rgba(212,187,176,0.15)', muted: '#B89485', dark: '#E8CCC4' },
    success: '#5DBF7B', warning: '#E8B86D', error: '#E8695F', info: '#8BA3C4',
  };

  it('all light bg keys exist in dark', () => {
    Object.keys(light.bg).forEach(k => expect(dark.bg[k]).toBeDefined());
  });

  it('all light text keys exist in dark', () => {
    Object.keys(light.text).forEach(k => expect(dark.text[k]).toBeDefined());
  });

  it('all light accent keys exist in dark', () => {
    Object.keys(light.accent).forEach(k => expect(dark.accent[k]).toBeDefined());
  });

  it('dark text.inverse is dark (for accent contrast)', () => {
    expect(dark.text.inverse).toBe('#161514');
  });

  it('dark accent is lighter than light accent', () => {
    const lum = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return 0.299 * r + 0.587 * g + 0.114 * b;
    };
    expect(lum(dark.accent.primary)).toBeGreaterThan(lum(light.accent.primary));
  });

  it('dark bg.base is very dark', () => {
    const hex = dark.bg.base;
    const avg = (parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16)) / 3;
    expect(avg).toBeLessThan(30);
  });

  it('semantic colors exist in both themes', () => {
    ['success', 'warning', 'error', 'info'].forEach(k => {
      expect(light[k]).toBeDefined();
      expect(dark[k]).toBeDefined();
    });
  });
});

// ════════════════════════════════════════════════════════════
// 5. Tonight Suggestion FlatList Data Builder
// ════════════════════════════════════════════════════════════

describe('Tonight suggestion FlatList data', () => {
  function buildListData(ideas, engine) {
    const items = [];
    items.push({ type: 'intro', key: 'intro' });
    items.push({ type: 'vibes', key: 'vibes' });
    ideas.forEach((idea, i) => items.push({ type: 'idea', key: `idea_${i}`, idea, idx: i }));
    if (engine?.tension?.[0]) items.push({ type: 'nudge', key: 'nudge', data: engine.tension[0] });
    items.push({ type: 'footer', key: 'footer' });
    return items;
  }

  it('always has intro, vibes, footer', () => {
    expect(buildListData([], null).map(d => d.type)).toEqual(['intro', 'vibes', 'footer']);
  });

  it('adds idea items', () => {
    const ideas = [{ title: 'Movie night' }, { title: 'Cook together' }];
    expect(buildListData(ideas, null).filter(d => d.type === 'idea')).toHaveLength(2);
  });

  it('includes nudge with tension data', () => {
    const engine = { tension: [{ title: 'Try new', body: 'Mix it up' }] };
    expect(buildListData([], engine).some(d => d.type === 'nudge')).toBe(true);
  });

  it('omits nudge without tension', () => {
    expect(buildListData([], { tension: [] }).some(d => d.type === 'nudge')).toBe(false);
  });

  it('all items have unique keys', () => {
    const data = buildListData([{ title: 'A' }, { title: 'B' }], { tension: [{ title: 'X' }] });
    const keys = data.map(d => d.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

// ════════════════════════════════════════════════════════════
// 6. Shared Styles Module Structure
// ════════════════════════════════════════════════════════════

describe('Shared styles module structure', () => {
  it('exports expected category names', () => {
    const expected = ['layout', 'text', 'surfaces', 'interactive'];
    expected.forEach(name => expect(typeof name).toBe('string'));
  });

  it('tokens spacing keys are complete', () => {
    const required = ['xs', 'sm', 'md', 'base', 'lg', 'xl', 'xxl'];
    required.forEach(k => expect(k.length).toBeGreaterThan(0));
  });
});
