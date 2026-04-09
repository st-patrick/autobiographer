#!/usr/bin/env node
// One-time normalizer for autobiography.txt
// - Parses all dated entries (preserving multi-line content)
// - Sorts entries reverse-chronologically within each section
// - Normalizes pre-section entries to compact format (YYYYMMDDHHMM / YYYYMMDD / YYYYMM / YYYY ish)
// - Preserves year sections (2026, 2025) with their month sub-sections (DDHHMM: format)
// - Preserves framing, INCOMING section, and moves orphan YYYY-ish entries to pre block
// - Usage: node normalize.js [input.txt] [output.txt]

const fs = require('fs');

const INPUT = process.argv[2] || 'autobiography (1).txt';
const OUTPUT = process.argv[3] || 'autobiography.normalized.txt';

const MM = {
  january: 1, jan: 1, february: 2, feb: 2, februrary: 2,
  march: 3, mar: 3, april: 4, apr: 4, may: 5,
  june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8,
  september: 9, sep: 9, october: 10, oct: 10, oktober: 10,
  november: 11, nov: 11, december: 12, dec: 12
};
const FULL_MO = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const SEASON = { spring: 4, summer: 7, fall: 10, autumn: 10, winter: 1 };
const pad2 = n => String(n).padStart(2, '0');

function ordSuf(n) {
  if (n >= 11 && n <= 13) return 'th';
  return ({ 1: 'st', 2: 'nd', 3: 'rd' })[n % 10] || 'th';
}

// ── entry detector ──
function tryParseEntry(s, curYear, curMonth, lastYearInPre) {
  let m;

  // DDHHMM: text (only when in an active month section)
  if (curYear && curMonth) {
    m = s.match(/^(\d{2})(\d{2})(\d{2})[.: ]\s*(.*)/);
    if (m && +m[1] >= 1 && +m[1] <= 31 && +m[2] <= 23 && +m[3] <= 59) {
      // Strip leading "ish" (approximation marker sometimes used after DDHHMM)
      let text = (m[4] || '').replace(/^ish\s*:?\s*/i, '');
      return { year: curYear, month: curMonth, day: +m[1], hour: +m[2], minute: +m[3], text };
    }
    // DDth HH:MM text (e.g., "18th 19:48: eyes looking...")
    m = s.match(/^(\d{1,2})(?:st|nd|rd|th)\s+(\d{1,2}):(\d{2})[.:]?\s*(.*)/i);
    if (m && +m[1] >= 1 && +m[1] <= 31 && +m[2] <= 23 && +m[3] <= 59) {
      return { year: curYear, month: curMonth, day: +m[1], hour: +m[2], minute: +m[3], text: m[4] || '' };
    }
    // DDth/st/nd/rd text
    m = s.match(/^(\d{1,2})(?:st|nd|rd|th)[.:,]?\s*(.*)/i);
    if (m && +m[1] >= 1 && +m[1] <= 31) {
      return { year: curYear, month: curMonth, day: +m[1], hour: null, minute: null, text: m[2] || '' };
    }
  }

  // YYYYMMDDHHMM text
  m = s.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})\s+(.*)/);
  if (m && +m[1] >= 1900 && +m[1] <= 2100 && +m[2] >= 1 && +m[2] <= 12 && +m[3] >= 1 && +m[3] <= 31) {
    return { year: +m[1], month: +m[2], day: +m[3], hour: +m[4], minute: +m[5], text: m[6] };
  }

  // YYYYMMDD text
  m = s.match(/^(\d{4})(\d{2})(\d{2})\s+(.*)/);
  if (m && +m[1] >= 1900 && +m[1] <= 2100 && +m[2] >= 1 && +m[2] <= 12) {
    const d = +m[3];
    return { year: +m[1], month: +m[2], day: d >= 1 && d <= 31 ? d : null, hour: null, minute: null, text: m[4] };
  }

  // YYYYMM text
  m = s.match(/^(\d{4})(\d{2})\s+(?!\d)(.*)/);
  if (m && +m[1] >= 1900 && +m[1] <= 2100 && +m[2] >= 1 && +m[2] <= 12) {
    return { year: +m[1], month: +m[2], day: null, hour: null, minute: null, text: m[3] };
  }

  // YYYY-MM-DD text
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})\s+(.*)/);
  if (m) {
    return { year: +m[1], month: +m[2], day: +m[3], hour: null, minute: null, text: m[4] };
  }

  // YYYY-MM text (not "ish")
  m = s.match(/^(\d{4})-(\d{2})\s+(?!ish)(.*)/);
  if (m && +m[2] >= 1 && +m[2] <= 12) {
    return { year: +m[1], month: +m[2], day: null, hour: null, minute: null, text: m[3] };
  }

  // YYYY-YY(YY) ish (year range)
  m = s.match(/^(\d{4})-\d{2,4}\s*ish[:.!]?\s*(.*)/i);
  if (m) {
    return { year: +m[1], month: null, day: null, hour: null, minute: null, text: m[2] || '' };
  }

  // YYYY ish / YYYY-ish
  m = s.match(/^(\d{4})\s*-?ish\b[:.!]?\s*(.*)/i);
  if (m) {
    return { year: +m[1], month: null, day: null, hour: null, minute: null, text: m[2] || '' };
  }

  // YYYY season text (also handles "2010 spring-ish:", "2010 summer ish:")
  m = s.match(/^(\d{4})\s+(spring|summer|fall|autumn|winter)(?:[- ]?ish)?[:.!]?\s*(.*)/i);
  if (m) {
    return {
      year: +m[1], month: SEASON[m[2].toLowerCase()], day: null,
      hour: null, minute: null, season: m[2].toLowerCase(), text: m[3] || ''
    };
  }

  // Month DDth text (fallback: last seen year in pre section)
  const mp = Object.keys(MM).join('|');
  m = s.match(new RegExp(`^(${mp})\\s+(\\d{1,2})(?:st|nd|rd|th)?[,.]?\\s+(.*)`, 'i'));
  if (m && lastYearInPre) {
    const mk = m[1].toLowerCase();
    if (MM[mk]) {
      return { year: lastYearInPre, month: MM[mk], day: +m[2], hour: null, minute: null, text: m[3] };
    }
  }

  // bare YYYY text
  m = s.match(/^(\d{4})\s+(?!\d)(.*)/);
  if (m && +m[1] >= 1900 && +m[1] <= 2100 && m[2].length > 3) {
    return { year: +m[1], month: null, day: null, hour: null, minute: null, text: m[2] };
  }

  return null;
}

