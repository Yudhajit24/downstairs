import clsx from 'clsx'
import { nanoid } from 'nanoid'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { COPY } from '../../shared/constants'
import { findItemProblems, lineKey, qtyByItem, resolveOptions } from '../../shared/pricing'
import { flatSchema, nameSchema } from '../../shared/schemas'
import { formatTime12, isBookable, isCafeOpen, nextBookableSlots, nextOpen, parseSlotId } from '../../shared/slots'
import type { ItemProblem, Order, SlotSuggestion } from '../../shared/types'
import { BottomSheet, Button, Card, QtyStepper, Skeleton, VegMark, useToast } from '../design'
import { ItemIllustration } from '../illustrations'
import { api, ApiClientError } from '../lib/api'
import { useCafe } from '../lib/CafeData'
import { useNow, useOrder } from '../lib/hooks'
import { rupees, SUGAR_TEXT, time12 } from '../lib/format'
import { loadProfile, saveProfile } from '../lib/storage'
import { remainingFor, useCart, useEditCart, useNotices, useTotals, type CartApi } from './CartContext'
import { useRecentOrders } from './RecentOrders'
import { ShareButton } from './ShareButton'
import { SlotPicker, stateOfSlot, type SlotCtx } from './SlotPicker'
import { Dock, Notice, Spinner, TopBar } from './ui'

export function CheckoutPage() {
  const [params] = useSearchParams()
  const editId = params.get('edit')
  return editId ? <EditCheckout orderId={editId} /> : <CheckoutView cart={useCart()} />
}

function EditCheckout({ orderId }: { orderId: string }) {
  const { order } = useOrder(orderId)
  const cart = useEditCart(order)
  const nav = useNavigate()
  if (order === undefined) return <div className="p-4"><Skeleton className="h-40" /></div>
  if (order === null) return <Gone text="We couldn't find that order." />
  if (order.status !== 'new') {
    return (
      <>
        <TopBar title="Edit order" onBack={() => nav(`/order/${order.id}`)} />
        <div className="flex flex-col gap-4 p-4">
          <Notice tone="tomato" role="alert">{COPY.locked}</Notice>
          <Link className="font-bold text-ink underline underline-offset-4" to={`/order/${order.id}`}>Back to your order</Link>
        </div>
      </>
    )
  }
  if (!cart) return <div className="p-4"><Skeleton className="h-40" /></div>
  return <CheckoutView cart={cart} edit={order} />
}

function Gone({ text }: { text: string }) {
  return <div className="p-6"><p className="font-display text-display-m text-ink">{text}</p><Link className="font-bold text-ink underline underline-offset-4" to="/">Back to the menu</Link></div>
}

type Modal =
  | { kind: 'items'; items: ItemProblem[] }
  | { kind: 'slot'; message: string; next: SlotSuggestion[] }
  | null

