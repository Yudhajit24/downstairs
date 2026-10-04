import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import {
  bucketIdOf, dateKey, isBookable, makeSlotId, minutesOfDay, minutesToTime, parseSlotId, slotStartDate, slotState, timeToMinutes, type SlotState,
} from '../../shared/slots'
import type { CafeSettings, SlotDoc } from '../../shared/types'
import { Button } from '../design'
import { time12 } from '../lib/format'

export interface SlotCtx {
  settings: CafeSettings
  slots: Record<string, SlotDoc>
  now: Date
  units: number
  /** When editing: the order's own window, exact pickup minute and units, which must not count against it. */
  own?: { slotId: string; time: string; units: number }
}

/** State of one exact pickup minute (`slotId` = 'YYYY-MM-DD_HHMM'). Capacity is read from its slot window. */
export function stateOfSlot(slotId: string, c: SlotCtx): SlotState {
  const bucket = bucketIdOf(slotId, c.settings.slotMinutes)
  const sameOwn = !!c.own && c.own.slotId === bucket
  // An edited order may keep its own pickup time as long as it doesn't grow, even inside the lead window.
  if (sameOwn && parseSlotId(slotId)?.time === c.own!.time && c.units <= c.own!.units && !c.slots[bucket]?.closed) return 'open'
  return slotState({ slotId: bucket, slot: c.slots[bucket], now: c.now, settings: c.settings, units: c.units, ownUnits: sameOwn ? c.own!.units : 0, startsAt: slotStartDate(slotId) })
}

const STEP = 5

/** An analog clock face that follows the chosen time. Decorative: the readout carries the information. */
function Clock({ minutes, dim }: { minutes: number; dim: boolean }) {
  const m = minutes % 60, h = Math.floor(minutes / 60) % 12
  const minAngle = m * 6, hourAngle = (h + m / 60) * 30
  return (
    <svg width="104" height="104" viewBox="0 0 104 104" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" aria-hidden className={clsx('shrink-0 transition-opacity', dim && 'opacity-50')}>
      <circle cx="54" cy="54" r="46" fill="var(--tomato)" stroke="none" />
      <circle cx="52" cy="52" r="46" fill="var(--paper-raised)" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 * Math.PI) / 180, long = i % 3 === 0
        return <line key={i} x1={52 + Math.sin(a) * (long ? 34 : 38)} y1={52 - Math.cos(a) * (long ? 34 : 38)} x2={52 + Math.sin(a) * 42} y2={52 - Math.cos(a) * 42} strokeWidth={long ? 3 : 1.5} />
      })}
      <line x1="52" y1="52" x2="52" y2="30" strokeWidth="4" transform={`rotate(${hourAngle} 52 52)`} style={{ transition: 'transform 160ms ease-out' }} />
      <line x1="52" y1="52" x2="52" y2="16" strokeWidth="2.5" stroke="var(--tomato-text)" transform={`rotate(${minAngle} 52 52)`} style={{ transition: 'transform 160ms ease-out' }} />
      <circle cx="52" cy="52" r="4" fill="var(--ink)" stroke="none" />
    </svg>
  )
}

/**
 * "When are you coming down?": pick any pickup time with a clock-and-slider instead of fixed slot chips.
 * The bar under the slider shows when the kitchen has room (blue), is filling up (mustard) or is full (grey), so the
 * customer picks a time they like and sees at a glance where it is busy. Capacity still lives on 15-minute windows
 * on the server; the picker only ever commits a time that is bookable right now.
 */
