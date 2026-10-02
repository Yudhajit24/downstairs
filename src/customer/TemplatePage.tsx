import { doc, getDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { TemplateDoc } from '../../shared/types'
import { Button, Card, Skeleton, useToast, VegMark } from '../design'
import { SceneCancelled, SceneNew } from '../illustrations'
import { useCafe } from '../lib/CafeData'
import { fromFs } from '../lib/convert'
import { db } from '../lib/firebase'
import { rupees, SUGAR_TEXT } from '../lib/format'
import { remainingFor, useCart } from './CartContext'
import { checkLine } from './checkLine'
import { TopBar } from './ui'

/** /t/:id — someone shared an order. Shows it, flags anything unavailable, and drops it into your cart. */
export function TemplatePage() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const cart = useCart()
  const { menu, ready } = useCafe()
  const [tpl, setTpl] = useState<TemplateDoc | null | undefined>(undefined)

  useEffect(() => {
    if (!id) return
    getDoc(doc(db, 'templates', id))
      .then((s) => setTpl(s.exists() ? fromFs<TemplateDoc>(s.data()) : null))
      .catch(() => setTpl(null))
  }, [id])

  const rows = (tpl?.items ?? []).map((l) => ({ l, item: menu[l.itemId], c: checkLine(menu[l.itemId], l) }))
  const usable = rows.filter((r) => r.c.usable)
  const skipped = rows.filter((r) => !r.c.usable)
  const total = usable.reduce((n, { l, c }) => n + c.unit * l.qty, 0)

  function add(replace: boolean) {
    if (replace) cart.replace([])
    for (const { l, item, c } of usable) {
      const rem = remainingFor(item!)
      const room = replace ? rem : rem - cart.totalQtyOf(l.itemId)
      const qty = Math.min(l.qty, room)
      if (qty > 0) cart.add(l.itemId, l.sugar as never, qty, Number.isFinite(rem) ? rem : undefined, c.options)
    }
    if (skipped.length) toast({ message: `Left out ${skipped.map((s) => s.item?.name ?? s.l.itemId).join(', ')}.` }, 4500)
    nav('/cart')
  }

  const hasCart = cart.state.lines.length > 0
  return (
    <div className="pb-10">
      <TopBar title="Shared order" onBack={() => nav('/')} />
      {tpl === undefined || !ready ? (
        <div className="flex flex-col gap-3 p-4"><Skeleton className="h-24" /><Skeleton className="h-40" /></div>
      ) : tpl === null ? (
        <div className="p-6 text-center">
          <SceneCancelled size={140} />
          <p className="m-0 font-display text-display-m text-ink">We can't find that order.</p>
          <p className="mb-4 mt-1 text-body">The link may be mistyped.</p>
          <Button onClick={() => nav('/')}>See the menu</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5 px-4 pt-5">
          <div className="text-center">
            <div className="flex justify-center"><SceneNew size={110} /></div>
            <p className="m-0 font-display text-display-m text-ink">Someone shared an order with you.</p>
          </div>
          <Card raised>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {rows.map(({ l, item, c }) => {
                const out = !c.usable
                return (
                  <li key={`${l.itemId}${l.sugar}`} className={`flex items-baseline justify-between gap-3 text-body ${out ? 'text-fog line-through' : ''}`}>
                    <span>
                      {l.qty} × {item?.name ?? l.itemId} {item && <span className="inline-block align-middle"><VegMark veg={item.veg && !c.nonVeg} size={14} /></span>}
                      {l.sugar && l.sugar !== 'regular' && <span className="text-small"> · {SUGAR_TEXT[l.sugar as keyof typeof SUGAR_TEXT]}</span>}
                      {c.picked && <span className="block text-small">{c.picked}</span>}
                      {out && c.reason && c.reason !== 'sold out' && <span className="block text-small font-bold no-underline">{c.reason}</span>}
                    </span>
                    {item && <span className="tnum">{rupees(c.unit * l.qty)}</span>}
                  </li>
                )
              })}
            </ul>
            {skipped.length > 0 && <p className="mb-0 mt-3 text-small font-bold text-tomato-text">{skipped.length === 1 ? 'One item is' : `${skipped.length} items are`} sold out right now. We'll leave {skipped.length === 1 ? 'it' : 'them'} out.</p>}
            <div className="mt-3 flex items-baseline justify-between border-t-2 border-dashed border-ink pt-3">
              <span className="font-bold">Total</span>
              <span className="font-display text-display-m text-ink tnum">{rupees(total)}</span>
            </div>
          </Card>
          {usable.length === 0 ? (
            <p className="m-0 text-center text-body font-bold text-tomato-text">Everything in this order is sold out right now.</p>
          ) : (
            <div className="flex flex-col gap-2">
              <Button size="lg" block onClick={() => add(false)}>{hasCart ? 'Add to my cart' : 'Start my order with this'}</Button>
              {hasCart && <Button block variant="secondary" onClick={() => add(true)}>Replace my cart</Button>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
