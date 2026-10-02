import clsx from 'clsx'
import { ItemIllustration } from '../illustrations'
import { Button, QtyStepper, Stamp, VegMark } from '../design'
import type { MenuEntry } from '../lib/CafeData'
import { rupees } from '../lib/format'
import { isSoldOut, remainingFor, type CartApi } from './CartContext'

export function ItemRow({ item, cart, onOpenOptions }: { item: MenuEntry; cart: CartApi; onOpenOptions: (i: MenuEntry) => void }) {
  const soldOut = isSoldOut(item)
  const low = item.stock !== null && item.stock > 0 && item.stock <= 3
  const inCart = cart.totalQtyOf(item.id)
  const rem = remainingFor(item)

  return (
    <li className="relative">
      <article className={clsx('flex items-center gap-3 rounded-card border-2 border-ink bg-paper-raised p-3', soldOut && 'border-fog')}>
        <div className={clsx('shrink-0', soldOut && 'opacity-50 grayscale')}>
          <ItemIllustration name={item.illustration} size={64} />
        </div>
        <div className={clsx('min-w-0 flex-1', soldOut && 'opacity-60 grayscale')}>
          <h3 className="m-0 text-body font-bold leading-5">
            {item.name}{' '}
            <span className="inline-block align-middle"><VegMark veg={item.veg} /></span>
          </h3>
          <p className="m-0 mt-0.5 text-small text-ink-deep/80">{item.description}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-body font-bold tnum">{rupees(item.price)}</span>
            {low && !soldOut && <span className="font-script text-script font-bold leading-5 text-tomato-text">only {item.stock} left!</span>}
          </div>
        </div>
        {soldOut ? (
          <span className="sr-only">Sold out</span>
        ) : item.hasSugarOption ? (
          <div className="flex shrink-0 flex-col items-center gap-1">
            <Button variant="secondary" onClick={() => onOpenOptions(item)} aria-label={`Choose options for ${item.name}`}>
              Add
            </Button>
            {inCart > 0 && <span className="text-micro font-bold text-ink tnum">{inCart} in cart</span>}
          </div>
        ) : (
          <div className="shrink-0">
            <QtyStepper
              label={item.name}
              qty={cart.qtyOf(item.id, null)}
              max={Number.isFinite(rem) ? rem : 99}
              onChange={(n) => {
                const cur = cart.qtyOf(item.id, null)
                if (n > cur) cart.add(item.id, null, n - cur, Number.isFinite(rem) ? rem : undefined)
                else cart.setQty(item.id, null, n)
              }}
            />
          </div>
        )}
      </article>
      {soldOut && (
        <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2" aria-hidden>
          <Stamp />
        </span>
      )}
    </li>
  )
}
