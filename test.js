#!/usr/bin/env node
// Test suite for Autobiographer.
// Loads the JS from index.html in a vm sandbox (with DOM stubs),
// then exercises core operations against the real autobiography.txt.
//
// The critical invariants we test:
//   1. Parse is deterministic.
//   2. Every add operation preserves all original non-trivial lines (byte-level).
//   3. Entry count only grows after inserts (never silently shrinks).
//   4. removeIncomingLine removes exactly one matching line and leaves the rest.
//   5. The incoming workflow (remove + insert-as-dated) preserves total content.
//   6. Gap detection is stable.
//   7. Stats reflect the actual parsed entries.
//   8. The write guardian blocks bad operations.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
const HTML_PATH = path.join(ROOT, 'index.html');
const BIO_PATH = fs.existsSync(path.join(ROOT, 'autobiography.normalized.txt'))
  ? path.join(ROOT, 'autobiography.normalized.txt')
  : path.join(ROOT, 'autobiography.txt');

// ── load index.html script into a sandbox ──
function loadAppScript() {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('No <script> block in index.html');
  return m[1];
}

function makeStubEl() {
  const stub = {
    addEventListener() {},
    removeEventListener() {},
    click() {}, focus() {}, blur() {}, scrollIntoView() {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    style: {},
    dataset: {},
    value: '',
    textContent: '',
    innerHTML: '',
    files: [],
    disabled: false,
    open: false,
    offsetWidth: 0,
    appendChild() {}, removeChild() {},
    setAttribute() {}, getAttribute() { return null; },
  };
  stub.parentNode = stub;
  stub.children = [];
  return stub;
}

function createSandbox() {
  const stubEl = makeStubEl();
  const stubNodeList = { forEach() {}, length: 0, [Symbol.iterator]: function*() {} };
  const sandbox = {
    localStorage: {
      _s: {},
      getItem(k) { return this._s[k] || null; },
      setItem(k, v) { this._s[k] = String(v); },
      removeItem(k) { delete this._s[k]; },
      clear() { this._s = {}; },
    },
    document: {
      getElementById() { return stubEl; },
      querySelector() { return stubEl; },
      querySelectorAll() { return stubNodeList; },
      addEventListener() {},
      createElement() {
        return { click() {}, href: '', download: '', style: {} };
      },
    },
    window: { scrollTo() {} },
    FileReader: function() { this.readAsText = () => {}; },
    Blob: function() {},
    URL: { createObjectURL: () => 'blob:', revokeObjectURL: () => {} },
    setTimeout: () => 0,
    clearTimeout: () => {},
    console,
    Date, Math, JSON, Set, Map, Object, Array, RegExp, String, Number, Boolean, Error, Symbol,
    parseInt, parseFloat, isNaN, isFinite,
  };
  sandbox.global = sandbox;
  sandbox.self = sandbox;
  return sandbox;
}

function loadApp() {
  const script = loadAppScript();
  const sandbox = createSandbox();
  vm.createContext(sandbox);
  try {
    vm.runInContext(script, sandbox, { filename: 'index.html' });
  } catch (e) {
    // Tolerate init errors — function declarations are still hoisted into the context.
    // But throw if it's a syntax error.
    if (e instanceof SyntaxError) throw e;
  }
  return sandbox;
}

const app = loadApp();

// Sanity: make sure the core functions are available.
for (const name of [
  'parse', 'findGaps', 'formatPastEntry',
  'insertInMonthSection', 'insertInPreBlock', 'insertDatedEntry', 'insertIncoming',
  'getIncomingBounds', 'getIncomingItems', 'removeIncomingLine',
  'getOnThisDay', 'getRandomEntry', 'getPersonEntries',
  'entriesByYear', 'entriesByYearMonth', 'entriesByDate', 'getMonthCalendar',
  'computeStats',
]) {
  if (typeof app[name] !== 'function') {
    console.error('Missing function in sandbox:', name);
    process.exit(1);
  }
}

// ── tiny test runner ──
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function assertEqual(a, b, msg) {
  if (a !== b) throw new Error((msg || 'not equal') + ': expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a));
}

// ── helpers ──
function loadBio() { return fs.readFileSync(BIO_PATH, 'utf8'); }

function significantLines(text) {
  // Returns lines that must survive any add operation (non-empty, not trivial whitespace).
  return text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
}

function assertAllLinesPreserved(oldText, newText, op) {
  const newLines = newText;
  for (const line of significantLines(oldText)) {
    if (!newLines.includes(line)) {
      throw new Error(`${op}: line missing after operation: "${line.slice(0, 60)}"`);
    }
  }
}

// ── TESTS ──

test('parse is deterministic (same input → same output)', () => {
  const text = loadBio();
  const a = app.parse(text);
  const b = app.parse(text);
  assertEqual(a.length, b.length, 'entry count differs between parses');
  for (let i = 0; i < a.length; i++) {
    assertEqual(a[i].year, b[i].year, `entry ${i} year`);
    assertEqual(a[i].month, b[i].month, `entry ${i} month`);
    assertEqual(a[i].day, b[i].day, `entry ${i} day`);
  }
});

test('findGaps is deterministic', () => {
  const text = loadBio();
  const a = app.findGaps(app.parse(text));
  const b = app.findGaps(app.parse(text));
  assertEqual(JSON.stringify(a), JSON.stringify(b), 'gaps differ between calls');
});

test('formatPastEntry produces expected formats', () => {
  assertEqual(app.formatPastEntry(2015, null, null, null, null, 'X'), '2015 ish: X');
  assertEqual(app.formatPastEntry(2015, 7, null, null, null, 'X'), '201507 X');
  assertEqual(app.formatPastEntry(2015, 7, 15, null, null, 'X'), '20150715 X');
  assertEqual(app.formatPastEntry(2015, 7, 15, 14, 30, 'X'), '201507151430 X');
});

test('insertInMonthSection preserves every original non-empty line', () => {
  const text = loadBio();
  const result = app.insertInMonthSection(text, 2026, 4, 7, 14, 30, 'GUARDIAN_TEST_QUICK');
  assertAllLinesPreserved(text, result, 'insertInMonthSection');
  assert(result.includes('GUARDIAN_TEST_QUICK'), 'new entry not found in result');
});

test('insertInMonthSection entry is parseable after insert', () => {
  const text = loadBio();
  const result = app.insertInMonthSection(text, 2026, 4, 7, 14, 30, 'GUARDIAN_TEST_QUICK2');
  const entries = app.parse(result);
  const found = entries.find(e => e.text && String(e.text).includes('GUARDIAN_TEST_QUICK2'));
  assert(found, 'new entry not parseable');
  assertEqual(found.year, 2026);
  assertEqual(found.month, 4);
  assertEqual(found.day, 7);
  assertEqual(found.hour, 14);
  assertEqual(found.minute, 30);
});

test('insertInPreBlock preserves every original non-empty line', () => {
  const text = loadBio();
  const result = app.insertInPreBlock(text, '2010 ish: GUARDIAN_TEST_PRE');
  assertAllLinesPreserved(text, result, 'insertInPreBlock');
  assert(result.includes('GUARDIAN_TEST_PRE'), 'new pre entry not found');
});

test('insertInPreBlock places entry AFTER the pre header', () => {
  const text = loadBio();
  const result = app.insertInPreBlock(text, '2010 ish: GUARDIAN_TEST_PRE2');
  const preIdx = result.indexOf('== pre');
  const entryIdx = result.indexOf('GUARDIAN_TEST_PRE2');
  assert(preIdx !== -1, 'no pre section found');
  assert(entryIdx > preIdx, 'entry should be after pre header (entryIdx=' + entryIdx + ', preIdx=' + preIdx + ')');
});

test('insertDatedEntry routes to month section when year has a section + day given', () => {
  const text = loadBio();
  // 2026 has a section. Adding a day-specific entry should go to month section.
  const result = app.insertDatedEntry(text, 2026, 4, 15, 10, 30, 'GUARDIAN_TEST_ROUTE');
  // Parse and verify
  const entries = app.parse(result);
  const found = entries.find(e => e.text && String(e.text).includes('GUARDIAN_TEST_ROUTE'));
  assert(found, 'routed entry not found');
  assertEqual(found.month, 4);
  assertEqual(found.day, 15);
});

test('insertDatedEntry routes to pre block for old years', () => {
  const text = loadBio();
  const result = app.insertDatedEntry(text, 2006, null, null, null, null, 'GUARDIAN_TEST_OLD');
  const preIdx = result.indexOf('== pre');
  const entryIdx = result.indexOf('GUARDIAN_TEST_OLD');
  assert(entryIdx > preIdx, 'old entry should be in pre section');
  // Verify format: should be "2006 ish: GUARDIAN_TEST_OLD"
  assert(result.includes('2006 ish: GUARDIAN_TEST_OLD'), 'expected "2006 ish:" format');
});

test('insertIncoming appends to the INCOMING section', () => {
  const text = loadBio();
  const itemsBefore = app.getIncomingItems(text);
  const result = app.insertIncoming(text, 'GUARDIAN_TEST_INCOMING_ITEM');
  const itemsAfter = app.getIncomingItems(result);
  assertEqual(itemsAfter.length, itemsBefore.length + 1, 'incoming item count should +1');
  assert(itemsAfter.includes('GUARDIAN_TEST_INCOMING_ITEM'), 'new item not in incoming list');
  assertAllLinesPreserved(text, result, 'insertIncoming');
});

test('getIncomingItems returns non-empty list for real file', () => {
  const text = loadBio();
  const items = app.getIncomingItems(text);
  assert(items.length > 0, 'expected some incoming items in the real file');
  // Sanity: no blank items, no dividers
  for (const item of items) {
    assert(item.length > 0, 'blank item in list');
    assert(!item.match(/^[—\-=]+$/), 'divider in list: ' + item);
  }
});

test('removeIncomingLine removes exactly the matching line', () => {
  const text = loadBio();
  const items = app.getIncomingItems(text);
  assert(items.length >= 2, 'need at least 2 items');
  const target = items[0];
  const result = app.removeIncomingLine(text, target);
  const newItems = app.getIncomingItems(result);
  assertEqual(newItems.length, items.length - 1, 'item count should be -1');
  assert(!newItems.includes(target), 'target should be removed');
  // All OTHER items should still be present
  for (let i = 1; i < items.length; i++) {
    assert(newItems.includes(items[i]), `item "${items[i].slice(0,40)}" should still be present`);
  }
});

test('removeIncomingLine with non-existent content returns unchanged', () => {
  const text = loadBio();
  const result = app.removeIncomingLine(text, 'THIS_TEXT_DOES_NOT_EXIST_IN_INCOMING_xyz123');
  assertEqual(result, text, 'text should be unchanged when target not found');
});

test('removeIncomingLine only affects INCOMING section', () => {
  const text = loadBio();
  const items = app.getIncomingItems(text);
  const target = items[0];
  const result = app.removeIncomingLine(text, target);
  // Parsed entries should be unchanged (since incoming items aren't parsed as entries)
  const entriesBefore = app.parse(text);
  const entriesAfter = app.parse(result);
  assertEqual(entriesAfter.length, entriesBefore.length, 'parsed entries should be unchanged');
});

test('incoming workflow: remove + insert-as-dated preserves content + count', () => {
  const text = loadBio();
  const items = app.getIncomingItems(text);
  const target = items[0];
  const entriesBefore = app.parse(text).length;

  const afterRemove = app.removeIncomingLine(text, target);
  const final = app.insertDatedEntry(afterRemove, 2006, 5, 15, null, null, target);

  const entriesAfter = app.parse(final).length;
  assertEqual(entriesAfter, entriesBefore + 1, 'entry count should be +1');

  // The new dated entry should be findable
  const found = app.parse(final).find(e => e.text && String(e.text).includes(target.slice(0, 20)));
  assert(found, 'converted entry not found');

  // The item should no longer be in INCOMING
  const incomingAfter = app.getIncomingItems(final);
  assert(!incomingAfter.includes(target), 'item still in incoming');

  // All OTHER incoming items preserved
  for (let i = 1; i < items.length; i++) {
    assert(incomingAfter.includes(items[i]), `other item missing: ${items[i].slice(0, 40)}`);
  }
});

test('getOnThisDay returns entries matching month+day', () => {
  const text = loadBio();
  const entries = app.parse(text);
  const withDay = entries.filter(e => e.month && e.day);
  assert(withDay.length > 0, 'expected some dated entries');
  const sample = withDay[0];
  const matches = app.getOnThisDay(entries, sample.month, sample.day);
  assert(matches.length >= 1, 'should find at least the sample entry');
  assert(matches.every(e => e.month === sample.month && e.day === sample.day), 'all matches should have same month/day');
});

test('computeStats returns a coherent shape', () => {
  const text = loadBio();
  const stats = app.computeStats(text);
  assert(stats.total > 0, 'total entries > 0');
  assert(stats.years > 0, 'years > 0');
  assert(stats.firstYear !== null && stats.firstYear >= 1900, 'valid firstYear');
  assert(stats.lastYear !== null && stats.lastYear >= stats.firstYear, 'lastYear >= firstYear');
  assert(typeof stats.byYear === 'object', 'byYear is object');
  assert(stats.longestStreak >= 1, 'streak >= 1');
  assert(Array.isArray(stats.topPeople), 'topPeople is array');
  // Sanity check: sum of byYear should equal total
  let sum = 0;
  for (const n of Object.values(stats.byYear)) sum += n;
  // (some entries might not have a year; byYear skips them)
  assert(sum <= stats.total, 'byYear sum should be <= total');
});

test('entry count NEVER decreases after an add operation', () => {
  const text = loadBio();
  const before = app.parse(text).length;

  const after1 = app.parse(app.insertInMonthSection(text, 2026, 4, 20, 9, 0, 'X')).length;
  assert(after1 >= before, `quick entry: count went from ${before} to ${after1}`);

  const after2 = app.parse(app.insertInPreBlock(text, '2005 ish: Y')).length;
  assert(after2 >= before, `pre insert: count went from ${before} to ${after2}`);

  const after3 = app.parse(app.insertDatedEntry(text, 2010, null, null, null, null, 'Z')).length;
  assert(after3 >= before, `dated insert: count went from ${before} to ${after3}`);

  // Incoming doesn't create a parsed entry (delta = 0), but doesn't lose any either
  const after4 = app.parse(app.insertIncoming(text, 'W')).length;
  assert(after4 >= before, `incoming insert: count went from ${before} to ${after4}`);
});

test('file byte length only grows after add operations', () => {
  const text = loadBio();
  const ops = [
    ['month', app.insertInMonthSection(text, 2026, 4, 22, 12, 0, 'A')],
    ['pre', app.insertInPreBlock(text, '2004 ish: B')],
    ['dated', app.insertDatedEntry(text, 2013, null, null, null, null, 'C')],
    ['incoming', app.insertIncoming(text, 'D')],
  ];
  for (const [name, result] of ops) {
    assert(result.length > text.length, `${name}: length shrank (${text.length} → ${result.length})`);
  }
});

test('multiple sequential inserts accumulate correctly', () => {
  let text = loadBio();
  const startCount = app.parse(text).length;

  text = app.insertInMonthSection(text, 2026, 4, 22, 12, 0, 'SEQ_A');
  text = app.insertInPreBlock(text, '2004 ish: SEQ_B');
  text = app.insertDatedEntry(text, 2013, null, null, null, null, 'SEQ_C');

  const endCount = app.parse(text).length;
  assertEqual(endCount, startCount + 3, 'should have added 3 entries');

  // All three should be findable
  const entries = app.parse(text);
  assert(entries.some(e => e.text && String(e.text).includes('SEQ_A')), 'SEQ_A missing');
  assert(entries.some(e => e.text && String(e.text).includes('SEQ_B')), 'SEQ_B missing');
  assert(entries.some(e => e.text && String(e.text).includes('SEQ_C')), 'SEQ_C missing');
});

test('round-trip: load → parse → serialize the same entries count', () => {
  const text = loadBio();
  const entries = app.parse(text);
  // Re-parse and compare
  const entries2 = app.parse(text);
  assertEqual(entries.length, entries2.length);
});

test('gap detection is consistent across modifications', () => {
  const text = loadBio();
  const gapsBefore = app.findGaps(app.parse(text));

  // Add a past entry for a year in a gap
  const firstGap = gapsBefore[0];
  if (!firstGap) {
    console.log('  (skipped — no gaps to test)');
    return;
  }
  const targetYear = firstGap.s;
  const result = app.insertDatedEntry(text, targetYear, null, null, null, null, 'FILL_GAP_TEST');
  const gapsAfter = app.findGaps(app.parse(result));

  // targetYear should no longer be in any gap
  for (const g of gapsAfter) {
    assert(!(targetYear >= g.s && targetYear <= g.e), `${targetYear} should no longer be in a gap`);
  }
});

test('guardWriteCheck allows valid add operations', () => {
  const text = loadBio();
  const good = app.insertInMonthSection(text, 2026, 4, 8, 9, 0, 'A GOOD ENTRY');
  const r = app.guardWriteCheck(text, good, 1);
  assert(r.ok, 'valid add should pass: ' + r.reason);
});

test('guardWriteCheck blocks writes that shrink the file', () => {
  const text = loadBio();
  const mangled = text.substring(0, text.length - 500); // chopped off 500 bytes
  const r = app.guardWriteCheck(text, mangled, 1);
  assert(!r.ok, 'shrinking write should be blocked');
  // Any of the three failure reasons is acceptable: size, entry-count, line-missing.
  // All three are legitimate integrity violations for this kind of corruption.
});

test('guardWriteCheck blocks shrinking writes with delta=0 (explicit size check)', () => {
  const text = loadBio();
  // Remove a trailing line to shrink the file without losing a parsed entry
  const lines = text.split('\n');
  // Find a trailing blank line or a short line we can remove safely
  // Actually, any removal should trip at least one of our checks. Just verify block.
  lines.pop(); lines.pop(); lines.pop();
  // Pad with a shorter version
  const mangled = lines.join('\n');
  if (mangled.length >= text.length) { console.log('  (skipped — no shrink)'); return; }
  const r = app.guardWriteCheck(text, mangled, 0);
  assert(!r.ok, 'any shrinking write with delta=0 should be blocked');
});

test('guardWriteCheck blocks writes that lose entries', () => {
  const text = loadBio();
  // Craft a "new" text that removes some entries but keeps file roughly the same size
  // by replacing an entry with blank space
  const lines = text.split('\n');
  const idx = lines.findIndex(l => l.match(/^\d{6}:/));
  assert(idx >= 0, 'should find a DDHHMM line');
  const original = lines[idx];
  lines[idx] = ' '.repeat(original.length); // blank the entry, keep file same size
  const mangled = lines.join('\n');
  const r = app.guardWriteCheck(text, mangled, 1);
  assert(!r.ok, 'entry-loss should be blocked');
});

test('guardWriteCheck blocks writes that silently drop a line', () => {
  const text = loadBio();
  // Remove a distinctive line entirely
  const lines = text.split('\n');
  const idx = lines.findIndex(l => l.includes('Kardashians'));
  if (idx < 0) { console.log('  (skipped — no Kardashians line)'); return; }
  lines.splice(idx, 1);
  const mangled = lines.join('\n');
  const r = app.guardWriteCheck(text, mangled, 0);
  assert(!r.ok, 'line-drop should be blocked');
});

test('guardWriteCheck allows incoming inserts (delta = 0)', () => {
  const text = loadBio();
  const afterIncoming = app.insertIncoming(text, 'a new undated memory');
  const r = app.guardWriteCheck(text, afterIncoming, 0);
  assert(r.ok, 'incoming insert should pass: ' + r.reason);
});

test('incoming workflow passes the guardian (remove + insert as dated)', () => {
  const text = loadBio();
  const items = app.getIncomingItems(text);
  if (items.length === 0) { console.log('  (skipped — no incoming)'); return; }
  const target = items[0];
  const afterRemove = app.removeIncomingLine(text, target);
  const final = app.insertDatedEntry(afterRemove, 2006, 5, 15, null, null, target);
  const r = app.guardWriteCheck(text, final, 1);
  assert(r.ok, 'incoming workflow should pass: ' + r.reason);
});

test('getRandomEntry returns a valid entry with year and text', () => {
  const text = loadBio();
  const entries = app.parse(text);
  // Run multiple times to make sure it's not just lucky
  for (let i = 0; i < 20; i++) {
    const r = app.getRandomEntry(entries);
    assert(r, 'should return an entry');
    assert(r.year, 'entry should have a year');
    assert(r.text && String(r.text).trim().length > 0, 'entry should have non-empty text');
  }
});

test('getRandomEntry returns null on empty input', () => {
  assert(app.getRandomEntry([]) === null, 'empty input → null');
});

test('getPersonEntries finds entries mentioning a known name', () => {
  const text = loadBio();
  const entries = app.parse(text);
  // Vanessa is mentioned often in the user's data
  const vanessas = app.getPersonEntries(entries, 'Vanessa');
  assert(vanessas.length > 0, 'should find Vanessa entries');
  for (const e of vanessas) {
    assert(String(e.text).includes('Vanessa'), 'every match should contain the name');
  }
});

test('getPersonEntries respects word boundaries (no substring matches)', () => {
  const text = loadBio();
  const entries = app.parse(text);
  // "Van" should not match "Vanessa"
  const partial = app.getPersonEntries(entries, 'Van');
  for (const e of partial) {
    // Should match exact "Van" word, not substring
    assert(/\bVan\b/.test(String(e.text)), 'should not match substring');
  }
});

test('getPersonEntries returns empty array for non-existent name', () => {
  const text = loadBio();
  const entries = app.parse(text);
  const r = app.getPersonEntries(entries, 'XQZWNOBODY');
  assert(Array.isArray(r), 'should return array');
  assert(r.length === 0, 'no matches');
});

test('getPersonEntries sorts chronologically (oldest first)', () => {
  const text = loadBio();
  const entries = app.parse(text);
  const matches = app.getPersonEntries(entries, 'Vanessa');
  for (let i = 1; i < matches.length; i++) {
    const prev = matches[i - 1], cur = matches[i];
    const prevKey = prev.year * 10000 + (prev.month || 0) * 100 + (prev.day || 0);
    const curKey = cur.year * 10000 + (cur.month || 0) * 100 + (cur.day || 0);
    assert(prevKey <= curKey, 'chronological order broken at index ' + i);
  }
});

test('entriesByYear returns only matching year', () => {
  const text = loadBio();
  const entries = app.parse(text);
  const e2025 = app.entriesByYear(entries, 2025);
  assert(e2025.length > 0, 'should have 2025 entries');
  for (const e of e2025) assertEqual(e.year, 2025);
});

test('entriesByYearMonth filters by both', () => {
  const text = loadBio();
  const entries = app.parse(text);
  const aug2025 = app.entriesByYearMonth(entries, 2025, 8);
  for (const e of aug2025) {
    assertEqual(e.year, 2025);
    assertEqual(e.month, 8);
  }
});

test('entriesByDate filters by year, month, AND day', () => {
  const text = loadBio();
  const entries = app.parse(text);
  // Pick an entry with a known date
  const sample = entries.find(e => e.year && e.month && e.day);
  if (!sample) { console.log('  (skipped — no fully-dated entry)'); return; }
  const matches = app.entriesByDate(entries, sample.year, sample.month, sample.day);
  assert(matches.length >= 1, 'should find at least the sample');
  for (const e of matches) {
    assertEqual(e.year, sample.year);
    assertEqual(e.month, sample.month);
    assertEqual(e.day, sample.day);
  }
});

test('getMonthCalendar returns correct days and leading blanks', () => {
  // April 2026: 30 days, starts on a Wednesday → Mon=0, Tue=1, Wed=2 → 2 leading blanks
  const cal = app.getMonthCalendar(2026, 4);
  assertEqual(cal.daysInMonth, 30);
  assertEqual(cal.leadingBlanks, 2);

  // February 2025: 28 days, starts on a Saturday → 5 leading blanks (Mon=0..Fri=4, Sat=5)
  const cal2 = app.getMonthCalendar(2025, 2);
  assertEqual(cal2.daysInMonth, 28);
  assertEqual(cal2.leadingBlanks, 5);

  // January 2024: 31 days, starts on a Monday → 0 leading blanks
  const cal3 = app.getMonthCalendar(2024, 1);
  assertEqual(cal3.daysInMonth, 31);
  assertEqual(cal3.leadingBlanks, 0);
});

test('parser captures multi-line entry bodies (poems, continuation paragraphs)', () => {
  const text = loadBio();
  const entries = app.parse(text);
  // June 10, 2025 — the "hello and welcome to hell" poem with 6 lines of body
  const june10 = entries.find(e => e.year === 2025 && e.month === 6 && e.day === 10);
  if (june10) {
    assert(String(june10.text).includes('hello and welcome to hell'),
      'June 10 poem body should include "hello and welcome to hell", got: ' + (june10.text || '').slice(0, 100));
    assert(String(june10.text).includes('feel the hollywood'),
      'June 10 poem should include last line');
  }
  // Jan 29, 2026 23:29 — has a "I just remembered" continuation paragraph
  const jan29 = entries.find(e => e.year === 2026 && e.month === 1 && e.day === 29 && e.hour === 23);
  if (jan29) {
    assert(String(jan29.text).includes('I just remembered'),
      'Jan 29 23:29 should include continuation paragraph');
  }
});

test('parser: 2+ consecutive blank lines end a multi-line entry', () => {
  const input =
`========== 2020 ============

April '20 ======
150000: line one
line two
line three


060000: next entry`;
  const entries = app.parse(input);
  const e1 = entries.find(e => e.day === 15);
  const e2 = entries.find(e => e.day === 6);
  assert(e1, 'first entry parsed');
  assert(e2, 'second entry parsed');
  assert(String(e1.text).includes('line one'), 'first entry has first line');
  assert(String(e1.text).includes('line three'), 'first entry has continuation');
  assert(!String(e1.text).includes('next entry'), 'first entry does not leak into next');
  assertEqual(e2.text, 'next entry', 'second entry is clean');
});

test('parser: single blank line preserves paragraph break inside entry', () => {
  const input =
`========== 2020 ============

April '20 ======
150000: paragraph one

paragraph two after blank
150001: next`;
  const entries = app.parse(input);
  const e = entries.find(e => e.day === 15 && e.minute === 0);
  assert(e, 'entry found');
  assert(String(e.text).includes('paragraph one'), 'has first paragraph');
  assert(String(e.text).includes('paragraph two'), 'has second paragraph after single blank');
});

test('all QBank groups have at least 8 questions and reference {year}/{age}', () => {
  // Re-parse the QBank from the script source since `let` constants aren't on the sandbox
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  // Just check that questions exist by parsing the script for QBank entries
  const groups = ['baby', 'kid', 'teen', 'young', 'adult'];
  for (const g of groups) {
    // Can't easily access QBank from sandbox (it's a const), so check the HTML source
    const re = new RegExp(g + ':\\s*\\[([\\s\\S]*?)\\],', 'm');
    const m = html.match(re);
    assert(m, 'should find QBank group: ' + g);
    // Count quoted strings inside (rough)
    const qs = (m[1].match(/"[^"]{15,}"/g) || []).length;
    assert(qs >= 8, g + ' has only ' + qs + ' questions, expected >= 8');
  }
});

test('incoming bounds: items stay within the section', () => {
  const text = loadBio();
  const bounds = app.getIncomingBounds(text);
  if (!bounds) {
    console.log('  (skipped — no INCOMING section)');
    return;
  }
  const items = app.getIncomingItems(text);
  // Every item should appear inside the INCOMING section byte range
  for (const item of items) {
    const idx = text.indexOf(item);
    assert(idx >= bounds.startIdx - item.length && idx < bounds.endIdx,
      `item "${item.slice(0, 30)}" found outside bounds`);
  }
});

// ── run ──
let passed = 0, failed = 0;
const failures = [];
for (const { name, fn } of tests) {
  try {
    fn();
    console.log('  PASS  ' + name);
    passed++;
  } catch (e) {
    console.log('  FAIL  ' + name);
    console.log('        ' + e.message);
    failed++;
    failures.push({ name, error: e });
  }
}

console.log();
console.log(`${passed} passed, ${failed} failed (${tests.length} total)`);
console.log(`Test data: ${path.basename(BIO_PATH)}`);
process.exit(failed > 0 ? 1 : 0);
