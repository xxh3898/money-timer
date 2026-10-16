const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');

const syntheticSettings = { settingsVersion: 1, calculationType: 'hourly', annualSalary: 0, monthlySalary: 0, hourlyWage: 36000,
  payday: 25, paydayTime: '09:00', earningMode: 'always', workDays: [1, 2, 3, 4, 5], workStartTime: '09:00', workEndTime: '18:00',
  breaks: [{ startTime: '12:00', endTime: '13:00', enabled: true }], privacyMode: false, theme: 'system' };
const syntheticGoals = [{ id: 'synthetic-goal', name: '가상 목표', amount: 99999999, enabled: true }];

async function environment(t, options = {}) {
  let position = options.position, now = new Date(2026, 9, 16, 12).getTime(), handle = 0;
  const bars = [], commands = new Map(), listeners = new Set(), intervals = new Map(), writes = [], picks = [];
  const state = new Map([['moneyTimerSettings', structuredClone({ ...syntheticSettings, ...options.settings })],
    ['moneyTimerGoals', structuredClone(syntheticGoals)], ['moneyTimerVisible', options.visible ?? true]]);
  t.mock.method(Date, 'now', () => now);
  t.mock.method(globalThis, 'setInterval', (callback, delay) => { intervals.set(++handle, { callback, delay }); return handle; });
  t.mock.method(globalThis, 'clearInterval', id => intervals.delete(id));
  const context = { extensionPath: path.resolve(__dirname, '..'), subscriptions: [], globalState: {
    get: (key, fallback) => state.has(key) ? state.get(key) : fallback,
    update: async (key, value) => { writes.push(key); state.set(key, value); }
  } };
  const vscode = {
    StatusBarAlignment: { Left: 1, Right: 2 },
    window: {
      createStatusBarItem: (alignment, priority) => {
        const bar = { alignment, priority, text: '', tooltip: '', name: '', command: '', visible: false, disposed: false,
          show() { this.visible = true; }, hide() { this.visible = false; }, dispose() { this.disposed = true; this.visible = false; } };
        bars.push(bar); return bar;
      },
      showQuickPick: async items => { picks.push(items); return undefined; },
      showInputBox: async () => undefined,
      showInformationMessage() {}
    },
    commands: { registerCommand: (id, callback) => { commands.set(id, callback); return { dispose: () => commands.delete(id) }; } },
    workspace: {
      getConfiguration: section => { assert.equal(section, 'moneyTimer'); return { get: (key, fallback) => { assert.equal(key, 'position'); return position === undefined ? fallback : position; } }; },
      onDidChangeConfiguration: listener => { listeners.add(listener); return { dispose: () => listeners.delete(listener) }; }
    }
  };
  const load = Module._load, filename = require.resolve('../extension.js');
  delete require.cache[filename];
  let extension;
  Module._load = function(id, ...args) { return id === 'vscode' ? vscode : load.call(this, id, ...args); };
  try { extension = require(filename); } finally { Module._load = load; }
  await extension.activate(context);
  return { bars, commands, listeners, intervals, writes, state, picks,
    get bar() { return bars.at(-1); },
    change(value, relevant = true) { position = value; for (const listener of listeners) listener({ affectsConfiguration: section => relevant && section === 'moneyTimer.position' }); },
    run: name => commands.get(`moneyTimer.${name}`)(),
    tick() { now += 1000; for (const entry of intervals.values()) entry.callback(); },
    dispose() { extension.deactivate(); for (const item of context.subscriptions) item.dispose(); }
  };
}

test('defaults right, accepts left/right and falls back to right for invalid values', async t => {
  for (const position of [undefined, 'right', 'left', 'center', '', 1, null]) {
    const h = await environment(t, { position });
    try {
      assert.equal(h.bar.alignment, position === 'left' ? 1 : 2); assert.equal(h.bar.priority, 100);
      assert.equal(h.bar.name, 'Money Timer'); assert.equal(h.bar.command, 'moneyTimer.showDetails');
      assert.equal(h.bars.length, 1); assert.equal(h.intervals.size, 1); assert.equal(h.intervals.values().next().value.delay, 1000);
    } finally { h.dispose(); }
  }
});

