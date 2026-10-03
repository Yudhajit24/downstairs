import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { COPY } from '../../shared/constants'
import type { Order } from '../../shared/types'
import { BottomSheet, Button, Card, Skeleton, StatusStepper, useToast, VegMark } from '../design'
import { SceneCancelled, SceneNew, ScenePickedUp, ScenePreparing, SceneReady } from '../illustrations'
import { api, ApiClientError } from '../lib/api'
import { useCafe } from '../lib/CafeData'
import { useOrder } from '../lib/hooks'
import { Poster, posterOfDay } from '../posters/Poster'
import { rupees, STATUS_COPY, SUGAR_TEXT, time12, tokenLabel } from '../lib/format'
import { remainingFor, useCart, type CartLine } from './CartContext'
import { checkLine } from './checkLine'
import { useRecentOrders } from './RecentOrders'
import { ShareButton } from './ShareButton'
import { Notice, ReconnectingBar, TopBar } from './ui'

const SCENES = { new: SceneNew, preparing: ScenePreparing, ready: SceneReady, picked_up: ScenePickedUp, cancelled: SceneCancelled } as const

export function OrderPage() {
  const { id } = useParams()
  const { order, reconnecting } = useOrder(id)
  const { remember, ids } = useRecentOrders()
  const nav = useNavigate()

  // Opening an order link on this device adds it to "recent orders".
  useEffect(() => { if (order && id && !ids.includes(id)) remember(id) }, [order?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Ready: tab title + a buzz (only when it flips while watching, not on first load).
  const prev = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!order) return
    if (order.status === 'ready') {
      document.title = `Ready! ${tokenLabel(order.token)} · Downstairs`
      if (prev.current && prev.current !== 'ready') navigator.vibrate?.([200, 100, 200])
    } else document.title = `${tokenLabel(order.token)} · Downstairs`
    prev.current = order.status
    return () => { document.title = 'downstairs' }
  }, [order?.status, order?.token]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pb-10">
      {reconnecting && <ReconnectingBar />}
      <TopBar title="Your order" onBack={() => nav('/')} />
      {order === undefined ? (
        <div className="flex flex-col gap-3 p-4"><Skeleton className="h-20" /><Skeleton className="h-52" /><Skeleton className="h-32" /></div>
      ) : order === null ? (
        <div className="p-6 text-center">
          <SceneCancelled size={140} />
          <p className="m-0 font-display text-display-m text-ink">We can't find that order.</p>
          <p className="mb-4 mt-1 text-body">The link may be mistyped or the order is gone.</p>
          <Button onClick={() => nav('/')}>Back to the menu</Button>
        </div>
      ) : (
        <OrderBody order={order} />
      )}
    </div>
  )
}

