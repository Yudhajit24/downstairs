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
  /** Standing café facts the model may use, so it never has to guess them. */
  cafe: { pickupSpot: string; location: string; payment: string }
}

export const PICKUP_SPOT = 'the Clubhouse counter'
export const OFF_TOPIC = "I can only help with your order and the café. Try asking about the wait, what's in your order, where to collect it, or whether you can still change it."

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
    cafe: { pickupSpot: 'the Clubhouse counter (Palm Grove Residency, ground floor)', location: 'Palm Grove Residency Clubhouse, ground floor, Bengaluru', payment: 'Pay at the counter on pickup, UPI or cash.' },
  }
}

const itemsText = (f: OrderFacts) => f.items.map((i) => `${i.qty} × ${i.name}`).join(', ')

/** Attempts to steer the assistant rather than ask about an order. Never sent to the model. */
export const looksLikeInjection = (q: string) => /ignore (all |any |the )?(previous|prior|above)|system prompt|your instructions|you are now|pretend (to be|you)|act as|jailbreak|developer mode/i.test(q)

export type Intent = 'change' | 'pickup' | 'items' | 'status' | 'payment'

/** What the question is about, or null when it is not about the order or the café at all. */
export function intentOf(question: string): Intent | null {
  const q = question.toLowerCase()
  if (looksLikeInjection(q)) return null
  if (/cancel|refund|change|edit|modify|add (more|another)|remove|wrong/.test(q)) return 'change'
  if (/what did i|what'?s in|what is in|what have i|my items|items in|what i (ordered|got)|contain/.test(q)) return 'items'
  if (/\bpay|upi|cash|card\b|bill|how much|price|cost|total|paid/.test(q)) return 'payment'
  if (/where is (my|the) order|when|ready|how long|wait|\btime\b|late|eta|how soon|status|queue|ahead|slot|token|done/.test(q)) return 'status'
  if (/where|location|collect|pick ?up|counter|clubhouse|address/.test(q)) return 'pickup'
  if (/\border|items?|what did i|what's in|contain|cappuccino|coffee|chai|sandwich/.test(q)) return 'items'
  return null
}

/** Keyword answers. Always available, and the fallback if the model is down or answers badly. Off-topic gets a polite redirect. */
export function ruleAnswer(question: string, f: OrderFacts): string {
  const slot = formatTime12(f.slotTime)
  const status = statusLine(f, slot)
  switch (intentOf(question)) {
    case 'change':
      if (f.status === 'cancelled') return 'This order is already cancelled.'
      if (f.canCancel) return 'You can still change or cancel it: use Edit or Cancel on this page, until the kitchen starts it.'
      if (f.status === 'picked_up') return 'This order has been picked up, so it can no longer be changed.'
      return `The kitchen has started it, so it can't be changed here. Ask at ${PICKUP_SPOT} and they'll do their best.`
    case 'pickup': return `Pick it up at ${PICKUP_SPOT}. Show your token #${f.token}.`
    case 'payment': return `Your total is ₹${f.total}. ${f.cafe.payment}`
    case 'items': return `You ordered ${itemsText(f)}. Total ₹${f.total}. ${status}`
    case 'status': return status
    default: return OFF_TOPIC
  }
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