test('position switches preserve earnings settings, details and the original one-second timer', async t => {
  const h = await environment(t); const originalState = structuredClone([...h.state]);
  try {
    const text = h.bar.text, tooltip = h.bar.tooltip, timer = [...h.intervals.entries()];
    for (const position of ['left', 'right', 'left']) {
      const previous = h.bar; h.change(position);
      assert.notEqual(h.bar, previous); assert.equal(previous.disposed, true);
      assert.equal(h.bar.alignment, position === 'left' ? 1 : 2); assert.equal(h.bar.priority, 100);
      assert.equal(h.bar.text, text); assert.equal(h.bar.tooltip, tooltip); assert.equal(h.bar.command, 'moneyTimer.showDetails');
      assert.deepEqual([...h.state], originalState); assert.deepEqual([...h.intervals.entries()], timer); assert.deepEqual(h.writes, []);
      assert.equal(h.bars.filter(bar => !bar.disposed).length, 1);
      const count = h.bars.length; h.change(position); h.change(position, false); assert.equal(h.bars.length, count);
    }
    await h.run('showDetails'); assert.ok(h.picks.at(-1).some(item => item.label.includes('현재까지 번 돈')));
    h.tick(); assert.notEqual(h.bar.tooltip, tooltip);
  } finally { h.dispose(); }
});

test('hidden state survives position changes, ticks and later visibility toggles', async t => {
  const h = await environment(t, { visible: false });
  try {
    assert.equal(h.bar.visible, false); h.change('left'); h.tick(); assert.equal(h.bar.visible, false);
    assert.equal(h.state.get('moneyTimerVisible'), false); assert.deepEqual(h.writes, []);
    await h.run('toggleVisibility'); assert.equal(h.bar.visible, true); assert.equal(h.bar.command, 'moneyTimer.showDetails');
    await h.run('toggleVisibility'); h.change('right'); assert.equal(h.bar.visible, false);
    assert.deepEqual(h.state.get('moneyTimerSettings'), syntheticSettings);
  } finally { h.dispose(); }
});

test('shutdown disposes the latest bar, configuration listener, commands and timer', async t => {
  const h = await environment(t);
  h.change('left'); h.change('right'); assert.equal(h.listeners.size, 1);
  h.dispose(); assert.ok(h.bars.every(bar => bar.disposed));
  assert.equal(h.listeners.size, 0); assert.equal(h.intervals.size, 0); assert.equal(h.commands.size, 0);
  const count = h.bars.length; h.change('left'); assert.equal(h.bars.length, count);
});

test('position switches preserve privacy masking, goals and the current command set', async t => {
  const h = await environment(t, { settings: { privacyMode: true } });
  try {
    assert.equal(h.commands.size, 6);
    const state = structuredClone([...h.state]);
    for (const position of ['left', 'right']) {
      h.change(position); h.tick();
      assert.match(h.bar.text, /₩••••••/); assert.doesNotMatch(h.bar.tooltip, /₩\d/);
      assert.match(h.bar.tooltip, /가상 목표/); assert.deepEqual([...h.state], state);
      await h.run('showDetails');
      assert.ok(h.picks.at(-1).some(item => item.label.includes('₩••••••')));
      assert.deepEqual(h.state.get('moneyTimerGoals'), syntheticGoals);
    }
  } finally { h.dispose(); }
});

test('existing legacy settings migration happens once and position changes never rewrite stored earnings', async t => {
  const h = await environment(t, { settings: { settingsVersion: 0, taxMode: 'gross' } });
  try {
    assert.deepEqual(h.writes, ['moneyTimerSettings']);
    const state = structuredClone([...h.state]);
    assert.equal(h.state.get('moneyTimerSettings').settingsVersion, 1);
    for (const position of ['left', 'right', 'left']) { h.change(position); h.tick(); }
    assert.deepEqual([...h.state], state); assert.deepEqual(h.writes, ['moneyTimerSettings']);
  } finally { h.dispose(); }
});
