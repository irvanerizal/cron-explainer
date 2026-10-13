export const ALIASES = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *"
};

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const FIELD_META = [
  { name: "minute", min: 0, max: 59 },
  { name: "hour", min: 0, max: 23 },
  { name: "day of month", min: 1, max: 31 },
  { name: "month", min: 1, max: 12, names: { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 } },
  { name: "day of week", min: 0, max: 7, names: { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 } }
];

function parseField(spec, meta) {
  const values = new Set();
  let usedStep = false;

  for (const part of spec.split(",")) {
    if (!part) return { ok: false, message: "empty item" };

    const pieces = part.split("/");
    if (pieces.length > 2) return { ok: false, message: `invalid step in "${part}"` };

    let step = 1;
    if (pieces[1] !== undefined) {
      usedStep = true;
      step = Number(pieces[1]);
      if (!Number.isInteger(step) || step < 1) return { ok: false, message: `invalid step "${pieces[1]}"` };
    }

    let start = meta.min;
    let end = meta.max;
    const range = pieces[0];

    if (range !== "*") {
      if (range.includes("-")) {
        const [a, b] = range.split("-");
        const parsed = parseValue(a, meta);
        if (!parsed.ok) return parsed;
        start = parsed.value;
        const parsedEnd = parseValue(b, meta);
        if (!parsedEnd.ok) return parsedEnd;
        end = parsedEnd.value;
        if (start > end) return { ok: false, message: `range "${range}" is reversed` };
      } else {
        const parsed = parseValue(range, meta);
        if (!parsed.ok) return parsed;
        start = parsed.value;
        end = pieces[1] !== undefined ? meta.max : start;
      }
    }

    for (let v = start; v <= end; v += step) values.add(v);
  }

  return { ok: true, values, usedStep };
}

function parseValue(token, meta) {
  const lower = token.toLowerCase();
  if (meta.names && lower in meta.names) return { ok: true, value: meta.names[lower] };
  const n = Number(token);
  if (!Number.isInteger(n) || n < meta.min || n > meta.max) {
    return { ok: false, message: `"${token}" is out of range (${meta.min}-${meta.max})` };
  }
  return { ok: true, value: n };
}

export function parseCron(expression) {
  const trimmed = String(expression ?? "").trim();
  if (!trimmed) return { ok: false, error: { message: "Expression is empty" } };

  const lower = trimmed.toLowerCase();
  const expanded = lower in ALIASES ? ALIASES[lower] : trimmed;
  const parts = expanded.split(/\s+/);

  if (parts.length !== 5) {
    return { ok: false, error: { message: `Expected 5 fields, got ${parts.length}` } };
  }

  const fields = [];
  const steps = [];
  for (let i = 0; i < 5; i++) {
    const result = parseField(parts[i], FIELD_META[i]);
    if (!result.ok) {
      return { ok: false, error: { message: `Invalid ${FIELD_META[i].name} field: ${result.message}` } };
    }
    fields.push(result.values);
    steps.push(result.usedStep);
  }

  const dows = fields[4];
  if (dows.has(7)) {
    dows.add(0);
    dows.delete(7);
  }

  return {
    ok: true,
    fields,
    steps,
    expression: parts.join(" "),
    domRestricted: parts[2] !== "*",
    dowRestricted: parts[4] !== "*"
  };
}

function valueLabel(fieldIndex, value) {
  if (fieldIndex === 3) return MONTH_NAMES[value - 1];
  if (fieldIndex === 4) return DOW_NAMES[value];
  return String(value);
}

function describeValues(fieldIndex, values) {
  const sorted = [...values].sort((a, b) => a - b);
  const contiguous = sorted.every((v, i) => i === 0 || v === sorted[i - 1] + 1);
  if (contiguous && sorted.length > 2) {
    return `${valueLabel(fieldIndex, sorted[0])} through ${valueLabel(fieldIndex, sorted[sorted.length - 1])}`;
  }
  return sorted.map((v) => valueLabel(fieldIndex, v)).join(", ");
}

function isAllValues(fieldIndex, values) {
  const total = fieldIndex === 4 ? 7 : FIELD_META[fieldIndex].max - FIELD_META[fieldIndex].min + 1;
  return values.size === total;
}

function stepOf(fieldIndex, values) {
  const meta = FIELD_META[fieldIndex];
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length < 2 || sorted[0] !== meta.min) return null;

  const step = sorted[1] - sorted[0];
  if (step < 2) return null;

  const expected = new Set();
  for (let v = meta.min; v <= meta.max; v += step) expected.add(v);
  if (expected.size !== values.size) return null;
  for (const v of expected) if (!values.has(v)) return null;

  return step;
}

