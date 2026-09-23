import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import {
  clearOverride,
  deleteDay,
  emptyStore,
  formatLongDate,
  logValue,
  resolveDay,
  setOverride,
  shiftISODate,
  upsertWorkouts,
  workoutForDate,
  writeLog,
} from "../lib/workouts.js"

const root = path.resolve(import.meta.dirname, "..")

test("wednesday date formatting stays on the local calendar day", () => {
  assert.equal(formatLongDate("2026-09-23").weekday, "Wednesday")
  assert.equal(formatLongDate("2026-09-23").monthDay, "September 23")
  assert.equal(shiftISODate("2026-09-30", 1), "2026-10-01")
})

test("seeding replaces one date and keeps the others", () => {
  const store = upsertWorkouts(emptyStore(), {
    date: "2026-09-23",
    title: "Upper",
    exercises: [{ name: "Bench press", sets: 4, reps: "6", load: "135 lb" }],
  })
  const replaced = upsertWorkouts(store, {
    date: "2026-09-23",
    title: "Easy upper",
    exercises: [{ name: "Push-up", sets: 3, reps: "10", load: "bodyweight" }],
  })
  const withNext = upsertWorkouts(replaced, {
    date: "2026-09-24",
    title: "Lower",
    exercises: [{ name: "Squat", sets: 3, reps: "5", load: "185 lb" }],
  })

  assert.equal(workoutForDate(withNext, "2026-09-23").title, "Easy upper")
  assert.equal(workoutForDate(withNext, "2026-09-24").title, "Lower")
  assert.deepEqual(
    withNext.workouts.map((workout) => workout.date),
    ["2026-09-23", "2026-09-24"],
  )
})

test("a YouTube link is kept and any other link is rejected", () => {
  const store = upsertWorkouts(emptyStore(), {
    date: "2026-09-23",
    title: "Lower-leg capacity",
    exercises: [{
      name: "Straight-knee calf raise",
      sets: 3,
      reps: "8-10",
      youtube: "https://youtu.be/gw_a90PqMqk",
    }],
  })
  assert.equal(store.workouts[0].exercises[0].youtube, "https://youtu.be/gw_a90PqMqk")
  assert.throws(
    () => upsertWorkouts(emptyStore(), {
      date: "2026-09-23",
      title: "Lower-leg capacity",
      exercises: [{ name: "Calf raise", sets: 1, reps: "8", youtube: "https://example.com/video" }],
    }),
    /YouTube/,
  )
})

test("bad dates and missing exercises fail before anything is written", () => {
  assert.throws(() => upsertWorkouts(emptyStore(), { date: "2026-02-31", title: "Nope", exercises: [] }), /real YYYY-MM-DD/)
  assert.throws(
    () => upsertWorkouts(emptyStore(), { date: "2026-09-23", title: "Upper", exercises: [{ name: "", sets: 1, reps: "5" }] }),
    /needs a name/,
  )
})

test("a logged set and a replaced day stay on the phone copy", () => {
  let state = writeLog({ overrides: {}, logs: {} }, "2026-09-23", 0, 1, "reps", "9")
  state = writeLog(state, "2026-09-23", 0, 1, "load", "25")
  assert.equal(logValue(state, "2026-09-23", 0, 1, "reps"), "9")
  assert.equal(logValue(state, "2026-09-23", 0, 0, "load"), "")

  const store = upsertWorkouts(emptyStore(), {
    date: "2026-09-23",
    title: "Lower-leg capacity",
    exercises: [{ name: "Straight-knee calf raise", sets: 3, reps: "8-10", notes: "RPE 7" }],
  })
  const replaced = setOverride(state, {
    date: "2026-09-23",
    title: "Shorter calf day",
    exercises: [{ name: "Bent-knee soleus", sets: 2, reps: "10", load: "" }],
  })
  assert.equal(resolveDay(store, "2026-09-23", replaced).workout.title, "Shorter calf day")
  assert.equal(resolveDay(store, "2026-09-23", replaced).source, "phone")

  const removed = deleteDay(replaced, "2026-09-23")
  assert.equal(resolveDay(store, "2026-09-23", removed).workout, null)
  assert.equal(resolveDay(store, "2026-09-23", clearOverride(removed, "2026-09-23")).workout.title, "Lower-leg capacity")
})

test("the checked-in week is the rehab block and the seed script can replace a day", () => {
  const live = JSON.parse(fs.readFileSync(path.join(root, "data", "workouts.json"), "utf8"))
  assert.match(live.guidance, /Skip running/)
  assert.equal(workoutForDate(live, "2026-09-23").title, "Lower-leg capacity")
  assert.equal(workoutForDate(live, "2026-09-23").exercises[0].name, "Straight-knee calf raise")
  assert.equal(workoutForDate(live, "2026-09-23").exercises[0].sets, 3)
  assert.equal(
    workoutForDate(live, "2026-09-23").exercises[0].youtube,
    "https://www.youtube.com/watch?v=gw_a90PqMqk",
  )
  assert.ok(live.workouts.every((workout) => workout.exercises.every((exercise) => exercise.youtube.startsWith("https://www.youtube.com/watch?v="))))
  assert.equal(workoutForDate(live, "2026-09-27").title, "Recovery")
  assert.equal(workoutForDate(live, "2026-09-21"), null)

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "daily-workout-"))
  const dbPath = path.join(dir, "workouts.json")
  fs.copyFileSync(path.join(root, "data", "workouts.json"), dbPath)
  const dayPath = path.join(dir, "day.json")
  fs.writeFileSync(
    dayPath,
    JSON.stringify({
      date: "2026-09-23",
      title: "Custom upper",
      sample: false,
      exercises: [{ name: "Dip", sets: 3, reps: "8", load: "bodyweight", notes: "" }],
    }),
  )

  const result = spawnSync(process.execPath, ["scripts/seed.js", dayPath], {
    cwd: root,
    env: { ...process.env, WORKOUT_DB: dbPath },
    encoding: "utf8",
  })
  assert.equal(result.status, 0, result.stderr)
  const saved = JSON.parse(fs.readFileSync(dbPath, "utf8"))
  assert.equal(workoutForDate(saved, "2026-09-23").title, "Custom upper")
  assert.equal(workoutForDate(saved, "2026-09-24").title, "Easy day")
  assert.match(saved.guidance, /Skip running/)
  fs.rmSync(dir, { recursive: true, force: true })
})
