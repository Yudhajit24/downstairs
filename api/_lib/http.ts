import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ZodError, type ZodType } from 'zod'
import { ApiError, fail } from './errors.js'

type Fn = (req: VercelRequest, res: VercelResponse) => Promise<void>

/** Method guard + the one error shape `{ code, message, details? }` for every endpoint. */
export function handler(methods: string[], fn: Fn) {
  return async (req: VercelRequest, res: VercelResponse) => {
    res.setHeader('Cache-Control', 'no-store')
    try {
      if (!methods.includes(req.method ?? '')) {
        res.setHeader('Allow', methods.join(', '))
        throw fail('METHOD_NOT_ALLOWED', `Use ${methods.join(' or ')}.`)
      }
      await fn(req, res)
    } catch (e) {
      const err = toApiError(e)
      if (err.status >= 500) console.error(e)
      res.status(err.status).json(err.toBody())
    }
  }
}

function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e
  if (e instanceof ZodError) {
    const fields: Record<string, string> = {}
    for (const i of e.issues) fields[i.path.join('.') || '_'] ??= i.message
    return fail('VALIDATION', 'Please check the highlighted fields.', { fields })
  }
  return fail('INTERNAL', 'Something went wrong. Please try again.')
}

export function parseBody<T>(schema: ZodType<T>, req: VercelRequest): T {
  const raw = typeof req.body === 'string' ? safeJson(req.body) : req.body
  return schema.parse(raw ?? {})
}

function safeJson(s: string): unknown {
  try { return JSON.parse(s) } catch { throw fail('VALIDATION', 'Body must be valid JSON.') }
}
