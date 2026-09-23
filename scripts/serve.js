import fs from "node:fs"
import http from "node:http"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const port = Number(process.env.PORT || 4173)

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1")
  let pathname = decodeURIComponent(url.pathname)
  if (pathname.endsWith("/")) pathname += "index.html"

  const relative = pathname.replace(/^\/+/, "")
  const file = path.normalize(path.join(root, relative))
  if (file !== root && !file.startsWith(root + path.sep)) {
    res.writeHead(403)
    res.end("Forbidden")
    return
  }

  fs.readFile(file, (error, body) => {
    if (error) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" })
      res.end("Not found")
      return
    }
    const type = types[path.extname(file)] || "application/octet-stream"
    res.writeHead(200, { "content-type": type, "cache-control": "no-store" })
    res.end(body)
  })
})

server.listen(port, "127.0.0.1", () => {
  console.log(`Workout app at http://127.0.0.1:${port}`)
})
