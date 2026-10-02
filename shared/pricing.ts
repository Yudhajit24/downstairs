import type { ItemProblem, MenuItem, OrderChange, OrderLine, Selections, Sugar } from './types.js'

export interface CartLineInput {
  itemId: string
  qty: number
  sugar?: Sugar | null
  /** Build-your-own picks: option group id -> choice ids. */
  options?: Selections | null
}

/** Stable text for a set of picks: groups sorted, choices sorted. Empty when nothing is picked. */
export function optionKey(options?: Selections | null): string {
  if (!options) return ''
  return Object.keys(options).sort()
    .filter((g) => options[g]?.length)
    .map((g) => `${g}:${[...new Set(options[g])].sort().join(',')}`)
    .join('|')
}

/** Cart lines are keyed by item + sugar + picks, so two different builds of the same item stay separate. */
export const lineKey = (l: { itemId: string; sugar: Sugar | null; options?: Selections | null }) =>
  `${l.itemId}|${l.sugar ?? ''}|${optionKey(l.options)}`

export const SUGAR_LABEL: Record<Sugar, string> = { regular: 'regular sugar', less: 'less sugar', none: 'no sugar' }

export function qtyByItem(lines: { itemId: string; qty: number }[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const l of lines) m.set(l.itemId, (m.get(l.itemId) ?? 0) + l.qty)
  return m
}

/** Items you can add with one tap: nothing the customer is required to choose first. */
export const isQuickAddable = (m: Pick<MenuItem, 'options'>) => !(m.options ?? []).some((g) => g.min > 0)

export interface OptionIssue {
  kind: 'invalid' | 'unavailable'
  groupId: string
  choiceId?: string
  /** Human-readable, safe to show. */
  message: string
}

export type ResolvedOptions =
  | {
      ok: true
      /** Normalised picks (menu order, deduped, empty groups dropped). */
      options: Selections
      priceDelta: number
      prepDelta: number
      nonVeg: boolean
      custom: { group: string; choices: string[] }[]
    }
  | { ok: false; issue: OptionIssue }

/**
 * Validate and price a customer's picks against an item's option groups, using the live menu.
 * Unknown groups/choices and min/max violations are 'invalid'; a choice the kitchen has switched off is 'unavailable'
 * (unless `allowUnavailable`, used when an order keeps an ingredient it already had).
 * Items without options ignore picks entirely.
 */
export function resolveOptions(item: MenuItem, selected?: Selections | null, allowUnavailable = false): ResolvedOptions {
  const groups = item.options ?? []
  const empty: ResolvedOptions = { ok: true, options: {}, priceDelta: 0, prepDelta: 0, nonVeg: false, custom: [] }
  if (groups.length === 0) return empty

  for (const gid of Object.keys(selected ?? {})) {
    if (!groups.some((g) => g.id === gid) && (selected![gid]?.length ?? 0) > 0) {
      return { ok: false, issue: { kind: 'invalid', groupId: gid, message: 'That option is not part of this item.' } }
    }
  }

  const out: Selections = {}
  const custom: { group: string; choices: string[] }[] = []
  let priceDelta = 0, prepDelta = 0, nonVeg = false
  for (const g of groups) {
    const ids = [...new Set(selected?.[g.id] ?? [])]
    if (ids.length < g.min) {
      return { ok: false, issue: { kind: 'invalid', groupId: g.id, message: g.min === 1 ? `Pick your ${g.label.toLowerCase()}.` : `Pick at least ${g.min} for ${g.label.toLowerCase()}.` } }
    }
    if (ids.length > g.max) {
      return { ok: false, issue: { kind: 'invalid', groupId: g.id, message: `Pick at most ${g.max} for ${g.label.toLowerCase()}.` } }
    }
    const chosen = []
    for (const id of ids) {
      const c = g.choices.find((x) => x.id === id)
      if (!c) return { ok: false, issue: { kind: 'invalid', groupId: g.id, choiceId: id, message: 'That choice is not on the menu.' } }
      if (!c.available && !allowUnavailable) {
        return { ok: false, issue: { kind: 'unavailable', groupId: g.id, choiceId: id, message: `${c.label} is sold out.` } }
      }
      chosen.push(c)
    }
    if (chosen.length === 0) continue
    // menu order, so the same build always produces the same key
    chosen.sort((a, b) => g.choices.indexOf(a) - g.choices.indexOf(b))
    out[g.id] = chosen.map((c) => c.id)
    custom.push({ group: g.label, choices: chosen.map((c) => c.label) })
    for (const c of chosen) { priceDelta += c.priceDelta; prepDelta += c.prepDelta ?? 0; if (c.nonVeg) nonVeg = true }
  }
  return { ok: true, options: out, priceDelta, prepDelta, nonVeg, custom }
}

