import { TZDate } from '@date-fns/tz'
import { TIMEZONE } from './constants.js'
import type { CafeSettings, SlotDoc } from './types.js'

export type SlotState = 'open' | 'few' | 'full' | 'past' | 'closed'

const pad = (n: number) => String(n).padStart(2, '0')

function ist(now: Date) {
  return new TZDate(now.getTime(), TIMEZONE)
}

/** 'YYYY-MM-DD' of the given instant in IST, whatever the device timezone. */
export function dateKey(now: Date): string {
  const d = ist(now)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function minutesOfDay(now: Date): number {
  const d = ist(now)
  return d.getHours() * 60 + d.getMinutes()
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`
}

/** '07:00' → '7:00 AM' */
export function formatTime12(t: string): string {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`
}

export const makeSlotId = (date: string, time: string) => `${date}_${time.replace(':', '')}`

export function parseSlotId(id: string): { date: string; time: string } | null {
  const m = /^(\d{4}-\d{2}-\d{2})_([01]\d|2[0-3])([0-5]\d)$/.exec(id)
  return m ? { date: m[1], time: `${m[2]}:${m[3]}` } : null
}

/** The instant a slot begins (IST wall clock). */
export function slotStartDate(slotId: string): Date {
  const p = parseSlotId(slotId)
  if (!p) throw new Error(`bad slot id ${slotId}`)
  const [y, mo, d] = p.date.split('-').map(Number)
  const [h, mi] = p.time.split(':').map(Number)
  return new Date(new TZDate(y, mo - 1, d, h, mi, 0, 0, TIMEZONE).getTime())
}

/**
 * Pickup times are any minute; capacity is counted per slot window (e.g. 12:45 covers 12:45 to 12:59).
 * Maps an exact pickup id ('2026-10-03_1252') to the id of its window ('2026-10-03_1245').
 */
export function bucketIdOf(slotId: string, slotMinutes: number): string {
  const p = parseSlotId(slotId)
  if (!p) return slotId
  const m = timeToMinutes(p.time)
  return makeSlotId(p.date, minutesToTime(m - (m % slotMinutes)))
}

export function isCafeOpen(s: CafeSettings, now: Date): boolean {
  if (s.forceOpen) return true
  const m = minutesOfDay(now)
  return m >= timeToMinutes(s.openTime) && m < timeToMinutes(s.closeTime)
}

/** What to show when closed: the next opening time of day. */
export function nextOpen(s: CafeSettings): { opensAt: string; label: string } {
  return { opensAt: s.openTime, label: formatTime12(s.openTime) }
}

/**
 * Slot times in a day. Normally 07:00..21:45. With forceOpen the grid spans the whole day
 * so an evaluator can place an order at any hour (see DECISIONS.md).
 */
export function daySlotTimes(s: CafeSettings): string[] {
  const start = s.forceOpen ? 0 : timeToMinutes(s.openTime)
  const end = s.forceOpen ? 24 * 60 : timeToMinutes(s.closeTime)
  const out: string[] = []
  for (let m = start; m + s.slotMinutes <= end; m += s.slotMinutes) out.push(minutesToTime(m))
  return out
}

export function slotRemaining(slot: SlotDoc | undefined, s: CafeSettings, ownUnits = 0): number {
  return s.slotCapacityUnits - (slot?.usedUnits ?? 0) + ownUnits
}

/**
 * State of one slot relative to a cart of `units` prep units.
 * `ownUnits` is what an order being edited already holds in this slot.
 * Pass units >= 1 for display with an empty cart.
 */
export function slotState(args: {
  slotId: string
  slot?: SlotDoc
  now: Date
  settings: CafeSettings
  units: number
  ownUnits?: number
  /** The exact pickup instant, when the customer picked a minute inside the window; the lead time applies to it, not to the window start. */
  startsAt?: Date
}): SlotState {
  const { slotId, slot, now, settings, units, ownUnits = 0, startsAt } = args
  const leadMs = settings.leadMinutes * 60_000
  if ((startsAt ?? slotStartDate(slotId)).getTime() - now.getTime() < leadMs) return 'past'
  if (slot?.closed) return 'closed'
  const remaining = slotRemaining(slot, settings, ownUnits)
  if (remaining < units) return 'full'
  if (remaining <= settings.slotCapacityUnits * 0.25) return 'few'
  return 'open'
}

export const isBookable = (s: SlotState) => s === 'open' || s === 'few'

/** Today's slot ids that are still ahead of `now` (cheap pre-filter; state decides bookability). */
export function todaySlotIds(settings: CafeSettings, now: Date): string[] {
  const date = dateKey(now)
  return daySlotTimes(settings).map((t) => makeSlotId(date, t))
}

/** Next bookable slots for a cart, in time order. */
export function nextBookableSlots(args: {
  settings: CafeSettings
  slots: Record<string, SlotDoc | undefined>
  now: Date
  units: number
  limit?: number
  ownSlotId?: string
  ownUnits?: number
}): { slotId: string; time: string }[] {
  const { settings, slots, now, units, limit = 3, ownSlotId, ownUnits = 0 } = args
  const out: { slotId: string; time: string }[] = []
  for (const slotId of todaySlotIds(settings, now)) {
    const state = slotState({
      slotId, slot: slots[slotId], now, settings, units,
      ownUnits: slotId === ownSlotId ? ownUnits : 0,
    })
    if (isBookable(state)) {
      out.push({ slotId, time: parseSlotId(slotId)!.time })
      if (out.length >= limit) break
    }
  }
  return out
}