function OrderBody({ order }: { order: Order }) {
  const nav = useNavigate()
  const toast = useToast()
  const { menu } = useCafe()
  const cart = useCart()
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const Scene = SCENES[order.status]
  const token = tokenLabel(order.token)
  const copy =
    order.status === 'cancelled' ? 'Order cancelled'
    : order.status === 'ready' ? STATUS_COPY.ready(token)
    : STATUS_COPY[order.status]

  async function cancel() {
    setBusy(true)
    try {
      await api.cancelOrder(order.id)
      setConfirm(false)
    } catch (e) {
      setConfirm(false)
      toast({ message: e instanceof ApiClientError && e.code === 'ORDER_LOCKED' ? COPY.locked : "Couldn't cancel. Try again." }, 5000)
    } finally { setBusy(false) }
  }

  function orderAgain() {
    const skipped: string[] = []
    const lines: CartLine[] = []
    for (const l of order.items) {
      const item = menu[l.itemId]
      const c = checkLine(item, l)
      if (!c.usable) { skipped.push(c.reason === 'sold out' ? l.name : `${l.name} (${c.reason})`); continue }
      const rem = remainingFor(item!)
      const qty = Math.min(l.qty, rem - lines.filter((x) => x.itemId === l.itemId).reduce((n, x) => n + x.qty, 0))
      if (qty > 0) lines.push({ itemId: l.itemId, sugar: l.sugar, qty, ...(c.options && Object.keys(c.options).length > 0 && { options: c.options }) })
    }
    cart.replace(lines)
    cart.setSlot(null)
    if (skipped.length) toast({ message: `Left out ${skipped.join(', ')}.` }, 5000)
    nav('/cart')
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-5">
      <div aria-live="polite" className="sr-only">Order {token}: {copy}</div>

      <div className="text-center">
        <p className="m-0 font-display text-display-xl text-ink">{token}</p>
        <p className="m-0 mt-1 text-body">Pickup <strong className="tnum">{time12(order.slotTime)}</strong> · Clubhouse counter</p>
      </div>

      {order.status !== 'cancelled' && <StatusStepper status={order.status} />}

      <Card raised className="text-center">
        <div className="relative mx-auto h-[160px] w-[160px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={order.status} className="absolute inset-0" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }}>
              <Scene size={160} />
            </motion.div>
          </AnimatePresence>
        </div>
        <p className="mb-0 mt-2 font-display text-display-m text-ink">{copy}</p>
        {order.status === 'cancelled' && (
          <p className="mb-0 mt-2 text-body">
            Cancelled by {order.cancelledBy === 'kitchen' ? 'the kitchen' : 'you'}
            {order.cancelReason ? `: ${order.cancelReason}.` : '.'}
          </p>
        )}
      </Card>

      {(order.status === 'new' || order.status === 'preparing') && <Poster poster={posterOfDay(new Date())} variant="card" />}

      <section aria-label="Items">
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {order.items.map((l) => (
            <li key={`${l.itemId}${l.sugar}`} className="flex items-baseline justify-between gap-3 text-body">
              <span>
                {l.qty} × {l.name} <span className="inline-block align-middle"><VegMark veg={(menu[l.itemId]?.veg ?? true) && !l.nonVeg} size={14} /></span>
                {l.sugar && l.sugar !== 'regular' && <span className="text-small text-ink-deep/80"> · {SUGAR_TEXT[l.sugar]}</span>}
                {l.custom?.length ? <span className="block text-small text-ink-deep/80">{l.custom.map((c) => c.choices.join(', ')).join(' · ')}</span> : null}
              </span>
              <span className="tnum">{rupees(l.price * l.qty)}</span>
            </li>
          ))}
        </ul>
        {order.note && <p className="mb-0 mt-2 text-small italic">Note: {order.note}</p>}
        <div className="mt-3 flex items-baseline justify-between border-t-2 border-dashed border-ink pt-3">
          <span className="font-bold">Total</span>
          <span className="font-display text-display-m text-ink tnum">{rupees(order.total)}</span>
        </div>
        <p className="mb-0 mt-1 text-small text-ink-deep/80">Pay at the counter on pickup, UPI or cash.</p>
      </section>

      {order.status === 'new' && (
        <div className="flex gap-3">
          <Button variant="secondary" block onClick={() => nav(`/cart?edit=${order.id}`)}>Edit order</Button>
          <Button variant="tomato" block onClick={() => setConfirm(true)}>Cancel order</Button>
        </div>
      )}
      {(order.status === 'preparing' || order.status === 'ready') && <Notice tone="ink">{COPY.locked}</Notice>}
      {(order.status === 'cancelled' || order.status === 'picked_up') && (
        <Button size="lg" block onClick={orderAgain}>Order again</Button>
      )}
      {order.status !== 'cancelled' && <ShareButton items={order.items.map((i) => ({ itemId: i.itemId, sugar: i.sugar, qty: i.qty, ...(i.options && { options: i.options }) }))} />}
      <Link to="/orders" className="text-center text-small font-bold text-ink underline underline-offset-4">All my orders</Link>

      <BottomSheet open={confirm} onClose={() => setConfirm(false)} title="Cancel this order?">
        <h2 className="m-0 font-display text-display-m text-ink">Cancel {token}?</h2>
        <p className="mb-4 mt-1 text-body">The kitchen won't make it, and your slot goes to someone else.</p>
        <div className="flex gap-3">
          <Button variant="secondary" block onClick={() => setConfirm(false)}>Keep it</Button>
          <Button variant="tomato" block disabled={busy} onClick={cancel}>{busy ? 'Cancelling…' : 'Yes, cancel'}</Button>
        </div>
      </BottomSheet>
    </div>
  )
}
