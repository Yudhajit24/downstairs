import { useState, type FormEvent } from 'react'
import { Button } from '../design'
import { api, ApiClientError } from '../lib/api'
import { Spinner } from './ui'

const EXAMPLES = ['How long will it take?', 'Can I still cancel?', 'What did I order?', 'Where do I collect it?']

/** "Ask about your order": a small read-only Q&A on the status page. It cannot change the order. */
export function OrderChat({ orderId }: { orderId: string }) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [a, setA] = useState<{ q: string; text: string; ai: boolean } | null>(null)

  async function ask(question: string) {
    const t = question.trim()
    if (t.length < 2 || busy) return
    setBusy(true); setError('')
    try {
      const r = await api.orderChat(orderId, t)
      setA({ q: t, text: r.answer, ai: r.source === 'ai' }); setQ('')
    } catch (e) {
      setError(e instanceof ApiClientError && (e.code === 'RATE_LIMITED' || e.code === 'VALIDATION') ? e.message : "Couldn't answer just now.")
    } finally { setBusy(false) }
  }
  const submit = (e: FormEvent) => { e.preventDefault(); void ask(q) }

  return (
    <section aria-label="Ask about your order" className="rounded-card border-2 border-ink bg-paper-raised p-3">
      <p className="m-0 font-display text-[17px] leading-6 text-ink">Ask about your order</p>
      <div className="no-scrollbar -mx-1 mt-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" disabled={busy} onClick={() => void ask(ex)}
            className="min-h-11 shrink-0 rounded-full border-2 border-ink bg-paper px-3 text-small font-bold text-ink cursor-pointer disabled:opacity-50">{ex}</button>
        ))}
      </div>
      <form onSubmit={submit} className="mt-1 flex gap-2">
        <label htmlFor="order-q" className="sr-only">Ask a question about this order</label>
        <input id="order-q" value={q} maxLength={140} onChange={(e) => setQ(e.target.value)} placeholder="e.g. is it almost ready?"
          className="h-12 min-w-0 flex-1 rounded-btn border-2 border-ink bg-paper px-3 text-body text-ink-deep placeholder:text-fog" />
        <Button type="submit" disabled={busy || q.trim().length < 2}>{busy ? <Spinner /> : 'Ask'}</Button>
      </form>
      <div aria-live="polite">
        {error && <p role="alert" className="mb-0 mt-3 text-small font-bold text-tomato-text">{error}</p>}
        {a && (
          <div className="mt-3 rounded-btn border-2 border-ink bg-paper p-3">
            <p className="m-0 text-small font-bold text-ink-deep/80">{a.q}</p>
            <p className="mb-0 mt-1 text-body">{a.text}</p>
            <p className="mb-0 mt-1 text-micro text-ink-deep/70">{a.ai ? 'Answered by AI from your order.' : 'From your order details.'}</p>
          </div>
        )}
      </div>
    </section>
  )
}