export function PickupTimePicker({ ctx, value, onChange }: { ctx: SlotCtx; value: string | null; onChange: (id: string | null) => void }) {
  const { settings, now } = ctx
  const date = dateKey(now)
  const idOf = (m: number) => makeSlotId(date, minutesToTime(m))

  const lo = settings.forceOpen ? 0 : timeToMinutes(settings.openTime)
  const hi = (settings.forceOpen ? 24 * 60 : timeToMinutes(settings.closeTime)) - STEP // latest pickup minute on the grid
  const earliest = Math.max(lo, Math.ceil((minutesOfDay(now) + settings.leadMinutes) / STEP) * STEP)

  const committed = value ? timeToMinutes(parseSlotId(value)!.time) : null
  const [draft, setDraft] = useState<number | null>(committed)
  // A time chosen elsewhere (edit mode, "Next free" in the notice) becomes the draft.
  useEffect(() => { if (committed !== null) setDraft(committed) }, [committed])

  const stateAt = (m: number) => stateOfSlot(idOf(m), ctx)
  const bookableAt = (m: number) => isBookable(stateAt(m))

  const firstBookable = (from: number) => { for (let m = Math.max(from, earliest); m <= hi; m += STEP) if (bookableAt(m)) return m; return null }

  // Availability bar: one segment per 15 minutes between the earliest time and the end of the day.
  const bar = useMemo(() => {
    if (earliest >= hi) return ''
    const span = hi - earliest
    const color = (s: SlotState) => (s === 'open' ? 'color-mix(in srgb, var(--ink) 28%, var(--paper-raised))' : s === 'few' ? 'var(--mustard)' : 'var(--fog)')
    const stops: string[] = []
    for (let m = earliest; m <= hi; m += settings.slotMinutes) {
      const a = ((m - earliest) / span) * 100, b = Math.min(100, ((m + settings.slotMinutes - earliest) / span) * 100)
      stops.push(`${color(stateOfSlot(idOf(Math.max(m, earliest)), ctx))} ${a}% ${b}%`)
    }
    return `linear-gradient(to right, ${stops.join(', ')})`
  }, [earliest, hi, ctx.slots, ctx.units, ctx.now, ctx.settings]) // eslint-disable-line react-hooks/exhaustive-deps

  if (earliest > hi) return <p className="m-0 text-small text-tomato-text">No more pickup times today. See you tomorrow!</p>

  const shown = draft ?? earliest
  const st = draft === null ? null : stateAt(draft)
  const ok = st !== null && isBookable(st)

  function choose(m: number) {
    const clamped = Math.min(hi, Math.max(earliest, m))
    setDraft(clamped)
    onChange(bookableAt(clamped) ? idOf(clamped) : null) // never commit a time that cannot be booked
  }

  const next = draft !== null && !ok ? firstBookable(draft + STEP) : null
  const asap = firstBookable(earliest)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <Clock minutes={shown} dim={draft === null} />
        <div className="min-w-0 flex-1">
          <p className="m-0 text-micro font-bold uppercase tracking-widest text-ink-deep/70">{draft === null ? 'Earliest' : 'Pickup at'}</p>
          <p aria-live="polite" className={clsx('m-0 font-display text-display-l tnum', draft === null ? 'text-fog' : ok ? 'text-ink' : 'text-tomato-text')}>
            {time12(minutesToTime(shown))}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <button type="button" aria-label="One minute earlier" disabled={shown <= earliest} onClick={() => choose(shown - 1)}
              className="min-h-11 min-w-11 rounded-btn border-2 border-ink bg-paper-raised text-small font-bold text-ink cursor-pointer disabled:opacity-40">−1</button>
            <button type="button" aria-label="One minute later" disabled={shown >= hi} onClick={() => choose(shown + 1)}
              className="min-h-11 min-w-11 rounded-btn border-2 border-ink bg-paper-raised text-small font-bold text-ink cursor-pointer disabled:opacity-40">+1</button>
          </div>
        </div>
      </div>

      <div>
        <div className="relative">
          <div aria-hidden className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-full border-2 border-ink" style={{ background: bar }} />
          <input
            type="range" className="time-range relative" min={earliest} max={hi} step={STEP} value={Math.min(hi, Math.max(earliest, shown))}
            aria-label="Pickup time" aria-valuetext={time12(minutesToTime(shown))}
            onChange={(e) => choose(Number(e.target.value))}
            // Tapping the thumb without moving it should still pick the time that is showing.
            onPointerUp={() => { if (draft === null) choose(shown) }} onKeyUp={() => { if (draft === null) choose(shown) }}
          />
        </div>
        <div className="mt-0.5 flex justify-between text-micro tnum text-ink-deep/70">
          <span>{time12(minutesToTime(earliest))}</span><span>{time12(minutesToTime(hi))}</span>
        </div>
        <p className="mb-0 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-micro text-ink-deep/80">
          <span className="inline-flex items-center gap-1"><i className="inline-block size-2.5 rounded-full border border-ink" style={{ background: 'color-mix(in srgb, var(--ink) 28%, var(--paper-raised))' }} />Room</span>
          <span className="inline-flex items-center gap-1"><i className="inline-block size-2.5 rounded-full border border-ink bg-mustard" />Filling up</span>
          <span className="inline-flex items-center gap-1"><i className="inline-block size-2.5 rounded-full border border-ink bg-fog" />Full or closed</span>
        </p>
      </div>

      <div aria-live="polite" className="flex flex-wrap items-center gap-2">
        {st === null && <p className="m-0 text-small text-ink-deep/80">Slide to choose a time, or take the earliest.</p>}
        {st === 'few' && <p className="m-0 text-small font-bold text-ink">Filling up fast. This time is still free.</p>}
        {st === 'open' && <p className="m-0 text-small font-bold text-leaf">Free at this time.</p>}
        {(st === 'full' || st === 'closed' || st === 'past') && (
          <p role="alert" className="m-0 text-small font-bold text-tomato-text">
            {st === 'closed' ? 'The kitchen is closed for this time.' : st === 'past' ? 'That time has passed.' : 'The kitchen is full at this time.'}
          </p>
        )}
        {next !== null && <Button variant="secondary" onClick={() => choose(next)}>Next free: {time12(minutesToTime(next))}</Button>}
        {st === null && asap !== null && <Button variant="secondary" onClick={() => choose(asap)}>Earliest: {time12(minutesToTime(asap))}</Button>}
      </div>
    </div>
  )
}
