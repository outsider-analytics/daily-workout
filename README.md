# Daily workout

Phone page for the workout saved on today's date. The shared plan is `data/workouts.json`.

Open it at:

https://outsider-analytics.github.io/daily-workout/

The page uses the phone's local date. Watch opens a YouTube demo for that exercise. Each set has a reps box and a weight box. Those numbers stay in this phone's browser. Replace swaps that day for a workout you type in. Delete removes it. Restore shared plan brings back the copy from the database.

This week is the lower-leg rehab block for September 23–27. No running. Pain during training stays at 0–3/10.

## Seed a day

Put one workout in a JSON file (copy `seed/example-day.json`), then:

```bash
node scripts/seed.js path/to/day.json
```

That replaces the workout for that date and leaves every other day alone. Commit `data/workouts.json` and push `main`. Refresh the phone after GitHub Pages finishes, usually within a minute.

A workout looks like this:

```json
{
  "date": "2026-09-28",
  "title": "Full body",
  "sample": false,
  "notes": "",
  "exercises": [
    { "name": "Goblet squat", "sets": 3, "reps": "8", "load": "40 lb", "notes": "" }
  ]
}
```

`reps` is text, so `8-10`, `10 / leg`, and `40 sec` are all fine. Use an empty `exercises` array for a rest day. Set `sample` to false once the session is the real one.

## Local preview

```bash
node scripts/serve.js
```

Then open http://127.0.0.1:4173

## Tests

```bash
node --test
```

This site is public, including the workout file. Don't put private notes in the database.
