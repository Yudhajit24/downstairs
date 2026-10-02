import { createHash, timingSafeEqual } from 'node:crypto'
import type { VercelRequest } from '@vercel/node'
import { adminAuth } from './admin.js'
import { fail } from './errors.js'

/** Constant-time compare: hash both sides so lengths match. */
export function pinMatches(given: string, expected: string): boolean {
  const h = (s: string) => createHash('sha256').update(s).digest()
  return timingSafeEqual(h(given), h(expected))
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Requires `Authorization: Bearer <Firebase ID token>` carrying `staff: true`. */
export async function requireStaff(req: VercelRequest) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')
  if (!m) throw fail('UNAUTHORIZED', 'Kitchen sign-in required.')
  try {
    const decoded = await adminAuth().verifyIdToken(m[1])
    if (decoded.staff !== true) throw new Error('not staff')
    return decoded
  } catch {
    throw fail('UNAUTHORIZED', 'Kitchen sign-in required.')
  }
}
