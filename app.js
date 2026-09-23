import { formatLongDate, isISODate, localISODate, shiftISODate, workoutForDate } from "./lib/workouts.js"

const app = document.querySelector("#app")
const today = localISODate()
const requested = new URLSearchParams(location.search).get("date")
const selected = isISODate(requested) ? requested : today

try {
  const response = await fetch(`./data/workouts.json?ts=${Date.now()}`, { cache: "no-store" })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  render(await response.json(), selected, today)
} catch {
  app.innerHTML = `<p class="status">The workout list didn’t load. Refresh and try again.</p>`
}

function render(store, isoDate, todayDate) {
  const workout = workoutForDate(store, isoDate)
  const when = formatLongDate(isoDate)
  const viewingToday = isoDate === todayDate
  document.title = viewingToday ? "Today’s workout" : when.weekday

  app.innerHTML = `
    <p class="kicker">${viewingToday ? "Today" : "Planned"}</p>
    <h1>${escapeHtml(workout ? workout.title : "Nothing planned")}</h1>
    <p class="when">${escapeHtml(when.weekday)} · ${escapeHtml(when.monthDay)}</p>
    ${workout?.sample ? `<p class="banner">Sample session. Replace it before you train.</p>` : ""}
    ${workout?.notes ? `<p class="notes">${escapeHtml(workout.notes)}</p>` : ""}
    ${body(workout)}
    ${nav(isoDate, todayDate)}
  `
}

function body(workout) {
  if (!workout) {
    return `<section class="empty"><p>Nothing is saved for this date yet.</p></section>`
  }
  if (workout.exercises.length === 0) {
    return `<section class="rest"><p>Rest day. No exercises on the card.</p></section>`
  }

  const items = workout.exercises.map((exercise, index) => `
    <li class="exercise">
      <h2><span class="index">${String(index + 1).padStart(2, "0")}</span>${escapeHtml(exercise.name)}</h2>
      ${exercise.notes ? `<p class="cue">${escapeHtml(exercise.notes)}</p>` : ""}
      <div class="stats">
        <div class="stat"><b>${escapeHtml(exercise.sets)}</b><span>Sets</span></div>
        <div class="stat"><b>${escapeHtml(exercise.reps)}</b><span>Target</span></div>
        <div class="stat"><b>${escapeHtml(exercise.load || "—")}</b><span>Load</span></div>
      </div>
    </li>
  `).join("")

  return `<ol class="exercises">${items}</ol>`
}

function nav(isoDate, todayDate) {
  const previous = shiftISODate(isoDate, -1)
  const next = shiftISODate(isoDate, 1)
  const todayClass = isoDate === todayDate ? "today-link is-current" : "today-link"
  const todayLabel = isoDate === todayDate ? "Today" : "Back to today"
  return `
    <nav class="day-nav" aria-label="Choose day">
      <a href="./?date=${previous}">${escapeHtml(formatLongDate(previous).weekday.slice(0, 3))}</a>
      <a class="${todayClass}" href="./">${todayLabel}</a>
      <a href="./?date=${next}">${escapeHtml(formatLongDate(next).weekday.slice(0, 3))}</a>
    </nav>
  `
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
