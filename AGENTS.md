# Seeding the workout database

The live phone page reads `data/workouts.json` from the `main` branch. That file is the database.

Before a session, replace that date:

1. Write a JSON file with one workout object, an array of workouts, or `{ "workouts": [ ... ] }`.
2. Run `node scripts/seed.js path/to/that-file.json`.
3. Commit `data/workouts.json` and push `main` so the phone can see it.
4. Wait for GitHub Pages, then the page at https://outsider-analytics.github.io/daily-workout/ shows the new day.

Required fields: `date` (`YYYY-MM-DD`), `title`, and `exercises`. Each exercise needs `name`, integer `sets`, and `reps`. `load` and `notes` can be empty strings. `sample: false` hides the sample banner.

The current plan is the lower-leg rehab block for 2026-09-23 through 2026-09-27. Do not replace it with a general lifting week. Do not invent Monday's workout. Leave `load` blank unless the user named a weight.

Reps and weight typed on the phone stay in that browser. They are not in `data/workouts.json`. A replace or delete done on the phone also stays on that phone until the user taps Restore shared plan.

Changing the page itself is separate from seeding. Seeding should only touch the JSON database unless the user asked for an app change.
