import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { loadEnv } from 'vite'

/**
 * Dev-only: serves /api/* from the same handler files Vercel runs, so `npm run dev`
 * needs no `vercel login`. Production still uses Vercel's own routing.
 */
export function devApi(): Plugin {
  return {
    name: 'downstairs-dev-api',
    apply: 'serve',
    configureServer(server) {
      Object.assign(process.env, loadEnv('development', process.cwd(), ''))
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        const url = new URL(req.url ?? '/', 'http://x')
        if (!url.pathname.startsWith('/api/')) return next()
        const parts = url.pathname.replace(/^\/api\//, '').replace(/\/$/, '').split('/')
        const query: Record<string, string> = Object.fromEntries(url.searchParams)
        let file: string | null = null
        if (parts[0] === 'orders' && parts.length === 1) file = '/api/orders/index.ts'
        else if (parts[0] === 'orders' && parts.length === 2) { file = '/api/orders/[id].ts'; query.id = parts[1] }
        else if (parts[0] === 'kitchen' && ['session', 'action', 'brief'].includes(parts[1])) file = `/api/kitchen/${parts[1]}.ts`
        else if (parts.length === 1 && ['weather', 'assist', 'parse-order', 'order-chat'].includes(parts[0])) file = `/api/${parts[0]}/index.ts`
        const send = (code: number, body: unknown) => {
          res.statusCode = code
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(body))
        }
        if (!file) return send(404, { code: 'NOT_FOUND', message: 'No such endpoint.' })

        const chunks: Buffer[] = []
        for await (const c of req) chunks.push(c as Buffer)
        const raw = Buffer.concat(chunks).toString('utf8')
        let body: unknown
        try { body = raw ? JSON.parse(raw) : undefined } catch { body = raw }

        const vres = Object.assign(res, {
          status(code: number) { res.statusCode = code; return vres },
          json(b: unknown) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(b)); return vres },
        })
        try {
          const mod = await server.ssrLoadModule(file)
          await mod.default(Object.assign(req, { query, body }), vres)
        } catch (e) {
          console.error(e)
          if (!res.writableEnded) send(500, { code: 'INTERNAL', message: 'Dev API error.' })
        }
      })
    },
  }
}
