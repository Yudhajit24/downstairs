import { useMemo, useState } from 'react'
import { dateKey, daySlotTimes, makeSlotId, slotStartDate } from '../../shared/slots'
import { Drawer, Switch, useToast, VegMark } from '../design'
import { useCafe } from '../lib/CafeData'
import { time12 } from '../lib/format'
import { ApiClientError, type KitchenActionBody } from '../lib/api'
import { kitchenAction } from './staff'

/** Runs a staff action and reports failures as a toast. */
export function useRun() {
  const toast = useToast()
  return async (a: KitchenActionBody) => {
    try { return await kitchenAction(a) }
    catch (e) {
      toast({ message: e instanceof ApiClientError && e.code === 'NETWORK' ? "No connection. That didn't save." : e instanceof Error ? e.message : 'Something went wrong.' }, 4000)
    }
  }
}

const step = 'grid size-14 place-items-center rounded-btn border-2 border-ink bg-paper-raised text-display-m font-bold text-ink cursor-pointer disabled:opacity-40'

export function StockDrawer({ open, onClose, disabled }: { open: boolean; onClose: () => void; disabled: boolean }) {
  const { menuList } = useCafe()
  const run = useRun()
  return (
    <Drawer open={open} onClose={onClose} title="Stock">
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {menuList.map((m) => {
          const out = !m.available || (m.stock !== null && m.stock <= 0)
          return (
            <li key={m.id} className="rounded-card border-2 border-ink bg-paper-raised p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="m-0 text-body font-bold">{m.name} <span className="inline-block align-middle"><VegMark veg={m.veg} size={14} /></span></p>
                <div className="flex items-center gap-2">
                  <span className={`text-small font-bold ${out ? 'text-tomato-text' : 'text-leaf'}`}>{out ? 'Sold out' : 'On'}</span>
                  <Switch on={m.available} disabled={disabled} label={`${m.name} available`} onChange={(v) => run({ type: 'setItem', itemId: m.id, available: v })} />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {m.stock === null ? (
                  <>
                    <span className="flex-1 text-body">Unlimited</span>
                    <button type="button" disabled={disabled} className="min-h-14 rounded-btn border-2 border-ink bg-paper px-4 font-bold text-ink cursor-pointer disabled:opacity-40" onClick={() => run({ type: 'setItem', itemId: m.id, stock: 10 })}>Track stock</button>
                  </>
                ) : (
                  <>
                    <button type="button" aria-label={`One less ${m.name}`} disabled={disabled || m.stock <= 0} className={step} onClick={() => run({ type: 'setItem', itemId: m.id, stock: m.stock! - 1 })}>−</button>
                    <span className="min-w-14 text-center font-display text-display-m text-ink tnum">{m.stock}</span>
                    <button type="button" aria-label={`One more ${m.name}`} disabled={disabled} className={step} onClick={() => run({ type: 'setItem', itemId: m.id, stock: m.stock! + 1 })}>+</button>
                    <span className="flex-1" />
                    <button type="button" disabled={disabled} className="min-h-14 rounded-btn border-2 border-ink bg-paper px-4 font-bold text-ink cursor-pointer disabled:opacity-40" onClick={() => run({ type: 'setItem', itemId: m.id, stock: null })}>Unlimited</button>
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </Drawer>
  )
}

export function SlotsDrawer({ open, onClose, disabled, now }: { open: boolean; onClose: () => void; disabled: boolean; now: Date }) {
  const { settings, slots } = useCafe()
  const run = useRun()
  const [all, setAll] = useState(false)

  const list = useMemo(() => {
    if (!settings) return []
    const date = dateKey(now)
    const horizon = now.getTime() + 4 * 3600_000
    return daySlotTimes(settings).map((t) => makeSlotId(date, t)).filter((id) => {
      const st = slotStartDate(id).getTime()
      return st >= now.getTime() - 15 * 60_000 && (all || st <= horizon || (slots[id]?.usedUnits ?? 0) > 0 || slots[id]?.closed)
    })
  }, [settings, slots, now, all])

  if (!settings) return null
  return (
    <Drawer open={open} onClose={onClose} title="Slots">
      <div className="mb-4 flex items-center justify-between gap-3 rounded-card border-2 border-ink bg-paper-raised p-3">
        <div>
          <p className="m-0 text-body font-bold">Open 24 hours (demo)</p>
          <p className="m-0 text-small text-ink-deep/80">Lets anyone order at any hour. Turn off for 7 AM – 10 PM.</p>
        </div>
        <Switch on={settings.forceOpen} disabled={disabled} label="Open 24 hours" onChange={(v) => run({ type: 'setSettings', forceOpen: v })} />
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {list.map((id) => {
          const d = slots[id]
          const used = d?.usedUnits ?? 0
          const closed = !!d?.closed
          return (
            <li key={id} className="flex items-center gap-3 rounded-card border-2 border-ink bg-paper-raised px-3 py-2">
              <span className="w-24 text-body font-bold tnum">{time12(id.slice(-4).replace(/^(\d\d)(\d\d)$/, '$1:$2'))}</span>
              <div className="flex-1">
                <div className="h-3 overflow-hidden rounded-full border-2 border-ink bg-paper">
                  <div className="h-full bg-ink" style={{ width: `${Math.min(100, (used / settings.slotCapacityUnits) * 100)}%` }} />
                </div>
                <span className="text-small tnum">{used}/{settings.slotCapacityUnits} units</span>
              </div>
              <span className={`w-14 text-right text-small font-bold ${closed ? 'text-tomato-text' : 'text-leaf'}`}>{closed ? 'Closed' : 'Open'}</span>
              <Switch on={!closed} disabled={disabled} label={`${id} open`} onChange={(open) => run({ type: 'setSlot', slotId: id, closed: !open })} />
            </li>
          )
        })}
      </ul>
      {!all && <button type="button" className="mt-4 min-h-14 w-full rounded-btn border-2 border-ink bg-paper-raised font-bold text-ink cursor-pointer" onClick={() => setAll(true)}>Show the rest of today</button>}
    </Drawer>
  )
}
