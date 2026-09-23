import {
  clearOverride,
  deleteDay,
  formatLongDate,
  isISODate,
  localISODate,
  logValue,
  resolveDay,
  setOverride,
  shiftISODate,
  writeLog,
} from "./lib/workouts.js"

const STORAGE_KEY = "daily-workout-log-v1"
const app = document.querySelector("#app")
const today = localISODate()
const requested = new URLSearchParams(location.search).get("date")
const selectedDate = isISODate(requested) ? requested : today

let store = null
let localState = loadState()
let view = { mode: "view", confirmDelete: false, error: "", draft: null }

bind()

try {
  const response = await fetch(`./data/workouts.json?ts=${Date.now()}`, { cache: "no-store" })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  store = await response.json()
  renderApp()
} catch {
  app.innerHTML = `<p class="status">The workout list didn’t load. Refresh and try again.</p>`
}

function renderApp() {
  const when = formatLongDate(selectedDate)
  const viewingToday = selectedDate === today
  const day = resolveDay(store, selectedDate, localState)
  document.title = viewingToday ? "Today’s workout" : when.weekday

  if (view.mode === "edit") {
    app.innerHTML = `
      <p class="kicker">Edit</p>
      <h1>Replace workout</h1>
      <p class="when">${escapeHtml(when.weekday)} · ${escapeHtml(when.monthDay)}</p>
      ${editor(view.draft)}
      ${nav()}
    `
    return
  }

  const workout = day.workout
  app.innerHTML = `
    <p class="kicker">${viewingToday ? "Today" : "Planned"}</p>
    <h1>${escapeHtml(workout ? workout.title : "Nothing planned")}</h1>
    <p class="when">${escapeHtml(when.weekday)} · ${escapeHtml(when.monthDay)}</p>
    ${store.guidance ? `<p class="guidance">${escapeHtml(store.guidance)}</p>` : ""}
    ${day.source === "phone" ? `<p class="banner">This day is the version saved on this phone.</p>` : ""}
    ${workout?.notes ? `<p class="notes">${escapeHtml(workout.notes)}</p>` : ""}
    ${actions(day)}
    ${body(workout)}
    <p class="local-note">Reps and weight stay on this phone.</p>
    ${nav()}
  `
}

function body(workout) {
  if (!workout) {
    return `<section class="empty"><p>Nothing is planned for this date.</p></section>`
  }
  if (workout.exercises.length === 0) {
    return `<section class="rest"><p>Rest day. No exercises on the card.</p></section>`
  }

  const items = workout.exercises.map((exercise, exerciseIndex) => {
    const sets = Array.from({ length: exercise.sets }, (_, setIndex) => {
      const reps = logValue(localState, selectedDate, exerciseIndex, setIndex, "reps")
      const load = logValue(localState, selectedDate, exerciseIndex, setIndex, "load")
      return `
        <div class="set-row">
          <span class="set-no">${setIndex + 1}</span>
          <label class="field">Reps
            <input data-log data-date="${selectedDate}" data-exercise="${exerciseIndex}" data-set="${setIndex}" data-field="reps" inputmode="decimal" autocomplete="off" placeholder="${escapeHtml(exercise.reps)}" value="${escapeHtml(reps)}">
          </label>
          <label class="field">Weight
            <input data-log data-date="${selectedDate}" data-exercise="${exerciseIndex}" data-set="${setIndex}" data-field="load" inputmode="decimal" autocomplete="off" placeholder="${escapeHtml(exercise.load || "weight")}" value="${escapeHtml(load)}">
          </label>
        </div>
      `
    }).join("")

    const prescription = [
      `${exercise.sets} sets`,
      exercise.reps,
      exercise.load,
    ].filter(Boolean).join(" · ")

    const watch = exercise.youtube
      ? `<a class="watch" href="${escapeHtml(exercise.youtube)}" target="_blank" rel="noopener noreferrer">Watch</a>`
      : ""

    return `
      <li class="exercise">
        <div class="exercise-head">
          <h2><span class="index">${String(exerciseIndex + 1).padStart(2, "0")}</span>${escapeHtml(exercise.name)}</h2>
          ${watch}
        </div>
        <p class="cue">${escapeHtml(prescription)}${exercise.notes ? ` · ${escapeHtml(exercise.notes)}` : ""}</p>
        <div class="set-list">${sets}</div>
      </li>
    `
  }).join("")

  return `<ol class="exercises">${items}</ol>`
}

function actions(day) {
  const restore = day.source !== "plan" && day.planned
    ? `<button type="button" data-action="restore">Restore shared plan</button>`
    : ""
  if (!day.workout) {
    return `
      <div class="actions">
        <button type="button" class="primary" data-action="edit">Add a workout</button>
        ${restore}
      </div>
    `
  }
  const remove = view.confirmDelete
    ? `<button type="button" class="danger" data-action="delete">Tap again to delete</button>`
    : `<button type="button" data-action="delete">Delete</button>`
  return `
    <div class="actions">
      <button type="button" data-action="edit">Replace</button>
      ${remove}
      ${restore}
    </div>
  `
}

