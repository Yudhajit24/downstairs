import { formatTime12 } from './slots.js'
import type { MenuRow } from './suggest.js'
import type { Status } from './types.js'

/** The slice of an order the brief needs. No names or flats: the model never sees customer details. */
export interface BriefOrder {
  token: number
  status: Status
  slotTime: string // 'HH:mm'
  createdAtMs: number
  items: { name: string; qty: number }[]
}

export interface BriefFacts {
  counts: { new: number; preparing: number; ready: number }
  /** Items still to make (new + preparing orders), biggest first. */
  toMake: { name: string; qty: number }[]
  /** Pickup slots that still have unfinished orders, soonest first. */
  slots: { time: string; orders: number }[]
  oldestNew: { token: number; minutes: number } | null
  lowStock: { name: string; left: number }[]
  paused: boolean
}

const LOW_STOCK = 3

/** Everything a brief says is computed here, deterministically. A model may only reword it. */
export function briefFacts(a: { orders: BriefOrder[]; menu: MenuRow[]; now: Date; paused?: boolean }): BriefFacts {
  const counts = { new: 0, preparing: 0, ready: 0 }
  const make = new Map<string, number>()
  const slots = new Map<string, number>()
  let oldest: BriefOrder | null = null
  for (const o of a.orders) {
    if (o.status === 'new' || o.status === 'preparing' || o.status === 'ready') counts[o.status]++
    if (o.status === 'new' || o.status === 'preparing') {
      for (const i of o.items) make.set(i.name, (make.get(i.name) ?? 0) + i.qty)
    }
    if (o.status === 'new' || o.status === 'preparing' || o.status === 'ready') slots.set(o.slotTime, (slots.get(o.slotTime) ?? 0) + 1)
    if (o.status === 'new' && (!oldest || o.createdAtMs < oldest.createdAtMs)) oldest = o
  }
  return {
    counts,
    toMake: [...make].map(([name, qty]) => ({ name, qty })).sort((x, y) => y.qty - x.qty || x.name.localeCompare(y.name)).slice(0, 5),
    slots: [...slots].map(([time, orders]) => ({ time, orders })).sort((x, y) => x.time.localeCompare(y.time)).slice(0, 4),
    oldestNew: oldest ? { token: oldest.token, minutes: Math.max(0, Math.floor((a.now.getTime() - oldest.createdAtMs) / 60_000)) } : null,
    lowStock: a.menu.filter((m) => m.available && m.stock !== null && m.stock <= LOW_STOCK).map((m) => ({ name: m.name, left: m.stock! })).slice(0, 4),
    paused: !!a.paused,
  }
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`

/** The always-available brief: short lines, most useful first. */
export function ruleBrief(f: BriefFacts): string {
  const active = f.counts.new + f.counts.preparing + f.counts.ready
  const lines: string[] = []
  if (active === 0) lines.push('No open orders right now. A good moment to restock and wipe down.')
  else {
    lines.push(`${f.counts.new} new, ${f.counts.preparing} preparing, ${f.counts.ready} ready to hand over.`)
    if (f.toMake.length) lines.push(`To make: ${f.toMake.slice(0, 3).map((t) => `${t.name} ×${t.qty}`).join(', ')}.`)
    if (f.slots.length) lines.push(`Next due: ${formatTime12(f.slots[0].time)} (${plural(f.slots[0].orders, 'order')}).`)
    if (f.oldestNew && f.oldestNew.minutes >= 5) lines.push(`Order #${f.oldestNew.token} has been waiting ${f.oldestNew.minutes} min. Start it next.`)
  }
  if (f.lowStock.length) lines.push(`Running low: ${f.lowStock.map((l) => `${l.name} (${l.left} left)`).join(', ')}.`)
  if (f.paused) lines.push('New orders are paused.')
  return lines.join('\n')
}