export function CheckoutView({ cart, edit }: { cart: CartApi; edit?: Order }) {
  const { menu, settings, slots, ready } = useCafe()
  const now = useNow(15_000)
  const nav = useNavigate()
  const toast = useToast()
  const { remember } = useRecentOrders()
  const { notices, dismiss } = useNotices()
  const totals = useTotals(cart.state)

  const [orderId] = useState(() => nanoid(21)) // client-generated: reused on every retry (idempotency)
  const inflight = useRef(false)
  const [busy, setBusy] = useState(false)
  const [netErr, setNetErr] = useState(false)
  const [modal, setModal] = useState<Modal>(null)
  const [blockedMsg, setBlockedMsg] = useState<string | null>(null)
  const [lost, setLost] = useState<{ message: string; next?: SlotSuggestion } | null>(null)
  const [serverFields, setServerFields] = useState<Record<string, string>>({})
  const [attempted, setAttempted] = useState(false)

  const saved = useMemo(() => loadProfile(), [])
  const [name, setName] = useState(saved?.name ?? '')
  const [flat, setFlat] = useState(saved?.flat ?? '')

  const held = useMemo(() => new Map(Object.entries(cart.held)), [cart.held])
  const problems = useMemo(
    () => findItemProblems(qtyByItem(cart.state.lines), menu, held),
    [cart.state.lines, menu, held],
  )
  const problemOf = (itemId: string) => problems.find((p) => p.itemId === itemId)
  // Build-your-own lines: validate picks against the live menu. An edited order may keep an ingredient it already holds.
  const heldKeys = useMemo(() => new Set((edit?.items ?? []).map(lineKey)), [edit])
  const resolveLine = (l: (typeof cart.state.lines)[number]) => {
    const item = menu[l.itemId]
    return item?.options?.length ? resolveOptions(item, l.options, heldKeys.has(lineKey(l))) : null
  }
  const optionIssues = cart.state.lines.filter((l) => { const r = resolveLine(l); return r && !r.ok }).length

  const slotCtx: SlotCtx | null = settings
    ? { settings, slots, now, units: totals.units, own: edit ? { slotId: edit.slotId, units: edit.units } : undefined }
    : null

  // If the picked slot stops being bookable (fills up, passes, gets closed), clear it and offer the next one.
  const slotId = cart.state.slotId
  useEffect(() => {
    if (!slotId || !slotCtx || !settings) return
    const st = stateOfSlot(slotId, slotCtx)
    if (isBookable(st)) return
    const upcoming = nextBookableSlots({
      settings, slots, now, units: totals.units, limit: 96,
      ownSlotId: edit?.slotId, ownUnits: edit?.units,
    })
    // "Next free" means the next one after the slot that was lost; fall back to the earliest.
    const next = upcoming.find((u) => u.slotId > slotId) ?? upcoming[0]
    const label = time12(parseSlotId(slotId)!.time)
    const why = st === 'past' ? 'has passed' : st === 'closed' ? 'is closed' : 'just filled up'
    setLost({ message: `${label} ${why}.`, next: next && { slotId: next.slotId, time: next.time } })
    cart.setSlot(null)
  }, [slotId, slots, now, totals.units]) // eslint-disable-line react-hooks/exhaustive-deps

  const open = settings ? isCafeOpen(settings, now) : true
  const blocked = !edit && settings
    ? (!open ? COPY.closed(formatTime12(nextOpen(settings).opensAt)) : settings.paused ? COPY.paused : null)
    : null

  const nameErr = nameSchema.safeParse(name)
  const flatErr = flatSchema.safeParse(flat)
  const tooLarge = settings && (totals.units > settings.maxUnitsPerOrder || totals.itemCount > settings.maxItemsPerOrder)
  const slotOk = !!slotId && !!slotCtx && isBookable(stateOfSlot(slotId, slotCtx))
  const valid =
    cart.state.lines.length > 0 && problems.length === 0 && optionIssues === 0 && !tooLarge && slotOk && !blocked &&
    (edit ? true : nameErr.success && flatErr.success)

  const err = (field: 'name' | 'flat') => {
    const local = field === 'name' ? (nameErr.success ? '' : nameErr.error.issues[0].message) : (flatErr.success ? '' : flatErr.error.issues[0].message)
    const show = attempted || (field === 'name' ? name : flat).length > 0
    return serverFields[`customer.${field}`] || (show ? local : '')
  }

  const hint =
    problems.length || optionIssues ? 'Fix the items above to continue'
    : !slotOk ? 'Pick a pickup time to continue'
    : !edit && !nameErr.success ? 'Add your name to continue'
    : !edit && !flatErr.success ? 'Add your flat to continue' : ''

  const placeLabel = edit ? 'Save changes' : `Place order · ${rupees(totals.total)}`

  async function place() {
    if (inflight.current || !slotId) return
    setAttempted(true)
    if (!valid) return
    inflight.current = true
    setBusy(true); setNetErr(false); setBlockedMsg(null); setServerFields({})
    const items = cart.state.lines.map((l) => ({ itemId: l.itemId, qty: l.qty, sugar: l.sugar, ...(l.options && { options: l.options }) }))
    const note = cart.state.note.trim() || null
    try {
      if (edit) {
        await api.editOrder(edit.id, { items, slotId, note })
        cart.clear()
        toast({ message: 'Changes saved. The kitchen has the update.' }, 4000)
        nav(`/order/${edit.id}`, { replace: true })
      } else {
        const r = await api.createOrder(orderId, { customer: { name: name.trim(), flat }, items, slotId, note })
        saveProfile({ name: name.trim(), flat: flatErr.success ? flatErr.data : flat })
        remember(r.order.id)
        cart.clear()
        nav(`/order/${r.order.id}`, { replace: true })
      }
    } catch (e) {
      handleError(e)
    } finally {
      inflight.current = false
      setBusy(false)
    }
  }

  function handleError(e: unknown) {
    if (!(e instanceof ApiClientError)) return setNetErr(true)
    switch (e.code) {
      case 'NETWORK': case 'INTERNAL': return setNetErr(true)
      case 'VALIDATION': return setServerFields(e.details?.fields ?? {})
      case 'CLOSED': case 'PAUSED': case 'ORDER_TOO_LARGE': return setBlockedMsg(e.message)
      case 'ORDER_LOCKED': return setBlockedMsg(COPY.locked)
      case 'ITEM_UNAVAILABLE': return setModal({ kind: 'items', items: e.details?.items ?? [] })
      case 'SLOT_FULL': case 'SLOT_PASSED': case 'SLOT_CLOSED':
        cart.setSlot(null)
        return setModal({ kind: 'slot', message: e.message, next: e.details?.nextSlots ?? [] })
      case 'NOT_FOUND': return setBlockedMsg('We could not find that order.')
      default: setBlockedMsg(e.message)
    }
  }

  function fixItems(items: ItemProblem[]) {
    for (const p of items) {
      if (p.reason === 'option') {
        // The kitchen switched an ingredient off: drop just that ingredient from the affected lines.
        cart.state.lines.filter((l) => l.itemId === p.itemId && l.options?.[p.groupId ?? '']?.includes(p.choiceId ?? '')).forEach((l) => cart.fixOption(l, p.groupId!, p.choiceId!))
        continue
      }
      const lines = cart.state.lines.filter((l) => l.itemId === p.itemId)
      const rem = p.remaining ?? 0
      if (p.reason !== 'stock' || rem <= 0) lines.forEach((l) => cart.setQty(l.itemId, l.sugar, 0))
      else {
        let left = rem
        for (const l of lines) { const q = Math.min(l.qty, left); left -= q; cart.setQty(l.itemId, l.sugar, q) }
      }
    }
    setModal(null)
  }

  if (!ready || !settings || !slotCtx) {
    return <><TopBar title="Your order" onBack={() => nav('/')} /><div className="flex flex-col gap-3 p-4"><Skeleton className="h-24" /><Skeleton className="h-40" /></div></>
  }

  if (cart.state.lines.length === 0) {
    return (
      <>
        <TopBar title={edit ? 'Edit order' : 'Your order'} onBack={() => nav(edit ? `/order/${edit.id}` : '/')} />
        <div className="p-6 text-center">
          <p className="font-display text-display-m text-ink">Nothing here yet.</p>
          <p className="mb-4 text-body">Add a few things from the menu and come back.</p>
          <Button onClick={() => nav('/')}>Back to the menu</Button>
        </div>
      </>
    )
  }

  return (
    <div className="pb-40">
      <TopBar title={edit ? 'Edit order' : 'Your order'} onBack={() => nav(edit ? `/order/${edit.id}` : '/')} />
      <div className="flex flex-col gap-6 px-4 pt-4">
        {blocked && <Notice tone="tomato" role="alert">{blocked}</Notice>}
        {blockedMsg && <Notice tone="tomato" role="alert">{blockedMsg}</Notice>}
        {tooLarge && <Notice tone="tomato" role="alert">{COPY.tooLarge}</Notice>}

        <section aria-labelledby="h-order">
          <h2 id="h-order" className="m-0 mb-3 font-display text-display-m text-ink">Your order</h2>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {cart.state.lines.map((l) => {
              const item = menu[l.itemId]
              const p = problemOf(l.itemId)
              const soldOut = !!p && (p.reason !== 'stock' || (p.remaining ?? 0) <= 0)
              const r = resolveLine(l)
              const issue = r && !r.ok ? r.issue : null
              const unit = (item?.price ?? 0) + (r && r.ok ? r.priceDelta : 0)
              const picked = r && r.ok ? r.custom.map((c) => c.choices.join(', ')).join(' · ') : ''
              const msg = notices[l.itemId]
              const rem = item ? remainingFor(item, cart.held[l.itemId] ?? 0) : 0
              return (
                <li key={lineKey(l)}>
                  <Card className={clsx('flex items-center gap-3 !p-3', (soldOut || issue) && '!border-tomato-text')}>
                    <div className="shrink-0"><ItemIllustration name={item?.illustration ?? l.itemId} size={48} /></div>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-body font-bold leading-5">
                        {item?.name ?? l.itemId} {item && <span className="inline-block align-middle"><VegMark veg={item.veg && !(r && r.ok && r.nonVeg)} size={14} /></span>}
                      </p>
                      {picked && <p className="m-0 text-small text-ink-deep/80">{picked}</p>}
                      <p className="m-0 text-small text-ink-deep/80">{l.sugar && l.sugar !== 'regular' ? `${SUGAR_TEXT[l.sugar]} · ` : ''}<span className="tnum">{rupees(unit * l.qty)}</span></p>
                    </div>
                    {soldOut ? (
                      <Button variant="tomato" onClick={() => cart.setQty(l.itemId, l.sugar, 0, l.options)}>Remove</Button>
                    ) : (
                      <QtyStepper
                        label={item?.name ?? 'item'} qty={l.qty} min={0} max={Number.isFinite(rem) ? Math.max(rem - (cart.totalQtyOf(l.itemId) - l.qty), 1) : 99}
                        onChange={(n) => cart.setQty(l.itemId, l.sugar, n, l.options)}
                      />
                    )}
                  </Card>
                  {soldOut && <p role="alert" className="mx-1 mb-0 mt-1.5 text-small font-bold text-tomato-text">Sold out, remove</p>}
                  {!soldOut && issue && (
                    <p role="alert" className="mx-1 mb-0 mt-1.5 text-small font-bold text-tomato-text">
                      {issue.message}{' '}
                      {issue.kind === 'unavailable' && issue.choiceId
                        ? <button className="underline underline-offset-2 cursor-pointer" onClick={() => cart.fixOption(l, issue.groupId, issue.choiceId!)}>Remove it</button>
                        : <button className="underline underline-offset-2 cursor-pointer" onClick={() => cart.setQty(l.itemId, l.sugar, 0, l.options)}>Remove this item</button>}
                    </p>
                  )}
                  {!soldOut && msg && (
                    <p role="status" className="mx-1 mb-0 mt-1.5 text-small font-bold text-tomato-text">
                      {msg}{' '}
                      <button className="underline underline-offset-2 cursor-pointer" onClick={() => dismiss(l.itemId)}>Got it</button>
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        <section>
          <label htmlFor="note" className="mb-1.5 block text-small font-bold text-ink">Note <span className="font-normal text-ink-deep/70">(optional)</span></label>
          <input
            id="note" maxLength={80} value={cart.state.note} onChange={(e) => cart.setNote(e.target.value)}
            placeholder="Anything else? e.g. extra hot"
            className="h-12 w-full rounded-btn border-2 border-ink bg-paper-raised px-4 text-body text-ink-deep placeholder:text-fog"
          />
        </section>

        <section aria-labelledby="h-slot">
          <h2 id="h-slot" className="m-0 font-display text-display-m text-ink">When are you coming down?</h2>
          <p className="mb-3 mt-0.5 text-micro font-bold uppercase tracking-widest text-ink-deep/70">All times IST</p>
          {lost && !slotId && (
            <Notice tone="tomato" role="alert" className="mb-3">
              {lost.message}{' '}
              {lost.next && (
                <button
                  className="font-bold underline underline-offset-2 cursor-pointer"
                  onClick={() => { cart.setSlot(lost.next!.slotId); setLost(null) }}
                >
                  Next free: {time12(lost.next.time)}. Take it
                </button>
              )}
            </Notice>
          )}
          <SlotPicker ctx={slotCtx} value={slotId} onChange={(id) => { cart.setSlot(id); setLost(null) }} />
          {attempted && !slotId && <p role="alert" className="mt-2 text-small font-bold text-tomato-text">Pick a pickup time.</p>}
        </section>

        {edit ? (
          <section>
            <h2 className="m-0 mb-1 font-display text-display-m text-ink">Your details</h2>
            <p className="m-0 text-body">{edit.customer.name} · {edit.customer.flat}</p>
          </section>
        ) : (
          <section aria-labelledby="h-details">
            <h2 id="h-details" className="m-0 mb-3 font-display text-display-m text-ink">Your details</h2>
            <div className="flex flex-col gap-3">
              <Field id="name" label="Name" value={name} onChange={setName} autoComplete="given-name" error={err('name')} />
              <Field id="flat" label="Flat" value={flat} onChange={(v) => setFlat(v.toUpperCase())} autoComplete="off" placeholder="e.g. B-402" error={err('flat')} />
            </div>
          </section>
        )}

        {!edit && problems.length === 0 && (
          <ShareButton items={cart.state.lines.map((l) => ({ itemId: l.itemId, sugar: l.sugar, qty: l.qty, ...(l.options && { options: l.options }) }))} label="Share this cart (group order?)" />
        )}

        <section aria-labelledby="h-sum">
          <h2 id="h-sum" className="sr-only">Summary</h2>
          <Card raised>
            <div className="flex items-baseline justify-between">
              <span className="text-body">Item total</span>
              <span className="font-display text-display-m text-ink tnum">{rupees(totals.total)}</span>
            </div>
            <p className="mb-0 mt-2 text-small text-ink-deep/80">Pay at the counter on pickup, UPI or cash.</p>
          </Card>
        </section>
      </div>

      <Dock>
        {netErr && (
          <Notice tone="tomato" role="alert" className="mb-2">
            Couldn't reach the café. Your cart is safe.{' '}
            <button className="font-bold underline underline-offset-2 cursor-pointer" onClick={place}>Try again</button>
          </Notice>
        )}
        {!valid && !busy && hint && <p className="mb-2 mt-0 text-center text-small font-bold text-ink">{hint}</p>}
        <Button size="lg" block disabled={busy || !valid} onClick={place} aria-busy={busy}>
          {busy ? <><Spinner /> Placing…</> : placeLabel}
        </Button>
      </Dock>

      <BottomSheet open={modal?.kind === 'items'} onClose={() => setModal(null)} title="Some items changed">
        {modal?.kind === 'items' && (
          <>
            <h2 className="m-0 font-display text-display-m text-ink">Just so you know</h2>
            <ul className="my-3 flex list-none flex-col gap-2 p-0">
              {modal.items.map((p) => (
                <li key={p.itemId} className="text-body">
                  <strong>{menu[p.itemId]?.name ?? p.itemId}</strong>{' '}
                  {p.reason === 'option' ? (p.label ?? 'has an ingredient that just sold out.') : p.reason !== 'stock' || (p.remaining ?? 0) <= 0 ? 'just sold out.' : `has only ${p.remaining} left.`}
                </li>
              ))}
            </ul>
            <Button size="lg" block onClick={() => fixItems(modal.items)}>
              {modal.items.some((p) => p.reason === 'option') ? 'Remove it and continue' : modal.items.every((p) => p.reason !== 'stock' || (p.remaining ?? 0) <= 0) ? 'Remove and continue' : 'Update my cart'}
            </Button>
          </>
        )}
      </BottomSheet>

      <BottomSheet open={modal?.kind === 'slot'} onClose={() => setModal(null)} title="Pick another time">
        {modal?.kind === 'slot' && (
          <>
            <h2 className="m-0 font-display text-display-m text-ink">{modal.message}</h2>
            <p className="mb-3 mt-1 text-body">{modal.next.length ? 'Pick another time:' : 'No more slots today.'}</p>
            <div className="flex flex-col gap-2">
              {modal.next.map((s) => (
                <Button key={s.slotId} size="lg" block variant="secondary" onClick={() => { cart.setSlot(s.slotId); setModal(null); setLost(null) }}>
                  {time12(s.time)}
                </Button>
              ))}
            </div>
          </>
        )}
      </BottomSheet>
    </div>
  )
}

function Field({ id, label, value, onChange, error, ...rest }: {
  id: string; label: string; value: string; onChange: (v: string) => void; error?: string
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'id'>) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-small font-bold text-ink">{label}</label>
      <input
        id={id} value={value} onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined}
        className={clsx('h-12 w-full rounded-btn border-2 bg-paper-raised px-4 text-body text-ink-deep placeholder:text-fog', error ? 'border-tomato-text' : 'border-ink')}
        {...rest}
      />
      {error && <p id={`${id}-err`} role="alert" className="mb-0 mt-1 text-small font-bold text-tomato-text">{error}</p>}
    </div>
  )
}
