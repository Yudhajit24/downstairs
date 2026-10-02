import { useMemo } from 'react'
import { rightNow, type WeatherNow } from '../../shared/suggest'
import { ItemIllustration } from '../illustrations'
import { useCafe } from '../lib/CafeData'
import { rupees } from '../lib/format'
import { remainingFor, useCart } from './CartContext'

/**
 * "Right now": up to three picks from the weather, time of day and how full the next pickup slots are.
 * Everything here comes from data we already have (live slots) plus the cached weather endpoint.
 */
export function RightNow({ now, weather, busy }: { now: Date; weather: WeatherNow | null; busy: boolean }) {
  const { menuList, settings, ready } = useCafe()
  const cart = useCart()

  const pick = useMemo(() => {
    if (!ready || !settings) return null
    return rightNow({ now, menu: menuList, weather, busy })
    // `now` ticks every 30s; recompute when the minute changes, not on every tick.
  }, [ready, settings, menuList, weather, busy, Math.floor(now.getTime() / 60_000)]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!pick || pick.items.length === 0) return null

  return (
    <section aria-label="Right now">
      <p className="m-0 font-display text-[17px] leading-6 text-ink">{pick.headline}</p>
      {pick.reason && <p className="m-0 text-small text-ink-deep/80">{pick.reason}</p>}
      <ul className="no-scrollbar -mx-4 m-0 mt-2 flex list-none gap-2 overflow-x-auto px-4 pb-1 pt-0.5">
        {pick.items.map((m) => {
          const inCart = cart.totalQtyOf(m.id)
          const rem = remainingFor(m)
          return (
            <li key={m.id} className="flex w-[148px] shrink-0 flex-col rounded-card border-2 border-ink bg-paper-raised p-2">
              <div className="flex items-center gap-2">
                <ItemIllustration name={m.illustration} size={36} />
                <p className="m-0 line-clamp-2 text-small font-bold leading-4">{m.name}</p>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="text-small font-bold tnum">{rupees(m.price)}{inCart > 0 && <span className="text-ink"> ·{inCart}</span>}</span>
                <button
                  type="button" aria-label={`Add ${m.name}`} disabled={inCart >= rem}
                  className="press min-h-11 rounded-btn border-2 border-ink bg-paper-raised px-3 text-small font-bold text-ink cursor-pointer disabled:opacity-40"
                  onClick={() => cart.add(m.id, m.hasSugarOption ? 'regular' : null, 1, Number.isFinite(rem) ? rem : undefined)}
                >
                  Add
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
