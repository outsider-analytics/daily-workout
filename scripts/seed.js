import fs from "node:fs"
import path from "node:path"
import { emptyStore, upsertWorkouts } from "../lib/workouts.js"

const root = path.resolve(import.meta.dirname, "..")
const dbPath = process.env.WORKOUT_DB
  ? path.resolve(process.env.WORKOUT_DB)
  : path.join(root, "data", "workouts.json")

const seedPath = process.argv[2]
if (!seedPath) {
  console.error("Usage: node scripts/seed.js <workout.json>")
  console.error("The file can be one workout, an array, or { \"workouts\": [] }.")
  process.exit(1)
}

const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"))
const current = fs.existsSync(dbPath)
  ? JSON.parse(fs.readFileSync(dbPath, "utf8"))
  : emptyStore()
const next = upsertWorkouts(current, seed)

fs.mkdirSync(path.dirname(dbPath), { recursive: true })
fs.writeFileSync(dbPath, `${JSON.stringify(next, null, 2)}\n`)

const dates = (Array.isArray(seed) ? seed : seed.workouts || [seed]).map((item) => item.date)
console.log(`Saved ${dates.join(", ")} to ${dbPath}`)
