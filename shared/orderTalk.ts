import { formatTime12 } from './slots.js'
import type { Status } from './types.js'

/** What we know about one order, with no name or flat: everything the "ask about your order" answer may use. */
export interface OrderFacts {
  token: number
  status: Status
  items: { name: string; qty: number }[]
  total: number
  slotTime: string // 'HH:mm'
  /** Minutes until the pickup slot starts (negative once it has begun). */
  minutesToSlot: number
  /** Unfinished orders (new or preparing) booked for an earlier slot, or the same slot and placed earlier. */
  ordersAhead: number
  canEdit: boolean
  canCancel: boolean
  cancelReason: string | null
}

export const PICKUP_SPOT = 'the Clubhouse counter'

export interface OrderLike {
  token: number; status: Status; items: { name: string; qty: number }[]; total: number
  slotTime: string; createdAtMs: number; cancelReason: string | null
}

export function orderFacts(o: OrderLike, others: { status: Status; slotTime: string; createdAtMs: number }[], slotStartMs: number, now: Date): OrderFacts {
  const ahead = others.filter((x) =>
    (x.status === 'new' || x.status === 'preparing') &&
    (x.slotTime < o.slotTime || (x.slotTime === o.slotTime && x.createdAtMs < o.createdAtMs)),
  ).length
  return {
    token: o.token, status: o.status, items: o.items, total: o.total, slotTime: o.slotTime,
    minutesToSlot: Math.round((slotStartMs - now.getTime()) / 60_000),
    ordersAhead: o.status === 'new' || o.status === 'preparing' ? ahead : 0,
    canEdit: o.status === 'new', canCancel: o.status === 'new', cancelReason: o.cancelReason,
  }
}

const itemsText = (f: OrderFacts) => f.items.map((i) => `${i.qty} × ${i.name}`).join(', ')

/** Keyword answers. Always available, and the fallback if the model is down or answers badly. */
export function ruleAnswer(question: string, f: OrderFacts): string {
  const q = question.toLowerCase()
  const slot = formatTime12(f.slotTime)
  const status = statusLine(f, slot)
  if (/cancel|refund|change|edit|modify|add (more|another)|remove|wrong/.test(q)) {
    if (f.status === 'cancelled') return 'This order is already cancelled.'
    if (f.canCancel) return 'You can still change or cancel it: use Edit or Cancel on this page, until the kitchen starts it.'
    if (f.status === 'picked_up') return 'This order has been picked up, so it can no longer be changed.'
    return `The kitchen has started it, so it can't be changed here. Ask at ${PICKUP_SPOT} and they'll do their best.`
  }
  if (/where|location|collect|pick ?up point|counter/.test(q)) return `Pick it up at ${PICKUP_SPOT}. Show your token #${f.token}.`
  if (/what|items?|order|total|cost|price|how much|paid|bill|contain/.test(q) && !/when|ready|long|wait/.test(q)) {
    return `You ordered ${itemsText(f)}. Total ₹${f.total}. ${status}`
  }
  if (/when|ready|long|wait|time|late|eta|how soon|status|where is|queue|ahead/.test(q)) return status
  return `${status} Ask me about the wait, what's in your order, or whether you can still change it.`
}

function statusLine(f: OrderFacts, slot: string): string {
  switch (f.status) {
    case 'new': {
      const queue = f.ordersAhead > 0 ? ` ${f.ordersAhead === 1 ? '1 order is' : `${f.ordersAhead} orders are`} ahead of yours.` : ''
      return `Your order is in and waiting for the kitchen. Pickup slot is ${slot}.${queue}`
    }
    case 'preparing': return `The kitchen is making it now. Pickup slot is ${slot}.`
    case 'ready': return `It's ready! Collect it from ${PICKUP_SPOT}.`
    case 'picked_up': return 'This order has been picked up. Enjoy!'
    case 'cancelled': return `This order was cancelled${f.cancelReason ? `: ${f.cancelReason}` : ''}.`
  }
}
