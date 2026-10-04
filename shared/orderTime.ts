import type { Order } from './types.js'

/**
 * Whole minutes from placing the order to it being picked up, or null if it has not been picked up.
 * Uses the picked-up entry in the status history (the last one, if the kitchen moved it back and forth).
 */
export function minutesToPickup(o: Pick<Order, 'status' | 'createdAt' | 'statusHistory'>): number | null {
  if (o.status !== 'picked_up') return null
  const at = [...o.statusHistory].reverse().find((h) => h.status === 'picked_up')?.at
  if (!at) return null
  return Math.max(0, Math.round((new Date(at).getTime() - new Date(o.createdAt).getTime()) / 60_000))
}

/** 0 -> "under a minute", 23 -> "23 min", 65 -> "1 h 5 min", 120 -> "2 h". */
export function formatMinutes(n: number): string {
  if (n < 1) return 'under a minute'
  if (n < 60) return `${n} min`
  const h = Math.floor(n / 60), m = n % 60
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}