// ── structured parser ──
function parse(text) {
  const lines = text.split('\n');
  const result = {
    framing: [],
    incoming: [],
    yearHeaders: new Map(),
    monthHeaders: new Map(),
    yearSections: new Map(),
    preEntries: [],
    preHeader: null,
    incomingExtras: [],
    lastYearInPre: null,
  };

  let state = 'framing';
  let curYear = null;
  let curMonth = null;
  let curEntry = null;

  const mp = Object.keys(MM).join('|');
  const monthRe = new RegExp(`^(${mp})\\s*['\u2018\u2019\u201A\u201C\u201D]?\\s*(\\d{2,4})?\\s*=+`, 'i');

  function finalizeEntry() {
    if (curEntry) {
      while (curEntry.textLines.length > 0 && curEntry.textLines[curEntry.textLines.length - 1].trim() === '') {
        curEntry.textLines.pop();
      }
      // Destination: year section if fully dated and year has a section, else pre
      if (curEntry.year && curEntry.month && curEntry.day && result.yearHeaders.has(curEntry.year)) {
        const ySec = result.yearSections.get(curEntry.year);
        if (!ySec.has(curEntry.month)) ySec.set(curEntry.month, []);
        ySec.get(curEntry.month).push(curEntry);
      } else {
        result.preEntries.push(curEntry);
      }
      if (curEntry.year) result.lastYearInPre = curEntry.year;
      curEntry = null;
    }
  }

  for (let li = 0; li < lines.length; li++) {
    const raw = lines[li];
    const s = raw.trim();

    // Section markers
    let m = s.match(/^=+\s*(\d{4})\s*=+$/);
    if (m) {
      finalizeEntry();
      curYear = +m[1]; curMonth = null; state = 'year';
      result.yearHeaders.set(curYear, raw);
      if (!result.yearSections.has(curYear)) result.yearSections.set(curYear, new Map());
      continue;
    }
    m = s.match(/^=+\s*pre\s+\d{4}/i);
    if (m) {
      finalizeEntry();
      curYear = null; curMonth = null; state = 'pre';
      result.preHeader = raw;
      continue;
    }
    if (s.match(/^=+\s*INCOMING:?\s*=+/i)) {
      finalizeEntry();
      state = 'incoming';
      continue;
    }

    // Month header
    if (state === 'year') {
      m = s.match(monthRe);
      if (m) {
        finalizeEntry();
        curMonth = MM[m[1].toLowerCase()];
        result.monthHeaders.set(`${curYear}-${curMonth}`, raw);
        continue;
      }
    }

    // Divider line in pre/year state (e.g., "—- general childhood —"):
    // close any current entry and drop the divider
    if ((state === 'pre' || state === 'year') && s && s.match(/^[\-—]/)) {
      finalizeEntry();
      continue;
    }

    // Try parsing as entry
    const entry = tryParseEntry(s, curYear, curMonth, result.lastYearInPre);
    if (entry) {
      finalizeEntry();
      curEntry = { ...entry, textLines: [entry.text] };
      delete curEntry.text;
      continue;
    }

    // Non-entry content routing
    if (state === 'framing') {
      result.framing.push(raw);
    } else if (state === 'incoming') {
      result.incoming.push(raw);
    } else if (curEntry) {
      // continuation of the current entry
      curEntry.textLines.push(raw);
    } else if (s && (state === 'pre' || state === 'year') && !s.match(/^[\-—=]+/) && !s.match(/^poem/i)) {
      // Floating undated text → move to INCOMING
      result.incomingExtras.push(raw);
    }
  }

  finalizeEntry();
  return result;
}

