import { parseCron, describe, nextRuns, formatRun, ALIASES } from "./core.js";
import assert from "node:assert";

const every = parseCron("* * * * *");
assert.ok(every.ok);
assert.strictEqual(describe(every), "Every minute, every day.");

const hourly = parseCron("0 * * * *");
assert.ok(hourly.ok);
assert.strictEqual(describe(hourly), "At minute 0 past every hour, every day.");

const five = parseCron("*/5 * * * *");
assert.ok(five.ok);
assert.strictEqual(describe(five), "Every 5 minutes, every day.");

const daily = parseCron("30 14 * * *");
assert.ok(daily.ok);
assert.strictEqual(describe(daily), "At 14:30, every day.");

const monday = parseCron("0 0 * * 1");
assert.ok(monday.ok);
assert.strictEqual(describe(monday), "At 00:00, every day, only on Monday.");

const weekday = parseCron("0 9 * * 1-5");
assert.ok(weekday.ok);
assert.ok(describe(weekday).includes("Monday through Friday"));

const first = parseCron("0 0 1 * *");
assert.ok(first.ok);
assert.ok(describe(first).includes("on day 1 of the month"));

const feb = parseCron("0 0 29 2 *");
assert.ok(feb.ok);
assert.ok(describe(feb).includes("in February"));

const named = parseCron("0 9 * * MON-FRI");
assert.ok(named.ok);
assert.ok(describe(named).includes("Monday through Friday"));

const months = parseCron("0 0 1 JAN,JUL *");
assert.ok(months.ok);
assert.ok(describe(months).includes("January, July"));

const dow7 = parseCron("0 0 * * 7");
assert.ok(dow7.ok);
assert.ok(describe(dow7).includes("Sunday"));

const alias = parseCron("@daily");
assert.ok(alias.ok);
assert.strictEqual(alias.expression, ALIASES["@daily"]);
assert.ok(parseCron("@hourly").ok);
assert.ok(parseCron("@weekly").ok);

assert.strictEqual(parseCron("").ok, false);
assert.strictEqual(parseCron("* * * *").ok, false);
assert.strictEqual(parseCron("61 * * * *").ok, false);
assert.strictEqual(parseCron("* 24 * * *").ok, false);
assert.strictEqual(parseCron("* * 0 * *").ok, false);
assert.strictEqual(parseCron("* * * 13 *").ok, false);
assert.strictEqual(parseCron("* * * * 8").ok, false);
assert.strictEqual(parseCron("*/0 * * * *").ok, false);
assert.strictEqual(parseCron("5-1 * * * *").ok, false);
assert.ok(parseCron("61 * * * *").error.message.includes("minute"));

const runsEveryMin = nextRuns(every, new Date(2026, 9, 12, 14, 30, 0), 3);
assert.strictEqual(formatRun(runsEveryMin[0]), "Mon, 2026-10-12 14:31");
assert.strictEqual(formatRun(runsEveryMin[2]), "Mon, 2026-10-12 14:33");

const runsHourly = nextRuns(hourly, new Date(2026, 9, 12, 14, 30, 0), 2);
assert.strictEqual(formatRun(runsHourly[0]), "Mon, 2026-10-12 15:00");
assert.strictEqual(formatRun(runsHourly[1]), "Mon, 2026-10-12 16:00");

const runsDaily = nextRuns(daily, new Date(2026, 9, 12, 14, 30, 0), 2);
assert.strictEqual(formatRun(runsDaily[0]), "Tue, 2026-10-13 14:30");
assert.strictEqual(formatRun(runsDaily[1]), "Wed, 2026-10-14 14:30");

const runsFeb29 = nextRuns(feb, new Date(2026, 0, 1, 0, 0, 0), 1);
assert.strictEqual(formatRun(runsFeb29[0]), "Tue, 2028-02-29 00:00");

const orSemantics = parseCron("0 0 13 * 5");
assert.ok(orSemantics.ok);
const orRuns = nextRuns(orSemantics, new Date(2026, 9, 12, 12, 0, 0), 4);
for (const run of orRuns) {
  assert.ok(run.getDate() === 13 || run.getDay() === 5, `unexpected run ${formatRun(run)}`);
}

const runsMidnight = nextRuns(parseCron("0 0 * * *"), new Date(2026, 9, 31, 23, 30, 0), 1);
assert.strictEqual(formatRun(runsMidnight[0]), "Sun, 2026-11-01 00:00");

console.log("semua test lolos");
