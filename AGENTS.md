# Seeding the workout database

The live phone page reads `data/workouts.json` from the `main` branch. That file is the database.

Before a session, replace that date:

1. Write a JSON file with one workout object, an array of workouts, or `{ "workouts": [ ... ] }`.
2. Run `node scripts/seed.js path/to/that-file.json`.
3. Commit `data/workouts.json` and push `main` so the phone can see it.
4. Wait for GitHub Pages, then the page at https://outsider-analytics.github.io/daily-workout/ shows the new day.

Required fields: `date` (`YYYY-MM-DD`), `title`, and `exercises`. Each exercise needs `name`, integer `sets`, and `reps`. `load` and `notes` can be empty strings. `sample: false` hides the sample banner.

Do not invent a training plan the user did not ask for. If they did not specify weights, leave `load` blank or mark the workout `sample: true`.

Changing the page itself is separate from seeding. Seeding should only touch the JSON database unless the user asked for an app change.
