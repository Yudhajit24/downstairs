import type { Order } from './types.js'

export type TimeTone = 'normal' | 'soon' | 'late'

const MIN = 60_000

/** When the order entered `ready` (last time). */
export function readyAt(o: Pick<Order, 'statusHistory'>): Date | null {
  for (let i = o.statusHistory.length - 1; i >= 0; i--) {
    if (o.statusHistory[i].status === 'ready') return o.statusHistory[i].at
  }
  return null
}

/**
 * The time line on a KOT ticket.
 *  new/preparing: "in 7 min" · "due soon" (<= 5 min) · "late 3 min" (past slot)
 *  ready:         "waiting 4 min" · "not collected 17 min" (over 15)
 */
export function ticketTime(
  o: Pick<Order, 'status' | 'slotStart' | 'statusHistory'>,
  now: Date,
): { tone: TimeTone; label: string } {
  if (o.status === 'new' || o.status === 'preparing') {
    const diff = o.slotStart.getTime() - now.getTime()
    if (diff < 0) return { tone: 'late', label: `late ${Math.max(1, Math.floor(-diff / MIN))} min` }
    const mins = Math.ceil(diff / MIN)
    if (mins <= 5) return { tone: 'soon', label: 'due soon' }
    return { tone: 'normal', label: `in ${mins} min` }
  }
  if (o.status === 'ready') {
    const at = readyAt(o) ?? now
    const waited = Math.max(0, Math.floor((now.getTime() - at.getTime()) / MIN))
    return waited > 15
      ? { tone: 'late', label: `not collected ${waited} min` }
      : { tone: 'normal', label: `waiting ${waited} min` }
  }
  return { tone: 'normal', label: '' }
}
