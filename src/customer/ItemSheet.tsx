import { useEffect, useState } from 'react'
import { BottomSheet, Button, Segmented, VegMark } from '../design'
import { ItemIllustration } from '../illustrations'
import type { Sugar } from '../../shared/types'
import type { MenuEntry } from '../lib/CafeData'
import { rupees } from '../lib/format'
import { remainingFor, type CartApi } from './CartContext'

export function ItemSheet({ item, cart, onClose }: { item: MenuEntry | null; cart: CartApi; onClose: () => void }) {
  const [sugar, setSugar] = useState<Sugar>('regular')
  const [qty, setQty] = useState(1)
  useEffect(() => { if (item) { setSugar('regular'); setQty(1) } }, [item?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const room = item ? remainingFor(item) - cart.totalQtyOf(item.id) : 0
  const max = Math.min(room, 20)
  const q = Math.min(qty, Math.max(max, 1))

  return (
    <BottomSheet open={!!item} onClose={onClose} title={item?.name ?? 'Item'}>
      {item && (
        <>
          <div className="flex justify-center"><ItemIllustration name={item.illustration} size={112} /></div>
          <h2 className="m-0 mt-1 font-display text-display-m text-ink">
            {item.name} <span className="inline-block align-middle"><VegMark veg={item.veg} /></span>
          </h2>
          <p className="mb-4 mt-1 text-small">{item.description}</p>

          <p className="mb-1.5 text-small font-bold text-ink">Sugar</p>
          <Segmented
            label="Sugar level" value={sugar} onChange={setSugar}
            options={[{ value: 'regular', label: 'Regular' }, { value: 'less', label: 'Less' }, { value: 'none', label: 'None' }]}
          />

          <div className="mt-5 flex items-center gap-4">
            <div role="group" aria-label="Quantity" className="flex h-12 items-center rounded-btn border-2 border-ink bg-paper-raised">
              <button type="button" aria-label="One less" disabled={q <= 1} onClick={() => setQty(q - 1)} className="grid size-12 place-items-center text-body font-bold text-ink disabled:opacity-40 cursor-pointer">−</button>
              <span className="min-w-6 text-center text-body font-bold tnum">{q}</span>
              <button type="button" aria-label="One more" disabled={q >= max} onClick={() => setQty(q + 1)} className="grid size-12 place-items-center text-body font-bold text-ink disabled:opacity-40 cursor-pointer">+</button>
            </div>
            <Button
              size="lg" className="flex-1" disabled={room <= 0}
              onClick={() => { cart.add(item.id, sugar, q, remainingFor(item)); onClose() }}
            >
              Add · {rupees(item.price * q)}
            </Button>
          </div>
          {room <= 0 && <p className="mt-2 text-small text-tomato-text">You already have everything that's left in your cart.</p>}
        </>
      )}
    </BottomSheet>
  )
}
