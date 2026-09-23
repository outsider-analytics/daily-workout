export function emptyStore() {
  return { version: 1, workouts: [] }
}

export function isISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false
  const [year, month, day] = value.split("-").map(Number)
  const check = new Date(Date.UTC(year, month - 1, day))
  return (
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day
  )
}

export function localISODate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function shiftISODate(isoDate, days) {
  if (!isISODate(isoDate)) throw new Error("date must be YYYY-MM-DD")
  const [year, month, day] = isoDate.split("-").map(Number)
  const shifted = new Date(year, month - 1, day)
  shifted.setDate(shifted.getDate() + days)
  return localISODate(shifted)
}

export function formatLongDate(isoDate) {
  if (!isISODate(isoDate)) throw new Error("date must be YYYY-MM-DD")
  const [year, month, day] = isoDate.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  return {
    weekday: date.toLocaleDateString("en-US", { weekday: "long" }),
    monthDay: date.toLocaleDateString("en-US", { month: "long", day: "numeric" }),
  }
}

function youtubeUrl(value, name) {
  const raw = String(value ?? "").trim()
  if (!raw) return ""
  let url
  try {
    url = new URL(raw)
  } catch {
    throw new Error(`${name}: YouTube link must be a full https URL`)
  }
  const host = url.hostname.replace(/^www\./, "")
  if (url.protocol !== "https:" || !["youtube.com", "m.youtube.com", "youtu.be"].includes(host)) {
    throw new Error(`${name}: link must be a YouTube URL`)
  }
  return url.toString()
}

export function normalizeWorkout(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Workout must be an object")
  }

  const date = String(input.date || "")
  if (!isISODate(date)) throw new Error("date must be a real YYYY-MM-DD day")

  const title = String(input.title || "").trim()
  if (!title) throw new Error("title is required")

  if (!Array.isArray(input.exercises)) throw new Error("exercises must be an array")

  const exercises = input.exercises.map((exercise, index) => {
    const label = `exercise ${index + 1}`
    if (!exercise || typeof exercise !== "object" || Array.isArray(exercise)) {
      throw new Error(`${label} must be an object`)
    }
    const name = String(exercise.name || "").trim()
    if (!name) throw new Error(`${label} needs a name`)
    const sets = Number(exercise.sets)
    if (!Number.isInteger(sets) || sets < 1) {
      throw new Error(`${name}: sets must be a positive integer`)
    }
    const reps = String(exercise.reps ?? "").trim()
    if (!reps) throw new Error(`${name}: reps is required`)
    return {
      name,
      sets,
      reps,
      load: String(exercise.load ?? "").trim(),
      notes: String(exercise.notes ?? "").trim(),
      youtube: youtubeUrl(exercise.youtube, name),
    }
  })

  return {
    date,
    title,
    notes: String(input.notes ?? "").trim(),
    sample: Boolean(input.sample),
    exercises,
  }
}

export function workoutsFromSeed(input) {
  if (Array.isArray(input)) return input
  if (input && Array.isArray(input.workouts)) return input.workouts
  return [input]
}

export function upsertWorkouts(store, seedInput) {
  if (!store || store.version !== 1 || !Array.isArray(store.workouts)) {
    throw new Error("Database must be { version: 1, workouts: [] }")
  }

  const next = {
    version: 1,
    workouts: store.workouts.map((workout) => normalizeWorkout(workout)),
  }
  if (typeof store.guidance === "string" && store.guidance.trim()) {
    next.guidance = store.guidance.trim()
  }

  for (const incoming of workoutsFromSeed(seedInput)) {
    const workout = normalizeWorkout(incoming)
    const index = next.workouts.findIndex((item) => item.date === workout.date)
    if (index >= 0) next.workouts[index] = workout
    else next.workouts.push(workout)
  }

  next.workouts.sort((a, b) => a.date.localeCompare(b.date))
  return next
}

export function workoutForDate(store, isoDate) {
  if (!store || !Array.isArray(store.workouts)) return null
  return store.workouts.find((workout) => workout.date === isoDate) ?? null
}

export function emptyLocalState() {
  return { overrides: {}, logs: {} }
}

export function resolveDay(store, isoDate, localState = emptyLocalState()) {
  const planned = workoutForDate(store, isoDate)
  const overrides = localState?.overrides || {}
  if (Object.prototype.hasOwnProperty.call(overrides, isoDate)) {
    if (overrides[isoDate] == null) return { workout: null, source: "deleted", planned }
    return { workout: normalizeWorkout(overrides[isoDate]), source: "phone", planned }
  }
  return { workout: planned, source: "plan", planned }
}

export function setOverride(localState, workout) {
  const normalized = normalizeWorkout(workout)
  return {
    overrides: { ...(localState?.overrides || {}), [normalized.date]: normalized },
    logs: localState?.logs || {},
  }
}

export function deleteDay(localState, isoDate) {
  if (!isISODate(isoDate)) throw new Error("date must be YYYY-MM-DD")
  return {
    overrides: { ...(localState?.overrides || {}), [isoDate]: null },
    logs: localState?.logs || {},
  }
}

export function clearOverride(localState, isoDate) {
  const overrides = { ...(localState?.overrides || {}) }
  delete overrides[isoDate]
  return { overrides, logs: localState?.logs || {} }
}

export function writeLog(localState, isoDate, exerciseIndex, setIndex, field, value) {
  if (field !== "reps" && field !== "load") throw new Error("unknown log field")
  const logs = { ...(localState?.logs || {}) }
  const day = { ...(logs[isoDate] || {}) }
  const exerciseKey = String(exerciseIndex)
  const setKey = String(setIndex)
  const exercise = { ...(day[exerciseKey] || {}) }
  const set = { reps: "", load: "", ...(exercise[setKey] || {}) }
  set[field] = String(value ?? "")
  exercise[setKey] = set
  day[exerciseKey] = exercise
  logs[isoDate] = day
  return { overrides: { ...(localState?.overrides || {}) }, logs }
}

export function logValue(localState, isoDate, exerciseIndex, setIndex, field) {
  const value = localState?.logs?.[isoDate]?.[String(exerciseIndex)]?.[String(setIndex)]?.[field]
  return value == null ? "" : String(value)
}