function editor(draft) {
  const rows = draft.exercises.map((exercise, index) => `
    <div class="editor-exercise" data-exercise>
      <label class="field">Exercise
        <input name="name" autocomplete="off" value="${escapeHtml(exercise.name)}">
      </label>
      <div class="editor-grid">
        <label class="field">Sets
          <input name="sets" inputmode="numeric" autocomplete="off" value="${escapeHtml(exercise.sets)}">
        </label>
        <label class="field">Target
          <input name="reps" autocomplete="off" value="${escapeHtml(exercise.reps)}">
        </label>
        <label class="field">Load
          <input name="load" autocomplete="off" value="${escapeHtml(exercise.load)}">
        </label>
      </div>
      <label class="field">Note
        <input name="cue" autocomplete="off" value="${escapeHtml(exercise.notes)}">
      </label>
      <label class="field">YouTube
        <input name="youtube" inputmode="url" autocomplete="off" placeholder="https://www.youtube.com/watch?v=..." value="${escapeHtml(exercise.youtube || "")}">
      </label>
      <button type="button" data-action="remove-exercise" data-index="${index}">Remove exercise</button>
    </div>
  `).join("")

  return `
    <form class="editor" id="editor">
      <label class="field">Title
        <input name="title" autocomplete="off" value="${escapeHtml(draft.title)}">
      </label>
      <label class="field">Notes
        <textarea name="notes" rows="3">${escapeHtml(draft.notes)}</textarea>
      </label>
      ${rows}
      ${view.error ? `<p class="form-error">${escapeHtml(view.error)}</p>` : ""}
      <div class="actions">
        <button type="button" data-action="add-exercise">Add exercise</button>
        <button type="submit" class="primary">Save</button>
        <button type="button" data-action="cancel">Cancel</button>
      </div>
    </form>
  `
}

function nav() {
  const previous = shiftISODate(selectedDate, -1)
  const next = shiftISODate(selectedDate, 1)
  const todayClass = selectedDate === today ? "today-link is-current" : "today-link"
  const todayLabel = selectedDate === today ? "Today" : "Back to today"
  return `
    <nav class="day-nav" aria-label="Choose day">
      <a href="./?date=${previous}">${escapeHtml(formatLongDate(previous).weekday.slice(0, 3))}</a>
      <a class="${todayClass}" href="./">${todayLabel}</a>
      <a href="./?date=${next}">${escapeHtml(formatLongDate(next).weekday.slice(0, 3))}</a>
    </nav>
  `
}

function bind() {
  app.addEventListener("input", (event) => {
    const input = event.target.closest("[data-log]")
    if (!input || !store) return
    try {
      persist(writeLog(
        localState,
        input.dataset.date,
        input.dataset.exercise,
        input.dataset.set,
        input.dataset.field,
        input.value,
      ))
    } catch {
      // Keep the typed value even if this browser refuses storage.
    }
  })

  app.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]")
    if (!button || !store) return
    const action = button.dataset.action
    if (action === "edit") openEditor()
    if (action === "cancel") {
      view = { mode: "view", confirmDelete: false, error: "", draft: null }
      renderApp()
    }
    if (action === "delete") removeDay()
    if (action === "restore") {
      persist(clearOverride(localState, selectedDate))
      view = { mode: "view", confirmDelete: false, error: "", draft: null }
      renderApp()
    }
    if (action === "add-exercise") {
      const draft = readDraft(document.querySelector("#editor"))
      draft.exercises.push({ name: "", sets: 3, reps: "10", load: "", notes: "", youtube: "" })
      view = { ...view, draft, error: "" }
      renderApp()
    }
    if (action === "remove-exercise") {
      const draft = readDraft(document.querySelector("#editor"))
      draft.exercises.splice(Number(button.dataset.index), 1)
      view = { ...view, draft, error: "" }
      renderApp()
    }
  })

  app.addEventListener("submit", (event) => {
    const form = event.target
    if (form.id !== "editor") return
    event.preventDefault()
    const draft = readDraft(form)
    try {
      persist(setOverride(localState, draft))
      view = { mode: "view", confirmDelete: false, error: "", draft: null }
      renderApp()
    } catch (error) {
      view = { mode: "edit", confirmDelete: false, error: error.message, draft }
      renderApp()
    }
  })
}

function openEditor() {
  const day = resolveDay(store, selectedDate, localState)
  const draft = day.workout
    ? structuredClone(day.workout)
    : {
        date: selectedDate,
        title: "",
        notes: "",
        sample: false,
        exercises: [{ name: "", sets: 3, reps: "10", load: "", notes: "", youtube: "" }],
      }
  view = { mode: "edit", confirmDelete: false, error: "", draft }
  renderApp()
}

function removeDay() {
  if (!view.confirmDelete) {
    view = { ...view, confirmDelete: true }
    renderApp()
    return
  }
  persist(deleteDay(localState, selectedDate))
  view = { mode: "view", confirmDelete: false, error: "", draft: null }
  renderApp()
}

function readDraft(form) {
  return {
    date: selectedDate,
    title: form.elements.title.value,
    notes: form.elements.notes.value,
    sample: false,
    exercises: [...form.querySelectorAll("[data-exercise]")].map((row) => ({
      name: row.querySelector("[name=name]").value,
      sets: row.querySelector("[name=sets]").value,
      reps: row.querySelector("[name=reps]").value,
      load: row.querySelector("[name=load]").value,
      notes: row.querySelector("[name=cue]").value,
      youtube: row.querySelector("[name=youtube]").value,
    })),
  }
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "")
    if (!parsed || typeof parsed !== "object") return { overrides: {}, logs: {} }
    return {
      overrides: parsed.overrides && typeof parsed.overrides === "object" ? parsed.overrides : {},
      logs: parsed.logs && typeof parsed.logs === "object" ? parsed.logs : {},
    }
  } catch {
    return { overrides: {}, logs: {} }
  }
}

function persist(next) {
  localState = next
  localStorage.setItem(STORAGE_KEY, JSON.stringify(localState))
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character])
}
