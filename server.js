const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')
const path = require('path')

const dev = process.env.NODE_ENV !== 'production'
const dir = __dirname
const app = next({ dev, dir })
const handle = app.getRequestHandler()

const staticDir = path.join(__dirname, '.next', 'static')

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    const { pathname } = parsedUrl

    if (pathname.startsWith('/_next/static/')) {
      const relPath = pathname.replace('/_next/static/', '')
      const filePath = path.join(staticDir, relPath)

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase()
        const contentType = mimeTypes[ext] || 'application/octet-stream'
        const content = fs.readFileSync(filePath)
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Access-Control-Allow-Origin': '*',
        })
        res.end(content)
        return
      }
    }

    handle(req, res, parsedUrl)
  }).listen(3006, (err) => {
    if (err) throw err
    console.log('> Ready on http://localhost:3006')
  })
})
