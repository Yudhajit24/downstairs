import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CAFE_LOCATION, CAFE_TAGLINE, CAFE_WORDMARK, COPY } from '../../shared/constants'
import { greeting } from '../../shared/poster'
import { buildLines } from '../../shared/pricing'
import { dateKey, formatTime12, isCafeOpen, nextOpen } from '../../shared/slots'
import type { Category } from '../../shared/types'
import { Button, CartBar, Chip, OpenPill, Skeleton, useToast } from '../design'
import { HeroScene } from '../illustrations'
import { useCafe, type MenuEntry } from '../lib/CafeData'
import { useNow } from '../lib/hooks'
import { smoothScrollToElement } from '../lib/smoothScroll'
import { rupees, SUGAR_TEXT } from '../lib/format'
import { loadProfile } from '../lib/storage'
import { Poster, posterOfDay } from '../posters/Poster'
import { kitchenLoad, weatherBanner } from '../../shared/suggest'
import { fitPicks, type FitFilter } from '../../shared/nutrition'
import { useWeather } from '../lib/weather'
import { songOfDay } from '../../shared/songs'
import { AskPicks } from './AskPicks'
import { RightNow } from './RightNow'
import { isSoldOut, remainingFor, useCart } from './CartContext'
import { checkLine } from './checkLine'
import { ItemRow } from './ItemRow'
import { ItemSheet } from './ItemSheet'
import { useRecentOrders } from './RecentOrders'
import { SongStrip } from './SongStrip'
import { ActivePill, Dock, Notice, PromoBanner } from './ui'

type SectionId = Category | 'fit'
const CATS: { id: SectionId; label: string }[] = [
  { id: 'hot', label: 'Hot' }, { id: 'cold', label: 'Cold' }, { id: 'breakfast', label: 'Breakfast' }, { id: 'bakes', label: 'Bakes' }, { id: 'fit', label: 'Fit' },
]

