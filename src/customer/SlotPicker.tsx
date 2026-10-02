import { useMemo, useState } from 'react'
import { isBookable, makeSlotId, parseSlotId, slotStartDate, slotState, todaySlotIds, dateKey, type SlotState } from '../../shared/slots'
import type { CafeSettings, SlotDoc } from '../../shared/types'
import { Button, SlotChip } from '../design'
import { hour12, time12 } from '../lib/format'

export interface SlotCtx {
  settings: CafeSettings
  slots: Record<string, SlotDoc>
  now: Date
  units: number
  /** When editing: the order's own slot and units, which must not count against it. */
  own?: { slotId: string; units: number }
}

export function stateOfSlot(slotId: string, c: SlotCtx): SlotState {
  const sameOwn = c.own && c.own.slotId === slotId
  // An edited order may keep its own slot as long as it doesn't grow.
  if (sameOwn && c.units <= c.own!.units && !c.slots[slotId]?.closed) return 'open'
  return slotState({ slotId, slot: c.slots[slotId], now: c.now, settings: c.settings, units: c.units, ownUnits: sameOwn ? c.own!.units : 0 })
}

const HOURS_SHOWN = 3

/** Today's slot chips, grouped by hour: the next 3 hours, then "Later today". */
export function SlotPicker({ ctx, value, onChange }: { ctx: SlotCtx; value: string | null; onChange: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)

  const groups = useMemo(() => {
    const date = dateKey(ctx.now)
    const m = new Map<string, { slotId: string; time: string }[]>()
    for (const slotId of todaySlotIds(ctx.settings, ctx.now)) {
      if (slotStartDate(slotId).getTime() < ctx.now.getTime()) continue // really gone; skip
      const time = parseSlotId(slotId)!.time
      const h = time.slice(0, 2)
      m.set(h, [...(m.get(h) ?? []), { slotId: makeSlotId(date, time), time }])
    }
    return [...m.entries()]
  }, [ctx.now, ctx.settings])

  if (groups.length === 0) {
    return <p className="m-0 text-small text-tomato-text">No more slots today. See you tomorrow!</p>
  }

  // Always keep the selected slot's hour visible.
  const selHour = value ? parseSlotId(value)?.time.slice(0, 2) : undefined
  const visible = expanded ? groups : groups.filter(([h], i) => i < HOURS_SHOWN || h === selHour)
  const hidden = groups.length - visible.length

  return (
    <div className="flex flex-col gap-3">
      {visible.map(([h, list]) => (
        <div key={h}>
          <p className="mb-1.5 mt-0 text-micro font-bold uppercase tracking-widest text-ink">{hour12(`${h}:00`)}</p>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 pt-1 no-scrollbar">
            {list.map(({ slotId, time }) => {
              const st = stateOfSlot(slotId, ctx)
              return <SlotChip key={slotId} time={time12(time)} state={st} selected={value === slotId && isBookable(st)} onClick={() => onChange(slotId)} />
            })}
          </div>
        </div>
      ))}
      {hidden > 0 && <Button variant="secondary" onClick={() => setExpanded(true)}>Later today</Button>}
    </div>
  )
}
