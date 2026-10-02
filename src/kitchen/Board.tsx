import clsx from 'clsx'
import { motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CANCEL_REASONS } from '../../shared/constants'
import type { Order, Status } from '../../shared/types'
import { BottomSheet, useToast } from '../design'
import { Poster, posterOfDay } from '../posters/Poster'
import { cancelSound, chime } from '../lib/audio'
import { useCafe } from '../lib/CafeData'
import { time12, tokenLabel } from '../lib/format'
import { useNow } from '../lib/hooks'
import { ApiClientError } from '../lib/api'
import { useWakeLock } from '../lib/wakelock'
import { StockDrawer, SlotsDrawer } from './Drawers'
import { KitchenSidePanel } from './KitchenSidePanel'
import { KitchenTicket } from './KitchenTicket'
import { kitchenAction, lock } from './staff'
import { useTodayOrders } from './useTodayOrders'

type Col = 'new' | 'preparing' | 'ready' | 'picked_up'
const COLS: { id: Col; label: string }[] = [
  { id: 'new', label: 'New' }, { id: 'preparing', label: 'Preparing' }, { id: 'ready', label: 'Ready' }, { id: 'picked_up', label: 'Picked up' },
]

const bySlot = (a: Order, b: Order) => a.slotStart.getTime() - b.slotStart.getTime() || a.createdAt.getTime() - b.createdAt.getTime()

function istClock(d: Date) {
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
}

const topBtn = 'min-h-14 rounded-btn border-2 border-paper bg-ink px-4 text-body font-bold text-paper cursor-pointer disabled:opacity-50'

