import { isQuickAddable } from './pricing.js'
import type { MenuRow } from './suggest.js'
import type { Sugar } from './types.js'

/** One parsed line: an orderable menu item, how many, and (for drinks that have it) the sugar level. */
export interface ParsedLine { itemId: string; qty: number; sugar: Sugar | null }
export interface ParsedOrder {
  lines: ParsedLine[]
  /** Pieces of the message we could not match to anything on the menu, shown so the customer can add them by hand. */
  unmatched: string[]
  /** Matched items that need choices (e.g. the build-your-own sandwich), so they cannot be added in one go. */
  needsChoices: string[]
  /** Items that exist but are sold out right now. */
  soldOut: string[]
}

const MAX_QTY = 20
const WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, couple: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
}
// Friendly short names people actually type in chat. Matching is on lowercase tokens.
const ALIASES: Record<string, string[]> = {
  'filter-coffee': ['filter coffee', 'kaapi', 'south indian coffee'],
  'cutting-chai': ['cutting chai', 'cutting', 'chai'],
  cappuccino: ['cappuccino', 'cappucino', 'capuccino', 'cap'],
  'cold-coffee': ['cold coffee', 'iced coffee'],
  'cold-brew': ['cold brew'],
  'lemon-iced-tea': ['lemon iced tea', 'iced tea', 'lemon tea'],
  'kanda-poha': ['poha', 'kanda poha'],
  'veg-sandwich': ['veg sandwich', 'veg grilled sandwich', 'grilled sandwich', 'sandwich'],
  'egg-bhurji-pav': ['bhurji pav', 'egg bhurji', 'bhurji', 'egg pav'],
  'butter-croissant': ['croissant'],
  'banana-bread': ['banana bread', 'banana walnut bread'],
  'choco-cookie': ['cookie', 'choco chip cookie', 'choco cookie'],
  'egg-white-wrap': ['egg white wrap', 'egg wrap', 'wrap'],
  'sprouts-bowl': ['sprouts bowl', 'sprouts', 'chickpea bowl'],
  'protein-shake': ['protein shake', 'banana shake', 'shake'],
}

const stem = (w: string) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w)
const tokens = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean).map(stem)

/** Phrases to match against for one menu item: its aliases (when known) plus its own name. */
function phrasesFor(m: MenuRow): string[][] {
  return [...new Set([m.name, ...(ALIASES[m.id] ?? [])])].map(tokens).filter((p) => p.length > 0)
}

function sugarOf(seg: string): Sugar | null {
  if (/\b(no|without|zero|skip)\s+(the\s+)?sugar\b|\bsugar[- ]?free\b|\bsugarless\b|\bunsweetened\b|\bbina\s+chini\b/.test(seg)) return 'none'
  if (/\b(less|low|little|kam|light)\s+(the\s+)?(sugar|sweet)\b|\bhalf\s+sugar\b|\bkam\s+chini\b/.test(seg)) return 'less'
  if (/\b(regular|normal|extra|full)\s+sugar\b/.test(seg)) return 'regular'
  return null
}

function qtyOf(seg: string): number {
  const x = /\bx\s*(\d{1,2})\b|\b(\d{1,2})\s*x\b/.exec(seg)
  if (x) return Number(x[1] ?? x[2])
  const n = /\b(\d{1,2})\b/.exec(seg.replace(/\b\d{1,2}[:.]\d{2}\b/g, ' ').replace(/\b(under|below|rs\.?|₹)\s*\d+/g, ' '))
  if (n) return Number(n[1])
  for (const w of seg.split(/\s+/)) if (w in WORDS && w !== 'a' && w !== 'an') return WORDS[w]
  return 1
}

/**
 * Rule-based order reader: splits the message into pieces ("2 cappuccinos, a veg sandwich and a cookie"),
 * finds the menu item each piece names (whole phrase present, longest phrase wins, ties are left for the customer),
 * reads a quantity and a sugar preference. This is the always-available engine and the fallback for the LLM.
 */
