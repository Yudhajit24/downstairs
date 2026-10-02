import { useState } from 'react'
import { ticketTime } from '../../shared/ticketTime'
import type { Order } from '../../shared/types'
import { Ticket } from '../design'
import { SUGAR_TEXT, time12 } from '../lib/format'

const PRIMARY = { new: 'START →', preparing: 'READY →', ready: 'PICKED UP ✓' } as const
const big = 'min-h-14 rounded-btn border-2 border-ink-deep text-body font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'

export function KitchenTicket({ order, now, flash, pending, disabled, onAdvance, onRevert, onCancel, onSeen }: {
  order: Order; now: Date; flash: boolean; pending: boolean; disabled: boolean
  onAdvance: () => void; onRevert: () => void; onCancel: () => void; onSeen: () => void
}) {
  const [menu, setMenu] = useState(false)
  const t = ticketTime(order, now)
  const tone = flash ? 'flash' : t.tone
  const updated = order.changes && order.changes.length > 0 && !order.changesSeen && order.status !== 'ready'
  const status = order.status as keyof typeof PRIMARY
  const off = disabled || pending

  return (
    <Ticket
      token={order.token}
      time={time12(order.slotTime).replace(' ', '')}
      tone={tone}
      header={
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[16px]">
          <span className="whitespace-nowrap font-bold">{order.customer.name} · {order.customer.flat}</span>
          <span className={t.tone === 'late' ? 'font-bold text-tomato-text' : t.tone === 'soon' ? 'font-bold' : ''}>{t.label}</span>
        </div>
      }
      footer={
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button" disabled={off} onClick={onAdvance}
              className={`${big} flex-1 ${status === 'ready' ? 'bg-leaf text-paper-raised' : status === 'preparing' ? 'bg-mustard text-ink-deep' : 'bg-ink text-paper-raised'}`}
            >
              {PRIMARY[status]}
            </button>
            <button type="button" aria-label="More actions" aria-expanded={menu} onClick={() => setMenu((m) => !m)} className={`${big} w-14 bg-paper-raised text-ink`}>⋯</button>
          </div>
          {menu && (
            <div className="flex gap-2">
              {order.status !== 'new' && (
                <button type="button" disabled={off} className={`${big} flex-1 bg-paper-raised text-ink`} onClick={() => { setMenu(false); onRevert() }}>← Move back</button>
              )}
              <button type="button" disabled={off} className={`${big} flex-1 bg-paper-raised text-tomato-text`} onClick={() => { setMenu(false); onCancel() }}>Cancel order</button>
            </div>
          )}
        </div>
      }
    >
      {order.items.map((l) => (
        <div key={`${l.itemId}${l.sugar}`} className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span>{String(l.qty).padEnd(2, ' ')}&nbsp;{l.name}</span>
          {l.sugar && l.sugar !== 'regular' && <span className="ml-auto text-[16px]">{SUGAR_TEXT[l.sugar]}</span>}
        </div>
      ))}
      {order.note && <div className="mt-1 text-[16px]">note: {order.note}</div>}
      {updated && (
        <div className="mt-3 rounded-lg border-[3px] border-tomato p-2 text-[16px]">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-block -rotate-3 rounded border-2 border-tomato px-1.5 font-bold tracking-wider text-tomato-text">UPDATED</span>
            <button type="button" disabled={disabled} onClick={onSeen} className="min-h-14 rounded-btn border-2 border-ink-deep bg-paper-raised px-4 font-bold text-ink cursor-pointer disabled:opacity-50">Seen</button>
          </div>
          <ul className="m-0 mt-1 list-none p-0 font-bold">
            {order.changes!.map((c, i) => <li key={i}>{c.label}</li>)}
          </ul>
        </div>
      )}
    </Ticket>
  )
}