export function MenuPage() {
  const { menu, menuList, settings, slots, ready, error } = useCafe()
  const cart = useCart()
  const nav = useNavigate()
  const now = useNow(30_000)
  const [sheetItem, setSheetItem] = useState<MenuEntry | null>(null)
  const [active, setActive] = useState<SectionId>('hot')
  const [fitFilter, setFitFilter] = useState<FitFilter>('all')
  const sectionRefs = useRef<Partial<Record<SectionId, HTMLElement | null>>>({})

  // Scroll-spy for the category chips.
  useEffect(() => {
    if (!ready) return
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActive(visible.target.id.replace('cat-', '') as SectionId)
        else {
          // Above the first section (top of the page): nothing is in the band, so fall back to the first chip.
          const first = sectionRefs.current[CATS[0].id]
          if (first && first.getBoundingClientRect().top > 130) setActive(CATS[0].id)
        }
      },
      { rootMargin: '-130px 0px -55% 0px' },
    )
    Object.values(sectionRefs.current).forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [ready])

  const open = settings ? isCafeOpen(settings, now) : true
  const day = dateKey(now)
  const poster = useMemo(() => posterOfDay(new Date()), [day]) // eslint-disable-line react-hooks/exhaustive-deps
  const hello = useMemo(() => greeting(now, loadProfile()?.name), [now.getHours()]) // eslint-disable-line react-hooks/exhaustive-deps
  // A promo (the kitchen's own banner, else notable weather) hides the poster strip so items stay above the fold.
  const weather = useWeather()
  const promoText = settings?.banner || (weather ? weatherBanner(weather) : null)
  // Rush hour: when the next slots are filling up, drop decoration so items stay above the fold.
  const busy = useMemo(() => (settings ? kitchenLoad({ settings, slots, now }).busy : false), [settings, slots, Math.floor(now.getTime() / 60_000)]) // eslint-disable-line react-hooks/exhaustive-deps
  const song = useMemo(() => songOfDay(new Date()), [day]) // eslint-disable-line react-hooks/exhaustive-deps
  // The poster yields to ordering (rush hour, or a promo banner). The song bar does NOT: it is always on top.
  const showPoster = open && !busy && !promoText
  const blocked = settings ? (!open ? COPY.closed(formatTime12(nextOpen(settings).opensAt)) : settings.paused ? COPY.paused : null) : null

  const totals = useMemo(() => buildLines(cart.state.lines, menu), [cart.state.lines, menu])
  const soldOutInCart = useMemo(() => {
    const ids = new Set(cart.state.lines.map((l) => l.itemId))
    return [...ids].filter((id) => isSoldOut(menu[id])).length
  }, [cart.state.lines, menu])
  const cartCount = cart.state.lines.reduce((n, l) => n + l.qty, 0)

  const jump = (c: SectionId) => {
    setActive(c)
    const el = sectionRefs.current[c]
    if (el) void smoothScrollToElement(el, 64) // 64px = the sticky chip bar
  }

  // Keep the active chip in view (the row scrolls sideways on narrow screens).
  const chipRefs = useRef<Partial<Record<SectionId, HTMLButtonElement | null>>>({})
  const chipRow = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const chip = chipRefs.current[active], row = chipRow.current
    if (!chip || !row) return
    // Scroll only the chip row sideways: never the page.
    const target = chip.offsetLeft - (row.clientWidth - chip.clientWidth) / 2
    row.scrollTo({ left: target, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [active])

  return (
    <div className="pb-32">
      <SongStrip song={song} />
      <header className="px-4 pb-4 pt-5">
        <h1 className="m-0 font-display text-display-xl text-ink">{CAFE_WORDMARK}</h1>
        <div className="mt-1 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="m-0 font-script text-script font-bold text-tomato-text">{CAFE_TAGLINE}</p>
            <p className="mb-3 mt-1 text-small">{CAFE_LOCATION}</p>
            <div className="flex flex-wrap items-center gap-2">
              {settings && (
                <OpenPill
                  open={open}
                  label={open ? (settings.forceOpen ? 'Open now' : `Open till ${formatTime12(settings.closeTime).replace(':00', '')}`) : `Closed, back at ${formatTime12(nextOpen(settings).opensAt).replace(':00', '')}`}
                />
              )}
              <ActivePill />
            </div>
          </div>
          <div className="-mb-1 w-28 shrink-0"><HeroScene /></div>
        </div>
        <p className="m-0 mt-3 text-body">Order from your flat. Pick up at the Clubhouse counter.</p>
        <p className="m-0 mt-3 font-display text-[20px] leading-6 text-ink">{hello}</p>
      </header>

      <PromoBanner text={promoText} />

      <div className="flex flex-col gap-3 px-4">
        {!open && <Poster poster={poster} variant="full" />}
        {showPoster && <Poster poster={poster} variant="strip" />}
        {blocked && <Notice tone="tomato" role="alert">{blocked}</Notice>}
        {soldOutInCart > 0 && (
          <Notice tone="tomato" role="alert">
            {soldOutInCart} {soldOutInCart === 1 ? 'item' : 'items'} in your cart just sold out.{' '}
            <button className="font-bold underline underline-offset-2 cursor-pointer" onClick={() => nav('/cart')}>Review</button>
          </Notice>
        )}
        {error && <Notice tone="tomato" role="alert">Can't reach the café right now. Showing what we have.</Notice>}
        <UsualCard />
        {open && <RightNow now={now} weather={weather} busy={busy} />}
        {open && <AskPicks />}
      </div>

      <div className="sticky top-0 z-30 mt-4 border-y-2 border-ink bg-paper px-4 py-2">
        <div ref={chipRow} className="relative flex gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Menu categories">
          {CATS.map((c) => <Chip key={c.id} ref={(el) => { chipRefs.current[c.id] = el }} active={active === c.id} onClick={() => jump(c.id)} role="tab" aria-selected={active === c.id}>{c.label}</Chip>)}
        </div>
      </div>

      {!ready && error ? (
        <div className="px-4 pt-8 text-center">
          <p className="m-0 font-display text-display-m text-ink">Can't reach the café.</p>
          <p className="mb-4 mt-1 text-body">Check your connection and try again.</p>
          <Button onClick={() => location.reload()}>Try again</Button>
        </div>
      ) : !ready ? (
        <div className="flex flex-col gap-3 px-4 pt-6" aria-busy>
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        CATS.map((c) => {
          const items = c.id === 'fit' ? fitPicks(menuList, fitFilter) : menuList.filter((m) => m.category === c.id)
          if (c.id !== 'fit' && !items.length) return null
          return (
            <section key={c.id} id={`cat-${c.id}`} ref={(el) => { sectionRefs.current[c.id] = el }} className="scroll-mt-16 px-4 pt-6">
              <h2 className="m-0 mb-3 font-display text-display-m text-ink">{c.id === 'fit' ? 'Fit picks' : c.label}</h2>
              {c.id === 'fit' && (
                <div className="mb-3">
                  <p className="m-0 mb-2 text-small">Lighter and high-protein picks. Nutrition is approximate.</p>
                  <div className="no-scrollbar flex gap-2 overflow-x-auto" role="group" aria-label="Fit filters">
                    {([['all', 'All'], ['protein', 'High protein (15g+)'], ['light', 'Under 250 kcal']] as const).map(([f, label]) => (
                      <Chip key={f} active={fitFilter === f} onClick={() => setFitFilter(f)}>{label}</Chip>
                    ))}
                  </div>
                </div>
              )}
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {items.map((it) => <ItemRow key={it.id} item={it} cart={cart} onOpenOptions={setSheetItem} />)}
              </ul>
              {c.id === 'fit' && items.length === 0 && <p className="m-0 text-body">Nothing matches that filter right now.</p>}
            </section>
          )
        })
      )}

      <ItemSheet item={sheetItem} cart={cart} onClose={() => setSheetItem(null)} />

      {cartCount > 0 && (
        <Dock><CartBar count={cartCount} total={totals.total} onClick={() => nav('/cart')} /></Dock>
      )}
    </div>
  )
}

/** "Your usual": the last completed order, one tap to add (skipping anything unavailable). */
function UsualCard() {
  const { orders } = useRecentOrders()
  const { menu, ready } = useCafe()
  const cart = useCart()
  const toast = useToast()
  const last = orders.find((o) => o.status === 'picked_up')
  if (!last || !ready) return null

  const lines = last.items.map((l) => ({ l, item: menu[l.itemId], c: checkLine(menu[l.itemId], l) }))
  const skipped = lines.filter(({ c }) => !c.usable)
  const usable = lines.filter(({ c }) => c.usable)
  if (!usable.length) return null

  const add = () => {
    for (const { l, item, c } of usable) {
      const rem = remainingFor(item!)
      const room = rem - cart.totalQtyOf(l.itemId)
      const qty = Math.min(l.qty, room)
      if (qty > 0) cart.add(l.itemId, l.sugar, qty, Number.isFinite(rem) ? rem : undefined, c.options)
    }
    toast({
      message: skipped.length ? `Added without ${skipped.map((s) => s.l.name).join(', ')}, sold out.` : 'Your usual is in the cart.',
    }, 4000)
  }

  return (
    <section aria-label="Your usual" className="rounded-card border-2 border-ink bg-paper-raised p-4 shadow-hard">
      <p className="m-0 font-script text-script font-bold leading-5 text-tomato-text">your usual</p>
      <ul className="m-0 mb-3 mt-1 list-none p-0 text-small">
        {lines.map(({ l, c }) => (
          <li key={`${l.itemId}${l.sugar}${c.picked}`} className={!c.usable ? 'text-fog line-through' : ''}>
            {l.qty} × {l.name}{l.sugar && l.sugar !== 'regular' ? `, ${SUGAR_TEXT[l.sugar]}` : ''}{l.custom?.length ? ` (${l.custom.map((x) => x.choices.join(', ')).join(' · ')})` : ''}
          </li>
        ))}
      </ul>
      {skipped.length > 0 && <p className="mb-3 mt-0 text-small text-tomato-text">{skipped.map((s) => s.l.name).join(', ')} {skipped.length === 1 ? 'is' : 'are'} sold out right now, we'll skip {skipped.length === 1 ? 'it' : 'them'}.</p>}
      <Button block onClick={add}>Add to cart · {rupees(usable.reduce((n, { l, c }) => n + c.unit * l.qty, 0))}</Button>
    </section>
  )
}