export function Board() {
  const { settings } = useCafe()
  const toast = useToast()
  const now = useNow(10_000)
  const [sound, setSound] = useState(() => { try { return localStorage.getItem('ds.sound') !== 'off' } catch { return true } })
  const [flash, setFlash] = useState<Record<string, number>>({})
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [stockOpen, setStockOpen] = useState(false)
  const [slotsOpen, setSlotsOpen] = useState(false)
  const [cancelFor, setCancelFor] = useState<Order | null>(null)
  const [showAllPicked, setShowAllPicked] = useState(false)
  const [tab, setTab] = useState<Col>('new')
  const colRefs = useRef<Partial<Record<Col, HTMLElement | null>>>({})
  const scroller = useRef<HTMLDivElement>(null)
  // Only tickets that arrive after the board has settled slide in (not the whole board on first load).
  const [settled, setSettled] = useState(false)

  useWakeLock(true)

  const soundRef = useRef(sound)
  soundRef.current = sound
  const flashOrder = useCallback((id: string) => {
    setFlash((f) => ({ ...f, [id]: Date.now() }))
    setTimeout(() => setFlash((f) => { const { [id]: _x, ...rest } = f; return rest }), 3000)
  }, [])

  const { orders, loaded, live } = useTodayOrders({
    onNew: (o) => { if (soundRef.current) chime(); flashOrder(o.id) },
    onEdit: (o) => { if (soundRef.current) chime(); flashOrder(o.id); toast({ message: `${tokenLabel(o.token)} was updated by the customer` }, 4000) },
    onCustomerCancel: (o) => { if (soundRef.current) cancelSound(); toast({ message: `${tokenLabel(o.token)} cancelled by customer` }, 6000) },
  })

  const cols = useMemo(() => {
    const m: Record<Col, Order[]> = { new: [], preparing: [], ready: [], picked_up: [] }
    for (const o of orders) if (o.status !== 'cancelled') m[o.status as Col].push(o)
    for (const k of Object.keys(m) as Col[]) m[k].sort(bySlot)
    m.picked_up.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    return m
  }, [orders])

  useEffect(() => { if (loaded) { const t = setTimeout(() => setSettled(true), 1200); return () => clearTimeout(t) } }, [loaded])

  const todayCount = orders.filter((o) => o.status !== 'cancelled').length
  const inProgress = cols.new.length + cols.preparing.length + cols.ready.length

  async function run(o: Order, kind: 'advance' | 'revert') {
    setPending((p) => new Set(p).add(o.id))
    try {
      const r = await kitchenAction({ type: kind, orderId: o.id, expectedStatus: o.status })
      if (r.noop) {
        toast({ message: `${tokenLabel(o.token)} was already moved on another tablet` }, 4000)
      } else if (r.order) {
        const to = r.order.status
        toast({
          message: `${tokenLabel(o.token)} → ${to === 'picked_up' ? 'Picked up' : to[0].toUpperCase() + to.slice(1)}`,
          actionLabel: 'Undo',
          onAction: () => { void undo(o, to) },
        }, 5000)
      }
    } catch (e) { fail(e) }
    finally { setPending((p) => { const n = new Set(p); n.delete(o.id); return n }) }
  }

  async function undo(o: Order, to: Status) {
    try {
      const r = await kitchenAction({ type: 'revert', orderId: o.id, expectedStatus: to })
      if (r.noop) toast({ message: "Can't undo, it has moved again" }, 3000)
    } catch (e) { fail(e) }
  }

  function fail(e: unknown) {
    toast({ message: e instanceof ApiClientError && e.code === 'NETWORK' ? "No connection. That didn't go through." : e instanceof Error ? e.message : 'Something went wrong.' }, 4000)
  }

  async function cancel(o: Order, reason: string) {
    setCancelFor(null)
    setPending((p) => new Set(p).add(o.id))
    try {
      await kitchenAction({ type: 'cancel', orderId: o.id, reason })
      toast({ message: `${tokenLabel(o.token)} cancelled: ${reason}` }, 4000)
    } catch (e) { fail(e) }
    finally { setPending((p) => { const n = new Set(p); n.delete(o.id); return n }) }
  }

  const toggleSound = () => {
    const next = !sound
    setSound(next)
    try { localStorage.setItem('ds.sound', next ? 'on' : 'off') } catch { /* ignore */ }
    if (next) chime()
  }

  const goTab = (c: Col) => {
    setTab(c)
    colRefs.current[c]?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
  }
  // Keep the tab highlighted in sync with swipes (narrow screens).
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const onScroll = () => setTab(COLS[Math.round(el.scrollLeft / el.clientWidth)]?.id ?? 'new')
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const disabled = !live
  const empty = loaded && inProgress === 0

  return (
    <div className="flex h-dvh flex-col bg-ink text-paper">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b-[3px] border-paper px-4 py-2">
        <h1 className="m-0 font-display text-display-m text-paper">DOWNSTAIRS KITCHEN</h1>
        <span className="font-mono text-body font-bold tnum">{istClock(now)} IST</span>
        <span className="text-body font-bold tnum">{todayCount} today · {inProgress} in progress</span>
        <span className={clsx('inline-flex items-center gap-2 rounded-full border-2 px-3 py-1 text-small font-bold', live ? 'border-paper' : 'border-mustard bg-mustard text-ink-deep')} role="status">
          <span className={clsx('size-2.5 rounded-full', live ? 'bg-leaf ring-2 ring-paper' : 'bg-tomato animate-pulse')} />
          {live ? 'Live' : 'Reconnecting'}
        </span>
        {settings?.paused && <span className="rounded-full bg-tomato px-3 py-1 text-small font-bold text-ink-deep">Paused</span>}
        <span className="flex-1" />
        <div className="flex flex-wrap gap-2">
          <button className={topBtn} onClick={() => setStockOpen(true)}>Stock</button>
          <button className={topBtn} onClick={() => setSlotsOpen(true)}>Slots</button>
          <button
            className={clsx(topBtn, settings?.paused && '!border-tomato !bg-tomato !text-ink-deep')} disabled={disabled || !settings} aria-pressed={!!settings?.paused}
            onClick={() => kitchenAction({ type: 'setSettings', paused: !settings?.paused }).catch(fail)}
          >
            {settings?.paused ? 'Resume orders' : 'Pause new orders'}
          </button>
          <button className={topBtn} aria-pressed={sound} onClick={toggleSound}>Sound {sound ? 'on' : 'off'}</button>
          <button className={topBtn} onClick={() => void lock()}>Lock</button>
        </div>
      </header>

      {!live && (
        <div role="alert" className="bg-mustard px-4 py-2 text-center text-body font-bold text-ink-deep">
          Reconnecting… actions are paused until we're live again.
        </div>
      )}

      <nav className="flex gap-2 overflow-x-auto px-4 py-2 lg:hidden" aria-label="Columns">
        {COLS.map((c) => (
          <button key={c.id} onClick={() => goTab(c.id)} aria-pressed={tab === c.id}
            className={clsx('min-h-14 shrink-0 rounded-full border-2 border-paper px-5 text-body font-bold cursor-pointer', tab === c.id ? 'bg-paper text-ink' : 'bg-ink text-paper')}>
            {c.label} <span className="tnum">{cols[c.id].length}</span>
          </button>
        ))}
      </nav>

      <div ref={scroller} className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto lg:grid lg:grid-cols-[1fr_1fr_1fr_0.75fr] lg:gap-4 lg:overflow-visible lg:px-4 lg:pb-4 lg:pr-10">
        {COLS.map((c) => {
          const list = c.id === 'picked_up' && !showAllPicked ? cols.picked_up.slice(0, 10) : cols[c.id]
          return (
            <section key={c.id} ref={(el) => { colRefs.current[c.id] = el }} aria-label={c.label}
              className="flex min-h-0 w-full shrink-0 snap-start flex-col px-4 lg:w-auto lg:px-0">
              <h2 className="m-0 flex items-center justify-between gap-2 whitespace-nowrap rounded-t-card bg-paper px-4 py-2 font-display text-[22px] leading-7 text-ink">
                {c.label}
                <span className="grid min-w-9 place-items-center rounded-full bg-ink px-2 py-0.5 text-body text-paper tnum">{cols[c.id].length}</span>
              </h2>
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-6 pt-3">
                {c.id === 'new' && empty && <EmptyBoard />}
                {c.id !== 'picked_up' && list.map((o) => (
                  <motion.div key={o.id} layout="position" initial={settled ? { opacity: 0, y: -28 } : false} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 34 }}>
                    <KitchenTicket order={o} now={now} flash={o.id in flash} pending={pending.has(o.id)} disabled={disabled}
                      onAdvance={() => run(o, 'advance')} onRevert={() => run(o, 'revert')} onCancel={() => setCancelFor(o)}
                      onSeen={() => kitchenAction({ type: 'ackChanges', orderId: o.id }).catch(fail)} />
                  </motion.div>
                ))}
                {c.id === 'picked_up' && (
                  <>
                    {list.map((o) => (
                      <div key={o.id} className="flex items-center justify-between gap-2 rounded-btn border-2 border-fog bg-ink px-3 py-2 text-fog">
                        <span className="font-mono text-body font-bold">{tokenLabel(o.token)}</span>
                        <span className="min-w-0 flex-1 truncate text-small">{o.customer.name} · {o.customer.flat}</span>
                        <span className="font-mono text-small">{time12(o.slotTime).replace(' ', '')}</span>
                        <button className="min-h-14 rounded-btn border-2 border-fog px-3 text-small font-bold text-paper cursor-pointer disabled:opacity-50" disabled={disabled || pending.has(o.id)} onClick={() => run(o, 'revert')}>Back</button>
                      </div>
                    ))}
                    {cols.picked_up.length > 10 && (
                      <button className={topBtn} onClick={() => setShowAllPicked((v) => !v)}>{showAllPicked ? 'Show fewer' : `Show all (${cols.picked_up.length})`}</button>
                    )}
                  </>
                )}
              </div>
            </section>
          )
        })}
      </div>

      <StockDrawer open={stockOpen} onClose={() => setStockOpen(false)} disabled={disabled} />
      <SlotsDrawer open={slotsOpen} onClose={() => setSlotsOpen(false)} disabled={disabled} now={now} />
      <KitchenSidePanel />

      <BottomSheet open={!!cancelFor} onClose={() => setCancelFor(null)} title="Cancel order">
        {cancelFor && (
          <>
            <h2 className="m-0 font-display text-display-m text-ink">Cancel {tokenLabel(cancelFor.token)}?</h2>
            <p className="mb-3 mt-1 text-body">{cancelFor.customer.name} will see the reason. Pick one:</p>
            <div className="flex flex-col gap-2">
              {CANCEL_REASONS.map((r) => (
                <button key={r} className="min-h-14 rounded-btn border-2 border-ink bg-paper-raised text-body font-bold capitalize text-ink cursor-pointer" onClick={() => cancel(cancelFor, r)}>{r}</button>
              ))}
              <button className="min-h-14 rounded-btn border-2 border-transparent text-body font-bold text-ink underline cursor-pointer" onClick={() => setCancelFor(null)}>Keep the order</button>
            </div>
          </>
        )}
      </BottomSheet>
    </div>
  )
}

/** Shown on the New column when nothing is in progress: today's poster, large, on the cobalt board. */
function EmptyBoard() {
  return (
    <div aria-live="polite">
      <Poster poster={posterOfDay(new Date())} variant="full" />
      <p className="mb-0 mt-3 text-center text-body font-bold">All quiet. New orders show up here with a chime.</p>
    </div>
  )
}
