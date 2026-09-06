import { readFile } from 'node:fs/promises'
import Schema from '@deepseek-ai/schemastery'
import { createMarketplace } from './marketplace.js'
import { createInstalledLifecycle } from './installed-lifecycle.js'
import { createController } from './controller.js'
import { createRestart } from './restart.js'

export const name = 'plugin-hub'
export const inject = ['webServer', 'tools']
export const Config = Schema.object({ profileLabel: Schema.string().default('web') })

export function apply(ctx, config) {
  if (ctx.webServer.host !== '127.0.0.1') throw new Error('Plugin Hub only supports a loopback Web server.')
  ctx.on('webserver/index-inject', table => table.push({kind:'html',placement:'head',html:'<link rel="stylesheet" href="/plugin-hub/rail.css">'}))
  const controller = createController(ctx, config.profileLabel)
  const restartControl = createRestart(ctx)
  const restartSupported = restartControl.supported
  let restarting = false
  const marketplace = createMarketplace(config.profileLabel, {
    restartSupported, lifecycle: createInstalledLifecycle(ctx),
    loaded: name => [...(ctx.get('loader')?.entries() || [])].some(entry => (entry.options.name === name || entry.options.name?.startsWith(`${name}/`)) && entry.fiber?.state === 2),
  })
  const files = new Map([
    ['/plugin-hub', ['index.html', 'text/html; charset=utf-8']],
    ['/plugin-hub/', ['index.html', 'text/html; charset=utf-8']],
    ['/plugin-hub/app.js', ['app.js', 'text/javascript; charset=utf-8']],
    ['/plugin-hub/marketplace.js', ['marketplace.js', 'text/javascript; charset=utf-8']],
    ['/plugin-hub/jelly.js', ['jelly.js', 'text/javascript; charset=utf-8']],
    ['/plugin-hub/vendor/three.module.js', ['vendor/three.module.js', 'text/javascript; charset=utf-8']],
    ['/plugin-hub/vendor/three.core.js', ['vendor/three.core.js', 'text/javascript; charset=utf-8']],
    ['/plugin-hub/rail.css', ['rail.css', 'text/css; charset=utf-8']],
    ['/plugin-hub/style.css', ['style.css', 'text/css; charset=utf-8']],
  ])
  const json = (res, code, value) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(value)) }
  ctx.effect(() => ctx.webServer.register({ kind: 'prefix', path: '/plugin-hub', async handler(req, res) {
    try {
      const authority = `127.0.0.1:${ctx.webServer.port}`
      if (req.headers.host !== authority) return json(res, 403, { error: 'Open Plugin Hub using 127.0.0.1.' })
      const url = new URL(req.url, `http://${authority}`)
      const file = files.get(url.pathname)
      if (req.method === 'GET' && file) {
        const body = await readFile(new URL(`../public/${file[0]}`, import.meta.url))
        res.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'" })
        res.end(body); return
      }
      if (req.method === 'GET' && url.pathname === '/plugin-hub/api/marketplace') return json(res, 200, await marketplace.list())
      if (req.method === 'GET' && url.pathname === '/plugin-hub/api/state') return json(res, 200, { ...controller.snapshot(), bootId: restartControl.bootId })
      if (req.method !== 'POST' || !['/plugin-hub/api/market-change', '/plugin-hub/api/restart', '/plugin-hub/api/install', '/plugin-hub/api/change', '/plugin-hub/api/call', '/plugin-hub/api/tryout'].includes(url.pathname)) return json(res, 404, { error: 'Endpoint not found.' })
      if (req.headers.origin !== `http://${authority}` || req.headers['x-plugin-hub'] !== '1' || !req.headers['content-type']?.startsWith('application/json')) return json(res, 403, { error: 'Invalid request origin.' })
      let body = ''
      for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 16384) return json(res, 413, { error: 'Request too large.' }) }
      const payload = JSON.parse(body)
      if (url.pathname.endsWith('/restart')) {
        if (!restartSupported) return json(res, 409, { error: 'This Node runtime cannot restart in place. Restart DSH in your terminal.' })
        if (marketplace.isInstalling()) return json(res, 409, { error: 'Wait for the current installation to finish.' })
        if (!restarting) {
          restarting = true
          res.once('finish', () => { setTimeout(() => restartControl.restart().catch(error => { console.error('Plugin Hub restart failed:', error.message); restarting = false }), 100) })
        }
        return json(res, 202, { restarting: true, pid: process.pid, bootId: restartControl.bootId })
      }
      const result = url.pathname.endsWith('/market-change') ? await marketplace.change(payload.id, payload.action) : url.pathname.endsWith('/install') ? await marketplace.install(payload.id) : url.pathname.endsWith('/change') ? await controller.change(payload.id, payload.action) : url.pathname.endsWith('/tryout') ? await controller.tryout(payload.id, payload.input) : await controller.call(payload.id, payload.input)
      json(res, 200, result)
    } catch (error) { json(res, 400, { error: error.message }) }
  } }))
  ctx.logger.info(`Plugin Hub: http://127.0.0.1:${ctx.webServer.port}/plugin-hub`)
}
