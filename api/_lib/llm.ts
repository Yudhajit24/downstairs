import { fail } from './errors.js'

/**
 * Shared plumbing for every AI feature: config from env, one OpenAI-compatible chat call, JSON extraction,
 * text sanitising and a best-effort in-memory rate limiter. Each feature treats the model's answer as untrusted.
 */
export interface LlmConfig { baseUrl: string; model: string; apiKey?: string }

export function llmConfigFromEnv(env: Record<string, string | undefined> = process.env): LlmConfig | null {
  const baseUrl = env.LLM_BASE_URL?.trim(), model = env.LLM_MODEL?.trim()
  return baseUrl && model ? { baseUrl: baseUrl.replace(/\/+$/, ''), model, apiKey: env.LLM_API_KEY?.trim() || undefined } : null
}

/** Models wrap JSON in markdown fences or add chatter; take the outermost {...}. */
export function extractJson(text: string): unknown {
  const t = text.replace(/```(?:json)?/gi, '')
  const a = t.indexOf('{'), b = t.lastIndexOf('}')
  if (a < 0 || b <= a) throw new Error('no JSON object')
  return JSON.parse(t.slice(a, b + 1))
}

/** Strip control characters and collapse whitespace; cap the length. Model text is never shown raw. */
export function cleanText(s: string | undefined, max: number, fallback = ''): string {
  return (s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) || fallback
}

export interface ChatOptions { maxTokens?: number; json?: boolean; timeoutMs?: number }

/** One chat-completions call; returns the assistant text. Throws on any failure so callers can fall back. */
export async function chat(cfg: LlmConfig, messages: unknown[], fetchImpl: typeof fetch, opts: ChatOptions = {}): Promise<string> {
  const { maxTokens = 350, json = true, timeoutMs = 8000 } = opts
  // Reasoning models (gpt-oss, Qwen3...) spend tokens thinking before they answer: keep that short and leave headroom,
  // otherwise the visible reply comes back empty or cut off.
  const reasoning = /gpt-oss|qwen3|deepseek-r1/i.test(cfg.model)
  const budget = reasoning ? maxTokens + 700 : maxTokens
  const call = async (withFormat: boolean) => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      return await fetchImpl(`${cfg.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(cfg.apiKey && { Authorization: `Bearer ${cfg.apiKey}` }) },
        body: JSON.stringify({
          model: cfg.model, messages, temperature: 0.2, max_tokens: budget,
          ...(/gpt-oss/i.test(cfg.model) && { reasoning_effort: 'low' }),
          ...(withFormat && { response_format: { type: 'json_object' } }),
        }),
        signal: ctrl.signal,
      })
    } finally { clearTimeout(timer) }
  }
  let res = await call(json)
  // Some servers reject response_format; retry once without it.
  if (json && (res.status === 400 || res.status === 422)) res = await call(false)
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}`)
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const text = j.choices?.[0]?.message?.content
  if (!text) throw new Error('empty LLM response')
  return text
}

// ---- abuse protection (best effort: in-memory, per server instance) ----
const limiters: Map<string, number[]>[] = []

/** `check(key, nowMs)` throws RATE_LIMITED when `key` exceeds the per-minute or per-hour budget. */
export function rateLimiter(perMin: number, perHour: number) {
  const hits = new Map<string, number[]>()
  limiters.push(hits)
  return (key: string, nowMs: number) => {
    const recent = (hits.get(key) ?? []).filter((t) => nowMs - t < 3600_000)
    if (recent.filter((t) => nowMs - t < 60_000).length >= perMin || recent.length >= perHour) {
      throw fail('RATE_LIMITED', 'Easy there! Try again in a minute.')
    }
    recent.push(nowMs)
    hits.set(key, recent)
    if (hits.size > 5000) hits.clear() // never grow without bound
  }
}
export function resetRateLimits() { limiters.forEach((m) => m.clear()) }

export function clientIp(req: { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }): string {
  const fwd = req.headers['x-forwarded-for']
  return (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown'
}