export function parseOrderText(text: string, menu: MenuRow[]): ParsedOrder {
  const out: ParsedOrder = { lines: [], unmatched: [], needsChoices: [], soldOut: [] }
  const segments = text.toLowerCase().split(/[,;\n+&]|\band\b|\bplus\b|\balso\b|\bwith\b/).map((s) => s.trim()).filter(Boolean)
  const index = menu.map((m) => ({ m, phrases: phrasesFor(m) }))

  for (const seg of segments) {
    const toks = tokens(seg)
    const set = new Set(toks)
    let best: { m: MenuRow; len: number }[] = []
    for (const { m, phrases } of index) {
      let len = 0
      for (const p of phrases) if (p.every((t) => set.has(t))) len = Math.max(len, p.length)
      if (len > 0) best.push({ m, len })
    }
    const top = Math.max(0, ...best.map((b) => b.len))
    best = best.filter((b) => b.len === top)

    if (best.length === 0) {
      // A bare "no sugar" piece belongs to the previous line ("coffee, no sugar").
      const sg = sugarOf(seg), last = out.lines[out.lines.length - 1]
      if (sg && last && last.sugar !== null && toks.every((t) => /^(no|without|sugar|less|low|little|please|the|free|regular|extra)$/.test(t))) { last.sugar = sg; continue }
      if (toks.some((t) => !/^(please|pls|hi|hello|hey|can|i|we|get|have|want|need|would|like|order|send|me|us|for|the|my|to|ok|okay|thanks|thank|you|plz|a|an|at|by|pickup|pick|up|around)$/.test(t) && !/^\d/.test(t))) {
        out.unmatched.push(seg.slice(0, 40))
      }
      continue
    }
    if (best.length > 1) { out.unmatched.push(`${seg.slice(0, 40)} (which one?)`); continue }

    const m = best[0].m
    if (!isQuickAddable(m)) { out.needsChoices.push(m.name); continue }
    if (!m.available || (m.stock !== null && m.stock <= 0)) { out.soldOut.push(m.name); continue }
    const qty = Math.min(MAX_QTY, Math.max(1, qtyOf(seg)))
    const sugar = m.hasSugarOption ? sugarOf(seg) ?? 'regular' : null
    const prev = out.lines.find((l) => l.itemId === m.id && l.sugar === sugar)
    if (prev) prev.qty = Math.min(MAX_QTY, prev.qty + qty)
    else out.lines.push({ itemId: m.id, qty, sugar })
  }
  return out
}

/**
 * Validate lines that came from anywhere untrusted (an LLM): known, orderable items only; sane quantity;
 * sugar only where the item has a sugar option; duplicates merged. Anything dropped is reported, never silently kept.
 */
export function sanitizeLines(raw: { itemId: string; qty?: number; sugar?: string | null }[], menu: MenuRow[]): { lines: ParsedLine[]; dropped: string[] } {
  const byId = new Map(menu.map((m) => [m.id, m]))
  const lines: ParsedLine[] = []
  const dropped: string[] = []
  for (const r of raw) {
    const m = byId.get(r.itemId)
    if (!m || !isQuickAddable(m) || !m.available || (m.stock !== null && m.stock <= 0)) { dropped.push(r.itemId); continue }
    const qty = Math.min(MAX_QTY, Math.max(1, Math.round(Number(r.qty) || 1)))
    const sugar: Sugar | null = m.hasSugarOption ? (r.sugar === 'none' || r.sugar === 'less' ? r.sugar : 'regular') : null
    const prev = lines.find((l) => l.itemId === m.id && l.sugar === sugar)
    if (prev) prev.qty = Math.min(MAX_QTY, prev.qty + qty)
    else lines.push({ itemId: m.id, qty, sugar })
  }
  return { lines, dropped }
}
