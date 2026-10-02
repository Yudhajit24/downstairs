import type { ItemProblem, MenuItem, OrderChange, OrderLine, Sugar } from './types.js'

export interface CartLineInput {
  itemId: string
  qty: number
  sugar?: Sugar | null
}

/** Cart lines are keyed by item + sugar. */
export const lineKey = (l: { itemId: string; sugar: Sugar | null }) => `${l.itemId}|${l.sugar ?? ''}`

export const SUGAR_LABEL: Record<Sugar, string> = { regular: 'regular sugar', less: 'less sugar', none: 'no sugar' }

export function qtyByItem(lines: { itemId: string; qty: number }[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const l of lines) m.set(l.itemId, (m.get(l.itemId) ?? 0) + l.qty)
  return m
}

/**
 * Normalise sugar against the menu, merge duplicate keys, and price from the menu.
 * Items missing from the menu are skipped (findItemProblems reports them).
 */
export function buildLines(input: CartLineInput[], menu: Record<string, MenuItem>) {
  const merged = new Map<string, OrderLine>()
  for (const l of input) {
    const item = menu[l.itemId]
    if (!item) continue
    const sugar: Sugar | null = item.hasSugarOption ? (l.sugar ?? 'regular') : null
    const line: OrderLine = { itemId: l.itemId, name: item.name, price: item.price, qty: l.qty, sugar, prepUnits: item.prepUnits }
    const k = lineKey(line)
    const prev = merged.get(k)
    if (prev) prev.qty += l.qty
    else merged.set(k, line)
  }
  const lines = [...merged.values()]
  return {
    lines,
    itemCount: lines.reduce((n, l) => n + l.qty, 0),
    units: lines.reduce((n, l) => n + l.qty * l.prepUnits, 0),
    total: lines.reduce((n, l) => n + l.qty * l.price, 0),
  }
}

/**
 * Availability check. `held` is what an order being edited already holds per item,
 * so it can keep (or reduce) what it has even if the item has since sold out.
 */
export function findItemProblems(
  requested: Map<string, number>,
  menu: Record<string, MenuItem | undefined>,
  held: Map<string, number> = new Map(),
): ItemProblem[] {
  const out: ItemProblem[] = []
  for (const [itemId, qty] of requested) {
    const item = menu[itemId]
    const have = held.get(itemId) ?? 0
    if (!item) { out.push({ itemId, reason: 'missing', remaining: null }); continue }
    const remaining = item.stock === null ? null : Math.max(0, item.stock + have)
    if (!item.available && qty > have) out.push({ itemId, reason: 'unavailable', remaining })
    else if (remaining !== null && qty > remaining) out.push({ itemId, reason: 'stock', remaining })
  }
  return out
}

const lineLabel = (l: OrderLine) => (l.sugar && l.sugar !== 'regular' ? `${l.name} (${SUGAR_LABEL[l.sugar]})` : l.name)

/** What the kitchen sees on an UPDATED ticket. */
export function diffOrder(
  before: { items: OrderLine[]; slotTime: string; note: string | null },
  after: { items: OrderLine[]; slotTime: string; note: string | null },
): OrderChange[] {
  const out: OrderChange[] = []
  const a = new Map(before.items.map((l) => [lineKey(l), l]))
  const b = new Map(after.items.map((l) => [lineKey(l), l]))
  for (const [k, l] of b) {
    const old = a.get(k)
    if (!old) out.push({ kind: 'added', label: `+${l.qty} ${lineLabel(l)}` })
    else if (old.qty !== l.qty) out.push({ kind: 'qty', label: `${lineLabel(l)} ${old.qty}→${l.qty}` })
  }
  for (const [k, l] of a) if (!b.has(k)) out.push({ kind: 'removed', label: `−${lineLabel(l)}` })
  if (before.slotTime !== after.slotTime) out.push({ kind: 'slot', label: `Pickup ${before.slotTime}→${after.slotTime}` })
  if ((before.note ?? null) !== (after.note ?? null)) out.push({ kind: 'note', label: after.note ? `Note: ${after.note}` : 'Note removed' })
  return out
}
