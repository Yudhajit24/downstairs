import { useState, type FormEvent } from 'react'
import { Button } from '../design'
import { api, ApiClientError, type ParseOrderResponse } from '../lib/api'
import { useCafe } from '../lib/CafeData'
import { rupees, SUGAR_TEXT } from '../lib/format'
import { remainingFor, useCart } from './CartContext'
import { Spinner } from './ui'

const SAMPLE = 'Hi! 2 cappuccinos (less sugar), a veg sandwich and a choco cookie please'

/**
 * "Paste an order": drop in a chat message and get a cart. Nothing is ordered here: the lines are shown for review,
 * and "Add to cart" puts them in the normal cart, where stock, slot and checkout rules still apply.
 */
export function PasteOrder() {
  const { menu } = useCafe()
  const cart = useCart()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [res, setRes] = useState<ParseOrderResponse | null>(null)
  const [added, setAdded] = useState(false)

  async function read(value: string) {
    const t = value.trim()
    if (!t || busy) return
    setBusy(true); setError(''); setRes(null); setAdded(false)
    try { setRes(await api.parseOrder(t)) }
    catch (e) {
      setError(e instanceof ApiClientError && (e.code === 'RATE_LIMITED' || e.code === 'VALIDATION') ? e.message
        : e instanceof ApiClientError && e.code === 'NETWORK' ? "Can't reach the café. Try again." : "Couldn't read that just now.")
    } finally { setBusy(false) }
  }
  const submit = (e: FormEvent) => { e.preventDefault(); void read(text) }

  // Re-check against the live menu: stock may have changed since the server answered.
  const lines = (res?.lines ?? []).map((l) => ({ ...l, item: menu[l.itemId] })).filter((l) => l.item && remainingFor(l.item) > 0)
  const total = lines.reduce((n, l) => n + l.item!.price * l.qty, 0)

  function addAll() {
    for (const l of lines) {
      const rem = remainingFor(l.item!)
      cart.add(l.itemId, l.sugar, l.qty, Number.isFinite(rem) ? rem : undefined)
    }
    setAdded(true)
  }

  if (!open) return <Button variant="secondary" block onClick={() => setOpen(true)}>Paste an order from chat</Button>

  return (
    <section aria-label="Paste an order" className="rounded-card border-2 border-ink bg-paper-raised p-3">
      <div className="flex items-center justify-between">
        <p className="m-0 font-display text-[17px] leading-6 text-ink">Paste your order</p>
        <button type="button" onClick={() => setOpen(false)} className="min-h-11 px-2 text-small font-bold text-ink underline underline-offset-2 cursor-pointer">Close</button>
      </div>
      <p className="m-0 text-small text-ink-deep/80">Copy a message from WhatsApp, like "2 chai and a poha, no sugar".</p>
      <form onSubmit={submit} className="mt-2 flex flex-col gap-2">
        <label htmlFor="paste" className="sr-only">Paste your order message</label>
        <textarea id="paste" rows={3} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} placeholder="2 cappuccinos, a veg sandwich and a cookie"
          className="min-w-0 resize-none rounded-btn border-2 border-ink bg-paper p-3 text-body text-ink-deep placeholder:text-fog" />
        <div className="flex gap-2">
          <Button type="submit" block disabled={busy || !text.trim()}>{busy ? <Spinner /> : 'Read my order'}</Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => { setText(SAMPLE); void read(SAMPLE) }}>Try a sample</Button>
        </div>
      </form>

      <div aria-live="polite">
        {error && <p role="alert" className="mb-0 mt-3 text-small font-bold text-tomato-text">{error}</p>}
        {res && lines.length === 0 && <p className="mb-0 mt-3 text-body">We couldn't find anything on the menu in that. Try item names like "cappuccino" or "poha".</p>}
        {lines.length > 0 && (
          <>
            <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0">
              {lines.map((l) => (
                <li key={`${l.itemId}${l.sugar}`} className="flex items-baseline justify-between gap-3 text-body">
                  <span>{l.qty} × {l.item!.name}{l.sugar && l.sugar !== 'regular' && <span className="text-small text-ink-deep/80"> · {SUGAR_TEXT[l.sugar]}</span>}</span>
                  <span className="tnum">{rupees(l.item!.price * l.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex items-baseline justify-between border-t-2 border-dashed border-ink pt-2">
              <span className="font-bold">Total</span><span className="font-display text-display-m text-ink tnum">{rupees(total)}</span>
            </div>
            <Button className="mt-2" block disabled={added} onClick={addAll}>{added ? 'Added. See your cart below' : 'Add all to cart'}</Button>
          </>
        )}
        {res && (res.unmatched.length > 0 || res.needsChoices.length > 0 || res.soldOut.length > 0) && (
          <ul className="m-0 mt-2 list-none p-0 text-small text-ink-deep">
            {res.unmatched.length > 0 && <li>Couldn't place: {res.unmatched.join(', ')}. Add by hand from the menu.</li>}
            {res.needsChoices.length > 0 && <li>{res.needsChoices.join(', ')} needs your picks. Build it from the menu.</li>}
            {res.soldOut.length > 0 && <li>Sold out right now: {res.soldOut.join(', ')}.</li>}
          </ul>
        )}
        {res && lines.length > 0 && <p className="mb-0 mt-2 text-micro text-ink-deep/70">{res.source === 'ai' ? 'Read by AI.' : 'Read by smart matching.'} Check it before you order.</p>}
      </div>
    </section>
  )
}
