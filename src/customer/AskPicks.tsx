import { useState, type FormEvent } from 'react'
import type { WeatherSim } from '../../shared/suggest'
import { Button } from '../design'
import { ItemIllustration } from '../illustrations'
import { api, ApiClientError, type AssistResponse } from '../lib/api'
import { useCafe, type MenuEntry } from '../lib/CafeData'
import { rupees } from '../lib/format'
import { remainingFor, useCart } from './CartContext'
import { Spinner } from './ui'

const EXAMPLES = ['Something light', 'High protein, post-workout', 'Quick, I\'m in a rush', 'Cold and sweet, under ₹150']

/**
 * "Ask for a pick": free text → up to three suggestions with a reason each.
 * The server answers with an LLM when one is configured and with a rule engine otherwise;
 * either way the picks are validated server-side and re-checked here against the live menu.
 */
export function AskPicks({ simulate, onChoose }: { simulate?: WeatherSim | null; onChoose: (m: MenuEntry) => void }) {
  const { menu } = useCafe()
  const cart = useCart()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [res, setRes] = useState<AssistResponse | null>(null)

  async function ask(query: string) {
    const text = query.trim()
    if (!text || busy) return
    setBusy(true); setError(''); setRes(null)
    try {
      setRes(await api.assist(text, simulate))
    } catch (e) {
      setError(
        e instanceof ApiClientError && e.code === 'RATE_LIMITED' ? e.message
        : e instanceof ApiClientError && e.code === 'NETWORK' ? "Can't reach the café. Try again."
        : "Couldn't come up with a pick just now.",
      )
    } finally { setBusy(false) }
  }
  const submit = (e: FormEvent) => { e.preventDefault(); void ask(q) }

  if (!open) {
    return <Button variant="secondary" block onClick={() => setOpen(true)}>Not sure? Ask for a pick</Button>
  }

  // Re-check against the live menu: an item may have sold out since the server answered.
  const picks = (res?.picks ?? []).map((p) => ({ ...p, item: menu[p.itemId] })).filter((p) => p.item && remainingFor(p.item) > 0)

  return (
    <section aria-label="Ask for a pick" className="rounded-card border-2 border-ink bg-paper-raised p-3">
      <div className="flex items-center justify-between">
        <p className="m-0 font-display text-[17px] leading-6 text-ink">What do you feel like?</p>
        <button type="button" onClick={() => setOpen(false)} className="min-h-11 px-2 text-small font-bold text-ink underline underline-offset-2 cursor-pointer">Close</button>
      </div>
      <form onSubmit={submit} className="mt-1 flex gap-2">
        <label htmlFor="ask" className="sr-only">Describe what you feel like</label>
        <input
          id="ask" value={q} maxLength={140} onChange={(e) => setQ(e.target.value)} placeholder="e.g. something light under ₹150"
          className="h-12 min-w-0 flex-1 rounded-btn border-2 border-ink bg-paper px-3 text-body text-ink-deep placeholder:text-fog"
        />
        <Button type="submit" disabled={busy || !q.trim()}>{busy ? <Spinner /> : 'Suggest'}</Button>
      </form>
      <div className="no-scrollbar -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" disabled={busy} onClick={() => { setQ(ex); void ask(ex) }}
            className="min-h-11 shrink-0 rounded-full border-2 border-ink bg-paper px-3 text-small font-bold text-ink cursor-pointer disabled:opacity-50">{ex}</button>
        ))}
      </div>

      <div aria-live="polite">
        {error && <p role="alert" className="mb-0 mt-3 text-small font-bold text-tomato-text">{error}</p>}
        {res && picks.length === 0 && <p className="mb-0 mt-3 text-body">{res.note ?? 'Nothing fits that right now. Try rephrasing.'}</p>}
        {picks.length > 0 && (
          <>
            <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
              {picks.map(({ itemId, reason, item }) => {
                const inCart = cart.totalQtyOf(itemId)
                const rem = remainingFor(item!)
                return (
                  <li key={itemId} className="flex items-center gap-3 rounded-btn border-2 border-ink bg-paper p-2">
                    <div className="shrink-0"><ItemIllustration name={item!.illustration} size={44} /></div>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-body font-bold leading-5">{item!.name}</p>
                      <p className="m-0 text-small text-ink-deep/80">{reason}</p>
                      <p className="m-0 text-small font-bold tnum">{rupees(item!.price)}{inCart > 0 && <span className="text-ink"> · {inCart} in cart</span>}</p>
                    </div>
                    <Button variant="secondary" aria-label={item!.hasSugarOption ? `Choose options for ${item!.name}` : `Add ${item!.name}`} disabled={!item!.hasSugarOption && inCart >= rem}
                      onClick={() => (item!.hasSugarOption ? onChoose(item!) : cart.add(itemId, null, 1, Number.isFinite(rem) ? rem : undefined))}>Add</Button>
                  </li>
                )
              })}
            </ul>
            <p className="mb-0 mt-2 text-micro text-ink-deep/70">
              {res!.source === 'ai' ? 'Picked by AI from today\'s menu.' : 'Smart picks from today\'s menu.'}{res!.note ? ` ${res!.note}` : ''}
            </p>
          </>
        )}
      </div>
    </section>
  )
}
