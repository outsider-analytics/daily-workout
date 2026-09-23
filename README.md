# Daily workout

Phone page for the workout saved on today's date. The database is `data/workouts.json`.

Once this is on GitHub Pages, open:

https://outsider-analytics.github.io/daily-workout/

Add it to your home screen from Safari if you want an icon. The page uses the phone's local date. Use the day links to look at yesterday or tomorrow.

The week already in the database is a **sample**. Weights are placeholders.

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