// ── sort ──
function compareEntries(a, b) {
  if (a.year !== b.year) return b.year - a.year;
  const aMo = a.month ?? 0;
  const bMo = b.month ?? 0;
  if (aMo !== bMo) return bMo - aMo;
  const aDay = a.day ?? 0;
  const bDay = b.day ?? 0;
  if (aDay !== bDay) return bDay - aDay;
  const aT = (a.hour ?? 0) * 60 + (a.minute ?? 0);
  const bT = (b.hour ?? 0) * 60 + (b.minute ?? 0);
  return bT - aT;
}

// ── formatters ──
function formatPreEntry(e) {
  const text = e.textLines.join('\n');
  if (e.season) return `${e.year} ${e.season}: ${text}`;
  if (e.month == null) return `${e.year} ish: ${text}`;
  if (e.day == null) return `${e.year}${pad2(e.month)} ${text}`;
  if (e.hour == null || e.minute == null) return `${e.year}${pad2(e.month)}${pad2(e.day)} ${text}`;
  return `${e.year}${pad2(e.month)}${pad2(e.day)}${pad2(e.hour)}${pad2(e.minute)} ${text}`;
}

function formatYearEntry(e) {
  const text = e.textLines.join('\n');
  if (e.hour != null && e.minute != null) {
    return `${pad2(e.day)}${pad2(e.hour)}${pad2(e.minute)}: ${text}`;
  }
  return `${e.day}${ordSuf(e.day)}: ${text}`;
}

// ── emit ──
function emit(p) {
  const out = [];

  // Framing
  for (const l of p.framing) out.push(l);
  while (out.length > 0 && out[out.length - 1].trim() === '') out.pop();
  if (out.length > 0) { out.push(''); out.push(''); }

  // INCOMING
  out.push('== INCOMING: ==');
  for (const l of p.incoming) out.push(l);
  if (p.incomingExtras.length > 0) {
    // Add a blank line separator if incoming had content
    if (p.incoming.length > 0) out.push('');
    for (const l of p.incomingExtras) out.push(l);
  }
  while (out.length > 0 && out[out.length - 1].trim() === '') out.pop();
  out.push(''); out.push('');

  // Year sections (descending)
  const years = Array.from(p.yearSections.keys())
    .filter(y => p.yearHeaders.has(y))
    .sort((a, b) => b - a);

  for (const year of years) {
    const months = p.yearSections.get(year);
    if (!months || months.size === 0) continue;
    out.push(p.yearHeaders.get(year));
    out.push('');

    const monthKeys = Array.from(months.keys()).sort((a, b) => b - a);
    for (const mo of monthKeys) {
      const moHeader = p.monthHeaders.get(`${year}-${mo}`)
        || `${FULL_MO[mo]} '${String(year).slice(2)} ======`;
      out.push(moHeader);
      const sorted = months.get(mo).slice().sort(compareEntries);
      for (const e of sorted) out.push(formatYearEntry(e));
      out.push('');
    }
    out.push('');
  }

  // pre section
  out.push(p.preHeader || '========== pre 2025');
  out.push('');
  const sortedPre = p.preEntries.slice().sort(compareEntries);
  for (const e of sortedPre) out.push(formatPreEntry(e));

  // collapse excess blank lines
  return out.join('\n').replace(/\n{4,}/g, '\n\n\n') + '\n';
}

// ── run ──
const text = fs.readFileSync(INPUT, 'utf8');
const parsed = parse(text);
const output = emit(parsed);
fs.writeFileSync(OUTPUT, output);

// stats
let yearEntries = 0;
const yearCounts = [];
for (const [year, months] of parsed.yearSections) {
  if (!parsed.yearHeaders.has(year)) continue;
  let n = 0;
  for (const entries of months.values()) n += entries.length;
  yearEntries += n;
  yearCounts.push([year, n]);
}
yearCounts.sort((a, b) => b[0] - a[0]);

console.log('Input:  ' + INPUT + ' (' + text.split('\n').length + ' lines, ' + text.length + ' bytes)');
console.log('Output: ' + OUTPUT + ' (' + output.split('\n').length + ' lines, ' + output.length + ' bytes)');
console.log('');
console.log('Parsed:');
console.log('  framing lines:     ' + parsed.framing.length);
console.log('  incoming lines:    ' + parsed.incoming.length + ' (+' + parsed.incomingExtras.length + ' moved from pre)');
for (const [y, n] of yearCounts) console.log('  ' + y + ' entries:      ' + n);
console.log('  pre entries:       ' + parsed.preEntries.length);
console.log('  TOTAL entries:     ' + (yearEntries + parsed.preEntries.length));
