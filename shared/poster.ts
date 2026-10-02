import { TZDate } from '@date-fns/tz'
import { TIMEZONE } from './constants.js'

/** FNV-1a: tiny, stable, no deps. */
function hash(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

/** The whole society sees the same poster on the same IST date. */
export function posterIndex(dateKey: string, count: number): number {
  return count <= 0 ? 0 : hash(dateKey) % count
}

/** "Good morning, Riya" (before 12) · "Afternoon, Riya" (12–5) · "Evening, Riya" (after 5). No name, no name shown. */
export function greeting(now: Date, name?: string | null): string {
  const h = new TZDate(now.getTime(), TIMEZONE).getHours()
  const base = h < 12 ? 'Good morning' : h < 17 ? 'Afternoon' : 'Evening'
  const first = name?.trim().split(/\s+/)[0]
  return first ? `${base}, ${first}` : base
}

/** Song of the day: same idea as the poster (deterministic by IST date) but hashed with its own salt, so the two don't move in lockstep. */
export function songIndex(dateKey: string, count: number): number {
  return count <= 0 ? 0 : hash(`song:${dateKey}`) % count
}
