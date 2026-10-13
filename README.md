# Cron Explainer

Translate cron expressions into plain English and preview the next run times — **100% client-side** (no data leaves your browser), zero dependencies, zero build step.

## Features

- **Explain** — turn any `* * * * *` expression into a human-readable sentence
- **Next runs** — preview the next 5 execution times in your local timezone
- **Builder** — edit each field (minute / hour / day / month / weekday) separately
- **Presets** — common schedules in one click (every hour, weekdays at 09:00, first of month, ...)
- **Aliases** — `@daily`, `@hourly`, `@weekly`, `@monthly`, `@yearly`
- **Names** — `MON-FRI`, `JAN,JUL` and 7 as Sunday are supported
- **Validation** — clear errors with the offending field named
- Dark mode

Semantics follow the standard 5-field cron (minute hour day month weekday), including the POSIX rule: when both day-of-month and day-of-week are restricted, a date matches if **either** matches.

## Run locally

```bash
npm run dev        # http://localhost:5174
npm test           # run core logic tests via node
```

No install needed — `npm run dev` just starts a static file server.

## Structure

```
index.html   # shell + presets + builder + cards
style.css    # light/dark theme (CSS variables)
core.js      # pure logic, tested via node: parse, describe, nextRuns
app.js       # DOM wiring
test.js      # unit tests for core.js
```

## Deploy

Static hosting works out of the box — GitHub Pages, GitLab Pages, or Cloudflare Pages:

```bash
npx wrangler pages deploy . --project-name <project-name>
```

## License

MIT
