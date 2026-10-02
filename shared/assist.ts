import { rightNow, type MenuRow, type WeatherNow } from './suggest.js'

/** What a free-text request asks for. Hard constraints (budget, veg) are enforced in code, never left to a model. */
export interface Constraints {
  maxPrice?: number
  veg?: boolean
  light?: boolean
  protein?: boolean
  quick?: boolean
  cold?: boolean
  hot?: boolean
  sweet?: boolean
}

export interface AssistPick { itemId: string; reason: string }

/** Keyword parser for requests like "something light under ₹150" or "quick high protein, veg". */
export function parseQuery(raw: string): Constraints {
  const q = raw.toLowerCase()
  const c: Constraints = {}
  const budget = /(?:under|below|less than|within|upto|up to|max(?:imum)?|<)\s*(?:rs\.?|inr|₹)?\s*(\d{2,4})|(?:rs\.?|inr|₹)\s*(\d{2,4})/.exec(q)
  const n = budget && Number(budget[1] ?? budget[2])
  if (n && n >= 10) c.maxPrice = n
  if (/\bnon[- ]?veg\b/.test(q) === false && /\b(veg|vegetarian|pure veg|no egg|eggless)\b/.test(q)) c.veg = true
  if (/light|healthy|diet|low[- ]?cal|salad|\bfit\b|calorie/.test(q)) c.light = true
  if (/protein|gym|workout|work out|muscle|post[- ]?workout|bulk/.test(q)) c.protein = true
  if (/quick|fast|rush|hurry|in a hurry|grab|no wait|late|running/.test(q)) c.quick = true
  if (/\bcold\b|iced|chill|cool|refresh/.test(q)) c.cold = true
  if (/\bhot\b|warm|cosy|cozy|comfort|rainy|rain\b/.test(q)) c.hot = true
  if (/sweet|dessert|treat|cookie|cake|chocolate/.test(q)) c.sweet = true
  return c
}

/** Items that may be suggested at all: orderable now, and within the hard constraints. */
export function eligible(menu: MenuRow[], c: Constraints): MenuRow[] {
  return menu.filter((m) =>
    m.available && (m.stock === null || m.stock > 0) &&
    (c.maxPrice === undefined || m.price <= c.maxPrice) &&
    (!c.veg || m.veg),
  )
}

const hasSoft = (c: Constraints) => !!(c.light || c.protein || c.quick || c.cold || c.hot || c.sweet)

interface Scored { m: MenuRow; score: number; why: string[] }

function scoreItem(m: MenuRow, c: Constraints): Scored {
  let score = 0
  const why: string[] = []
  const kcal = m.nutrition?.kcal, protein = m.nutrition?.protein ?? 0
  if (c.protein && (protein >= 15 || m.tags.includes('protein'))) { score += 4 + Math.min(protein, 30) / 10; why.push(`${protein}g protein`) }
  if (c.light && (m.tags.includes('light') || (kcal !== undefined && kcal <= 250))) { score += 4; why.push(kcal !== undefined ? `only ${kcal} kcal` : 'light') }
  if (c.quick) {
    if (m.prepUnits === 0) { score += 4; why.push('no wait, grab and go') }
    else if (m.prepUnits === 1) { score += 2; why.push('quick to make') }
    else score -= 2
  }
  if (c.cold && m.tags.includes('cold')) { score += 3; why.push('cold and refreshing') }
  if (c.hot && m.tags.includes('hot')) { score += 3; why.push('hot and comforting') }
  if (c.sweet && (m.category === 'bakes' || m.id === 'cold-coffee')) { score += 3; why.push('a sweet treat') }
  return { m, score, why }
}

/**
 * Rule-based picks: the always-available engine, and the fallback when no LLM is configured or it misbehaves.
 * Hard filters first (budget, veg, in stock); then score by the soft preferences; at most 2 per category.
 * With no recognisable preference it falls back to the weather/time/load ranking used by "Right now".
 */
export function rulePicks(a: {
  query: string; menu: MenuRow[]; now: Date; weather?: WeatherNow | null; busy?: boolean
}): { picks: AssistPick[]; note?: string } {
  const c = parseQuery(a.query)
  const pool = eligible(a.menu, c)
  if (pool.length === 0) return { picks: [], note: 'Nothing matches that exactly. Try relaxing the budget.' }

  const budgetWhy = c.maxPrice !== undefined ? (price: number) => `₹${price}, under ₹${c.maxPrice}` : null
  let note: string | undefined
  let scored: Scored[]

  if (hasSoft(c)) {
    scored = pool.map((m) => scoreItem(m, c)).filter((s) => s.score > 0)
      .sort((x, y) => y.score - x.score || x.m.sortOrder - y.m.sortOrder)
  } else scored = []

  if (scored.length === 0) {
    const r = rightNow({ now: a.now, menu: pool, weather: a.weather, busy: a.busy })
    scored = (r?.items ?? []).map((m) => ({ m, score: 1, why: ['good right now'] }))
    if (hasSoft(c)) note = "Couldn't match every detail, so here's what's good right now."
  }

  const picks: AssistPick[] = []
  const perCat: Record<string, number> = {}
  for (const s of scored) {
    if ((perCat[s.m.category] ?? 0) >= 2) continue
    perCat[s.m.category] = (perCat[s.m.category] ?? 0) + 1
    const reasons = [...s.why.slice(0, 2)]
    if (budgetWhy && reasons.length < 2) reasons.push(budgetWhy(s.m.price))
    picks.push({ itemId: s.m.id, reason: reasons.join(' · ') || 'a good pick' })
    if (picks.length === 3) break
  }
  return { picks, note }
}
