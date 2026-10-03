import { briefFacts, ruleBrief, type BriefFacts, type BriefOrder } from '../../shared/kitchenBrief.js'
import type { MenuRow } from '../../shared/suggest.js'
import { chat, cleanText, rateLimiter, type LlmConfig } from './llm.js'

/**
 * Kitchen briefing: "what should I do next?". The facts (counts, what to make, next slot, low stock) are computed in
 * code from live orders; an LLM, when configured, only rewords them into a short spoken-style note. If its text
 * mentions a number or item we did not give it, or anything fails, the rule briefing is used instead.
 */
export interface BriefDeps {
  load: () => Promise<{ orders: BriefOrder[]; menu: MenuRow[]; paused: boolean }>
  llm: LlmConfig | null
  fetchImpl?: typeof fetch
  now?: () => Date
}
export interface BriefResult { source: 'ai' | 'rules'; text: string; facts: BriefFacts }

const checkRate = rateLimiter(10, 120)

export function buildBriefMessages(facts: BriefFacts) {
  return [
    {
      role: 'system',
      content:
        'You are the shift lead of a small cafe kitchen, briefing the cook between orders. ' +
        'Using ONLY the facts provided, write 2 to 4 short lines (plain text, no markdown, no emoji): what to start first, ' +
        'what is coming up, and anything running low. Do not invent items, numbers or order tokens. Be calm and specific.',
    },
    { role: 'user', content: JSON.stringify(facts) },
  ]
}

/** Every number in the model's text must appear in the facts: a cheap guard against invented figures. */
export function numbersGrounded(text: string, facts: BriefFacts): boolean {
  const allowed = new Set(JSON.stringify(facts).match(/\d+/g) ?? [])
  for (const n of text.match(/\d+/g) ?? []) if (!allowed.has(n) && Number(n) > 1) return false
  return true
}

export async function kitchenBrief(deps: BriefDeps, uid: string): Promise<BriefResult> {
  const now = deps.now?.() ?? new Date()
  checkRate(uid, now.getTime())
  const { orders, menu, paused } = await deps.load()
  const facts = briefFacts({ orders, menu, now, paused })
  const rules = ruleBrief(facts)
  const busy = facts.counts.new + facts.counts.preparing + facts.counts.ready > 0
  if (!deps.llm || !busy) return { source: 'rules', text: rules, facts }
  try {
    const raw = await chat(deps.llm, buildBriefMessages(facts), deps.fetchImpl ?? fetch, { json: false, maxTokens: 220 })
    const text = raw.split('\n').map((l) => cleanText(l.replace(/^[-*•\d.)\s]+/, ''), 140)).filter(Boolean).slice(0, 4).join('\n')
    if (text.length < 10 || !numbersGrounded(text, facts)) return { source: 'rules', text: rules, facts }
    return { source: 'ai', text, facts }
  } catch (e) {
    console.warn('brief: LLM unavailable, using rules:', e instanceof Error ? e.message : e)
    return { source: 'rules', text: rules, facts }
  }
}