export interface OptionProblem { itemId: string; issue: OptionIssue }

/**
 * Normalise sugar and picks against the menu, merge duplicate lines, and price from the menu.
 * Items missing from the menu are skipped (findItemProblems reports them). Bad or unavailable picks are returned in
 * `optionProblems` (and the line is left out). `keep` lists line keys an edited order already holds, which may keep an
 * ingredient that has since been switched off; `allowUnavailable` waives that check entirely (templates).
 */
export function buildLines(input: CartLineInput[], menu: Record<string, MenuItem>, opts: { keep?: Set<string>; allowUnavailable?: boolean } = {}) {
  const merged = new Map<string, OrderLine>()
  const optionProblems: OptionProblem[] = []
  for (const l of input) {
    const item = menu[l.itemId]
    if (!item) continue
    const sugar: Sugar | null = item.hasSugarOption ? (l.sugar ?? 'regular') : null

    let r = resolveOptions(item, l.options, opts.allowUnavailable)
    if (!r.ok && r.issue.kind === 'unavailable' && opts.keep) {
      const lenient = resolveOptions(item, l.options, true)
      if (lenient.ok && opts.keep.has(lineKey({ itemId: l.itemId, sugar, options: lenient.options }))) r = lenient
    }
    if (!r.ok) { optionProblems.push({ itemId: l.itemId, issue: r.issue }); continue }

    const line: OrderLine = {
      itemId: l.itemId, name: item.name, price: item.price + r.priceDelta, qty: l.qty, sugar,
      prepUnits: item.prepUnits + r.prepDelta,
      ...(r.custom.length > 0 && { options: r.options, custom: r.custom }),
      ...(r.nonVeg && { nonVeg: true }),
    }
    const k = lineKey(line)
    const prev = merged.get(k)
    if (prev) prev.qty += l.qty
    else merged.set(k, line)
  }
  const lines = [...merged.values()]
  return {
    lines,
    optionProblems,
    itemCount: lines.reduce((n, l) => n + l.qty, 0),
    units: lines.reduce((n, l) => n + l.qty * l.prepUnits, 0),
    total: lines.reduce((n, l) => n + l.qty * l.price, 0),
  }
}

/** Turn option problems into the API's item-problem shape. */
export function optionProblemsToItemProblems(ps: OptionProblem[]): ItemProblem[] {
  return ps.map((p) => ({ itemId: p.itemId, reason: 'option', remaining: null, groupId: p.issue.groupId, choiceId: p.issue.choiceId, label: p.issue.message }))
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

/** "Name (less sugar, Multigrain, Paneer tikka)" for kitchen change lines. */
export const lineLabel = (l: OrderLine) => {
  const parts = [
    ...(l.sugar && l.sugar !== 'regular' ? [SUGAR_LABEL[l.sugar]] : []),
    ...(l.custom ?? []).flatMap((c) => c.choices),
  ]
  return parts.length ? `${l.name} (${parts.join(', ')})` : l.name
}

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