const ALL_TEXT = ["every minute", "past every hour", "every day", "", ""];

function singleText(fieldIndex, value) {
  switch (fieldIndex) {
    case 0: return `at minute ${value}`;
    case 1: return `past hour ${value}`;
    case 2: return `on day ${value} of the month`;
    case 3: return `in ${valueLabel(3, value)}`;
    case 4: return `only on ${valueLabel(4, value)}`;
  }
}

function listText(fieldIndex, values) {
  const desc = describeValues(fieldIndex, values);
  switch (fieldIndex) {
    case 0: return `at minutes ${desc}`;
    case 1: return `past hours ${desc}`;
    case 2: return `on days ${desc} of the month`;
    case 3: return `in ${desc}`;
    case 4: return `only on ${desc}`;
  }
}

function stepText(fieldIndex, step) {
  switch (fieldIndex) {
    case 0: return `every ${step} minutes`;
    case 1: return `every ${step} hours`;
    case 2: return `every ${step} days`;
    case 3: return `every ${step} months`;
    case 4: return `every ${step} weekdays`;
  }
}

function segment(fieldIndex, values, usedStep) {
  if (isAllValues(fieldIndex, values)) return { type: "all", text: ALL_TEXT[fieldIndex] };

  const step = usedStep ? stepOf(fieldIndex, values) : null;
  if (step) return { type: "step", step, text: stepText(fieldIndex, step) };

  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) {
    return { type: "single", value: sorted[0], text: singleText(fieldIndex, sorted[0]) };
  }
  return { type: "list", text: listText(fieldIndex, sorted) };
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

export function describe(parsed) {
  const [minutes, hours, doms, months, dows] = parsed.fields;
  const steps = parsed.steps ?? [false, false, false, false, false];
  const m = segment(0, minutes, steps[0]);
  const h = segment(1, hours, steps[1]);
  const d = segment(2, doms, steps[2]);
  const mo = segment(3, months, steps[3]);
  const w = segment(4, dows, steps[4]);

  let head;
  if (m.type === "all") {
    head = "Every minute";
  } else if (m.type === "step" && h.type === "all") {
    head = `Every ${m.step} minutes`;
  } else if (m.type === "step" && h.type === "single") {
    head = `Every ${m.step} minutes past hour ${h.value}`;
  } else if (m.type === "single" && h.type === "single") {
    head = `At ${pad2(h.value)}:${pad2(m.value)}`;
  } else if (m.type === "single" && h.type === "all") {
    head = `At minute ${m.value} past every hour`;
  } else if (m.type === "single") {
    head = `At minute ${m.value} past ${h.text}`;
  } else if (m.type === "step") {
    head = `${capitalize(m.text)} past ${h.text}`;
  } else {
    head = `${capitalize(m.text)} past ${h.text}`;
  }

  const parts = [head, d.text, mo.text, w.text].filter(Boolean);
  return `${parts.join(", ")}.`;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function nextRuns(parsed, from, count = 5) {
  const [minutes, hours, doms, months, dows] = parsed.fields;

  const cursor = new Date(from);
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);

  const limit = new Date(from);
  limit.setFullYear(limit.getFullYear() + 5);

  const results = [];
  while (cursor <= limit && results.length < count) {
    if (!months.has(cursor.getMonth() + 1)) {
      cursor.setMonth(cursor.getMonth() + 1, 1);
      cursor.setHours(0, 0, 0, 0);
      continue;
    }

    const domOk = doms.has(cursor.getDate());
    const dowOk = dows.has(cursor.getDay());
    const dayOk = parsed.domRestricted && parsed.dowRestricted ? domOk || dowOk : domOk && dowOk;
    if (!dayOk) {
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(0, 0, 0, 0);
      continue;
    }

    if (!hours.has(cursor.getHours())) {
      cursor.setHours(cursor.getHours() + 1, 0, 0, 0);
      continue;
    }

    if (!minutes.has(cursor.getMinutes())) {
      cursor.setMinutes(cursor.getMinutes() + 1);
      continue;
    }

    results.push(new Date(cursor));
    cursor.setMinutes(cursor.getMinutes() + 1);
  }

  return results;
}

const WEEKDAY_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatRun(date) {
  const day = WEEKDAY_LABEL[date.getDay()];
  return `${day}, ${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}
