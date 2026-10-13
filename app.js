import { parseCron, describe, nextRuns, formatRun } from "./core.js";

const expr = document.getElementById("expr");
const errorEl = document.getElementById("error");
const explainEl = document.getElementById("explain");
const nextRunsEl = document.getElementById("next-runs");

const fieldInputs = [
  document.getElementById("f-minute"),
  document.getElementById("f-hour"),
  document.getElementById("f-dom"),
  document.getElementById("f-month"),
  document.getElementById("f-dow")
];

let runsTimer = null;

function update(syncBuilder = true) {
  const parsed = parseCron(expr.value);

  if (!parsed.ok) {
    errorEl.textContent = parsed.error.message;
    errorEl.classList.remove("hidden");
    explainEl.textContent = "—";
    nextRunsEl.textContent = "";
    return;
  }

  errorEl.classList.add("hidden");
  explainEl.textContent = describe(parsed);

  if (syncBuilder) {
    const parts = parsed.expression.split(" ");
    fieldInputs.forEach((input, i) => {
      if (document.activeElement !== input) input.value = parts[i];
    });
  }

  clearTimeout(runsTimer);
  runsTimer = setTimeout(() => {
    const runs = nextRuns(parsed, new Date(), 5);
    nextRunsEl.textContent = "";
    for (const run of runs) {
      const li = document.createElement("li");
      li.textContent = formatRun(run);
      nextRunsEl.appendChild(li);
    }
    if (runs.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No matching date in the next 5 years";
      nextRunsEl.appendChild(li);
    }
  }, 120);
}

expr.addEventListener("input", () => update(true));

fieldInputs.forEach((input, i) => {
  input.addEventListener("input", () => {
    const parts = expr.value.trim().split(/\s+/);
    while (parts.length < 5) parts.push("*");
    parts[i] = input.value.trim() || "*";
    expr.value = parts.slice(0, 5).join(" ");
    update(false);
    const parsed = parseCron(expr.value);
    if (parsed.ok) {
      const normalized = parsed.expression.split(" ");
      fieldInputs.forEach((el, j) => {
        if (document.activeElement !== el) el.value = normalized[j];
      });
    }
  });
});

document.querySelectorAll("#presets .chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    expr.value = chip.dataset.expr;
    update(true);
  });
});

document.getElementById("btn-theme").addEventListener("click", () => {
  const root = document.documentElement;
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  localStorage.setItem("theme", next);
});

const savedTheme = localStorage.getItem("theme");
if (savedTheme) document.documentElement.dataset.theme = savedTheme;

update(true);
