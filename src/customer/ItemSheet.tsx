import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { resolveOptions } from '../../shared/pricing'
import type { OptionGroup, Selections, Sugar } from '../../shared/types'
import { BottomSheet, Button, Segmented, VegMark } from '../design'
import { ItemIllustration } from '../illustrations'
import type { MenuEntry } from '../lib/CafeData'
import { rupees } from '../lib/format'
import { remainingFor, type CartApi } from './CartContext'

/** Required single-choice groups (bread) start on their first available choice; everything else starts empty. */
function defaultPicks(item: MenuEntry): Selections {
  const out: Selections = {}
  for (const g of item.options ?? []) {
    if (g.min >= 1 && g.max === 1) {
      const first = g.choices.find((c) => c.available)
      if (first) out[g.id] = [first.id]
    }
  }
  return out
}

/** Running price of the picks so far, even before the build is valid. */
function pickedDelta(item: MenuEntry, picks: Selections): number {
  return (item.options ?? []).reduce((n, g) => n + g.choices.filter((c) => picks[g.id]?.includes(c.id)).reduce((m, c) => m + c.priceDelta, 0), 0)
}

function groupHint(g: OptionGroup): string {
  if (g.max === 1) return g.min >= 1 ? 'Pick 1' : 'Optional · pick 1'
  return g.min >= 1 ? `Pick ${g.min === g.max ? g.max : `${g.min} to ${g.max}`}` : `Optional · up to ${g.max}`
}

export function ItemSheet({ item, cart, onClose }: { item: MenuEntry | null; cart: CartApi; onClose: () => void }) {
  const [sugar, setSugar] = useState<Sugar>('regular')
  const [qty, setQty] = useState(1)
  const [picks, setPicks] = useState<Selections>({})
  useEffect(() => {
    if (item) { setSugar('regular'); setQty(1); setPicks(defaultPicks(item)) }
  }, [item?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const groups = item?.options ?? []
  const resolved = item && groups.length ? resolveOptions(item, picks) : null
  const invalid = resolved && !resolved.ok ? resolved.issue.message : ''
  const unit = item ? item.price + pickedDelta(item, picks) : 0

  const room = item ? remainingFor(item) - cart.totalQtyOf(item.id) : 0
  const max = Math.min(room, 20)
  const q = Math.min(qty, Math.max(max, 1))

  function toggle(g: OptionGroup, id: string) {
    setPicks((cur) => {
      const have = cur[g.id] ?? []
      let next: string[]
      if (g.max === 1) next = have[0] === id ? (g.min === 0 ? [] : have) : [id] // radio: tap again clears only if optional
      else if (have.includes(id)) next = have.filter((x) => x !== id)
      else next = have.length >= g.max ? have : [...have, id]
      const out = { ...cur }
      if (next.length) out[g.id] = next; else delete out[g.id]
      return out
    })
  }

  return (
    <BottomSheet open={!!item} onClose={onClose} title={item?.name ?? 'Item'}>
      {item && (
        <>
          <div className="flex justify-center"><ItemIllustration name={item.illustration} size={groups.length ? 84 : 112} /></div>
          <h2 className="m-0 mt-1 font-display text-display-m text-ink">
            {item.name} <span className="inline-block align-middle"><VegMark veg={item.veg && !(resolved?.ok && resolved.nonVeg)} /></span>
          </h2>
          <p className="mb-4 mt-1 text-small">{item.description}</p>

          {item.hasSugarOption && (
            <>
              <p className="mb-1.5 text-small font-bold text-ink">Sugar</p>
              <Segmented
                label="Sugar level" value={sugar} onChange={setSugar}
                options={[{ value: 'regular', label: 'Regular' }, { value: 'less', label: 'Less' }, { value: 'none', label: 'None' }]}
              />
            </>
          )}

          {groups.map((g) => {
            const chosen = picks[g.id] ?? []
            const full = g.max > 1 && chosen.length >= g.max
            return (
              <fieldset key={g.id} className="m-0 mb-4 border-0 p-0">
                <legend className="mb-1.5 flex w-full items-baseline justify-between p-0">
                  <span className="text-small font-bold text-ink">{g.label}</span>
                  <span className="text-micro text-ink-deep/70">{groupHint(g)}</span>
                </legend>
                <div role={g.max === 1 ? 'radiogroup' : 'group'} aria-label={g.label} className="flex flex-wrap gap-2">
                  {g.choices.map((c) => {
                    const on = chosen.includes(c.id)
                    const off = !c.available || (full && !on)
                    return (
                      <button
                        key={c.id} type="button" role={g.max === 1 ? 'radio' : 'checkbox'} aria-checked={on} disabled={off}
                        onClick={() => toggle(g, c.id)}
                        className={clsx(
                          'min-h-11 rounded-full border-2 px-3.5 text-small font-bold cursor-pointer',
                          on ? 'press border-ink bg-ink text-paper-raised' : 'border-ink bg-paper-raised text-ink',
                          off && 'cursor-not-allowed !border-fog !bg-transparent !text-fog',
                          !c.available && 'line-through',
                        )}
                      >
                        {c.label}
                        {c.available ? (c.priceDelta > 0 && <span className="ml-1 font-normal tnum">+{rupees(c.priceDelta)}</span>) : <span className="ml-1 font-normal no-underline">sold out</span>}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            )
          })}

          <div className="mt-2 flex items-center gap-4">
            <div role="group" aria-label="Quantity" className="flex h-12 items-center rounded-btn border-2 border-ink bg-paper-raised">
              <button type="button" aria-label="One less" disabled={q <= 1} onClick={() => setQty(q - 1)} className="grid size-12 place-items-center text-body font-bold text-ink disabled:opacity-40 cursor-pointer">−</button>
              <span className="min-w-6 text-center text-body font-bold tnum">{q}</span>
              <button type="button" aria-label="One more" disabled={q >= max} onClick={() => setQty(q + 1)} className="grid size-12 place-items-center text-body font-bold text-ink disabled:opacity-40 cursor-pointer">+</button>
            </div>
            <Button
              size="lg" className="flex-1" disabled={room <= 0 || !!invalid}
              onClick={() => {
                cart.add(item.id, item.hasSugarOption ? sugar : null, q, remainingFor(item), resolved?.ok ? resolved.options : undefined)
                onClose()
              }}
            >
              Add · {rupees(unit * q)}
            </Button>
          </div>
          {invalid && <p role="status" className="mb-0 mt-2 text-small font-bold text-tomato-text">{invalid}</p>}
          {room <= 0 && <p className="mt-2 text-small text-tomato-text">You already have everything that's left in your cart.</p>}
        </>
      )}
    </BottomSheet>
  )
}
