import { COPY } from '../../shared/constants.js'
import { advance, canCancel, revert } from '../../shared/status.js'
import {
  buildLines, diffOrder, findItemProblems, qtyByItem,
} from '../../shared/pricing.js'
import {
  dateKey, daySlotTimes, formatTime12, isBookable, isCafeOpen, makeSlotId, nextBookableSlots, nextOpen,
  parseSlotId, slotStartDate, slotState,
} from '../../shared/slots.js'
import type { CreateOrderInput, CustomerPatch, KitchenAction } from '../../shared/schemas.js'
import type { CafeSettings, MenuItem, Order, SlotDoc, Status } from '../../shared/types.js'
import type { Db, Tx } from './db.js'
import { fail } from './errors.js'

type EditInput = Extract<CustomerPatch, { action: 'edit' }>

// ---------- reads ----------

async function getSettings(tx: Tx): Promise<CafeSettings> {
  const s = await tx.get<CafeSettings>('settings/cafe')
  if (!s) throw fail('INTERNAL', 'Café settings missing. Run the seed script.')
  return s
}

async function getMenu(tx: Tx, ids: string[]): Promise<Record<string, MenuItem>> {
  const uniq = [...new Set(ids)]
  const docs = await Promise.all(uniq.map((id) => tx.get<MenuItem>(`menu/${id}`)))
  const out: Record<string, MenuItem> = {}
  uniq.forEach((id, i) => { const d = docs[i]; if (d) out[id] = d })
  return out
}

async function getSlots(tx: Tx, ids: string[]): Promise<Record<string, SlotDoc | undefined>> {
  const uniq = [...new Set(ids)]
  const docs = await Promise.all(uniq.map((id) => tx.get<SlotDoc>(`slots/${id}`)))
  return Object.fromEntries(uniq.map((id, i) => [id, docs[i]]))
}

// ---------- shared checks ----------

function assertCafeOpen(settings: CafeSettings, now: Date) {
  if (!isCafeOpen(settings, now)) {
    const n = nextOpen(settings)
    throw fail('CLOSED', COPY.closed(n.label), n)
  }
  if (settings.paused) throw fail('PAUSED', COPY.paused)
}

function assertLimits(settings: CafeSettings, itemCount: number, units: number) {
  if (itemCount > settings.maxItemsPerOrder || units > settings.maxUnitsPerOrder) {
    throw fail('ORDER_TOO_LARGE', COPY.tooLarge, {
      maxItems: settings.maxItemsPerOrder, maxUnits: settings.maxUnitsPerOrder, itemCount, units,
    })
  }
}

/** Throws the right SLOT_* error, with the next 3 bookable slots for one-tap recovery. */
async function assertSlot(tx: Tx, a: {
  settings: CafeSettings; now: Date; slotId: string; slot: SlotDoc | undefined; units: number
  ownSlotId?: string; ownUnits?: number
}) {
  const { settings, now, slotId, slot, units, ownSlotId, ownUnits = 0 } = a
  const p = parseSlotId(slotId)
  const times = daySlotTimes(settings)
  if (!p || !times.includes(p.time)) throw fail('VALIDATION', 'Pick a valid pickup slot.', { fields: { slotId: 'Invalid slot' } })
  const today = dateKey(now)
  if (p.date > today) throw fail('VALIDATION', 'You can only book slots for today.', { fields: { slotId: 'Not today' } })

  const own = slotId === ownSlotId ? ownUnits : 0
  const state = p.date < today ? 'past' : slotState({ slotId, slot, now, settings, units, ownUnits: own })
  if (isBookable(state)) return

  const candidates = makeCandidateIds(settings, now)
  const slots = await getSlots(tx, candidates)
  const next = nextBookableSlots({ settings, slots, now, units, ownSlotId, ownUnits })
  const code = state === 'past' ? 'SLOT_PASSED' : state === 'closed' ? 'SLOT_CLOSED' : 'SLOT_FULL'
  const label = formatTime12(p.time)
  const msg = state === 'past' ? `${label} has passed.` : state === 'closed' ? `${label} is closed.` : `${label} just filled up.`
  throw fail(code, msg, { slotId, nextSlots: next })
}

/** Slot ids worth reading when suggesting alternatives: from now to ~4 hours ahead. */
function makeCandidateIds(settings: CafeSettings, now: Date): string[] {
  const date = dateKey(now)
  const horizon = now.getTime() + 4 * 3600_000
  return daySlotTimes(settings)
    .map((t) => makeSlotId(date, t))
    .filter((id) => { const t = slotStartDate(id).getTime(); return t >= now.getTime() && t <= horizon })
}

function slotDoc(slotId: string, existing: SlotDoc | undefined, usedUnits: number): SlotDoc {
  const p = parseSlotId(slotId)!
  return { date: p.date, time: p.time, closed: existing?.closed ?? false, usedUnits: Math.max(0, usedUnits) }
}

// ---------- create ----------

export async function createOrder(db: Db, input: CreateOrderInput, now: Date): Promise<{ created: boolean; order: Order }> {
  return db.runTransaction(async (tx) => {
    const existing = await tx.get<Order>(`orders/${input.id}`)
    if (existing) return { created: false, order: existing }

    const settings = await getSettings(tx)
    const menu = await getMenu(tx, input.items.map((i) => i.itemId))
    const slot = await tx.get<SlotDoc>(`slots/${input.slotId}`)
    const date = dateKey(now)
    const counter = await tx.get<{ lastToken: number }>(`counters/${date}`)

    assertCafeOpen(settings, now)

    const problems = findItemProblems(qtyByItem(input.items), menu)
    if (problems.length) throw fail('ITEM_UNAVAILABLE', 'Some items are no longer available.', { items: problems })

    const built = buildLines(input.items, menu)
    assertLimits(settings, built.itemCount, built.units)
    await assertSlot(tx, { settings, now, slotId: input.slotId, slot, units: built.units })

    // --- writes ---
    for (const [itemId, qty] of qtyByItem(built.lines)) {
      const item = menu[itemId]
      if (item.stock !== null) tx.update(`menu/${itemId}`, { stock: item.stock - qty })
    }
    tx.set(`slots/${input.slotId}`, slotDoc(input.slotId, slot, (slot?.usedUnits ?? 0) + built.units))
    const token = (counter?.lastToken ?? 0) + 1
    tx.set(`counters/${date}`, { lastToken: token })

    const order: Order = {
      id: input.id, token, date,
      customer: input.customer,
      items: built.lines, itemCount: built.itemCount, units: built.units, total: built.total,
      note: input.note,
      slotId: input.slotId, slotTime: parseSlotId(input.slotId)!.time, slotStart: slotStartDate(input.slotId),
      status: 'new', cancelledBy: null, cancelReason: null,
      changes: null, changesSeen: true, editCount: 0,
      statusHistory: [{ status: 'new', at: now }],
      createdAt: now, updatedAt: now,
    }
    tx.set(`orders/${input.id}`, order)
    return { created: true, order }
  })
}

// ---------- customer edit ----------

export async function editOrder(db: Db, id: string, input: EditInput, now: Date): Promise<Order> {
  return db.runTransaction(async (tx) => {
    const order = await tx.get<Order>(`orders/${id}`)
    if (!order) throw fail('NOT_FOUND', 'Order not found.')
    if (order.status !== 'new') throw fail('ORDER_LOCKED', COPY.locked, { status: order.status })

    const settings = await getSettings(tx)
    const menu = await getMenu(tx, [...input.items.map((i) => i.itemId), ...order.items.map((i) => i.itemId)])
    const sameSlot = input.slotId === order.slotId
    const slots = await getSlots(tx, [order.slotId, input.slotId])

    const held = qtyByItem(order.items)
    const requested = qtyByItem(input.items)
    const problems = findItemProblems(requested, menu, held)
    if (problems.length) throw fail('ITEM_UNAVAILABLE', 'Some items are no longer available.', { items: problems })

    const built = buildLines(input.items, menu)
    assertLimits(settings, built.itemCount, built.units)

    // An unchanged slot may already be inside the lead window; keeping it is fine unless it grows or is closed.
    const grows = built.units > order.units
    if (!sameSlot || grows) {
      await assertSlot(tx, {
        settings, now, slotId: input.slotId, slot: slots[input.slotId], units: built.units,
        ownSlotId: order.slotId, ownUnits: order.units,
      })
    }

    const slotTime = parseSlotId(input.slotId)!.time
    const changes = diffOrder(order, { items: built.lines, slotTime, note: input.note })
    if (changes.length === 0) return order

    // --- writes ---
    const touched = new Set([...held.keys(), ...requested.keys()])
    for (const itemId of touched) {
      const item = menu[itemId]
      const delta = (requested.get(itemId) ?? 0) - (held.get(itemId) ?? 0)
      if (item && item.stock !== null && delta !== 0) tx.update(`menu/${itemId}`, { stock: item.stock - delta })
    }
    if (sameSlot) {
      tx.set(`slots/${order.slotId}`, slotDoc(order.slotId, slots[order.slotId], (slots[order.slotId]?.usedUnits ?? 0) + built.units - order.units))
    } else {
      tx.set(`slots/${order.slotId}`, slotDoc(order.slotId, slots[order.slotId], (slots[order.slotId]?.usedUnits ?? 0) - order.units))
      tx.set(`slots/${input.slotId}`, slotDoc(input.slotId, slots[input.slotId], (slots[input.slotId]?.usedUnits ?? 0) + built.units))
    }
    const patch = {
      items: built.lines, itemCount: built.itemCount, units: built.units, total: built.total,
      note: input.note, slotId: input.slotId, slotTime, slotStart: slotStartDate(input.slotId),
      changes, changesSeen: false, editCount: order.editCount + 1, updatedAt: now,
    }
    tx.update(`orders/${id}`, patch)
    return { ...order, ...patch }
  })
}

// ---------- cancel (customer or kitchen) ----------

async function cancelInTx(tx: Tx, id: string, by: 'customer' | 'kitchen', reason: string | null, now: Date) {
  const order = await tx.get<Order>(`orders/${id}`)
  if (!order) throw fail('NOT_FOUND', 'Order not found.')
  if (order.status === 'cancelled') return { noop: true, order }
  if (!canCancel(order.status, by)) {
    throw fail('ORDER_LOCKED', by === 'customer' ? COPY.locked : 'This order can no longer be cancelled.', { status: order.status })
  }
  const menu = await getMenu(tx, order.items.map((i) => i.itemId))
  const slot = await tx.get<SlotDoc>(`slots/${order.slotId}`)

  // --- writes: give stock and slot units back ---
  for (const [itemId, qty] of qtyByItem(order.items)) {
    const item = menu[itemId]
    if (item && item.stock !== null) tx.update(`menu/${itemId}`, { stock: item.stock + qty })
  }
  tx.set(`slots/${order.slotId}`, slotDoc(order.slotId, slot, (slot?.usedUnits ?? 0) - order.units))
  const patch = {
    status: 'cancelled' as Status, cancelledBy: by, cancelReason: reason,
    statusHistory: [...order.statusHistory, { status: 'cancelled', at: now }], updatedAt: now,
  }
  tx.update(`orders/${id}`, patch)
  return { noop: false, order: { ...order, ...patch } as Order }
}

export async function customerCancel(db: Db, id: string, now: Date): Promise<Order> {
  return db.runTransaction(async (tx) => {
    const r = await cancelInTx(tx, id, 'customer', null, now)
    return r.order
  })
}

// ---------- kitchen ----------

export async function kitchenAction(db: Db, a: KitchenAction, now: Date): Promise<{ noop: boolean; order?: Order }> {
  return db.runTransaction(async (tx) => {
    switch (a.type) {
      case 'advance':
      case 'revert': {
        const order = await tx.get<Order>(`orders/${a.orderId}`)
        if (!order) throw fail('NOT_FOUND', 'Order not found.')
        const t = (a.type === 'advance' ? advance : revert)(order.status, a.expectedStatus)
        if (t.kind === 'noop') return { noop: true, order }
        if (t.kind === 'invalid') throw fail('VALIDATION', `Can't ${a.type} from ${order.status}.`)
        const patch: Partial<Order> = {
          status: t.to, statusHistory: [...order.statusHistory, { status: t.to, at: now }], updatedAt: now,
        }
        if (a.type === 'advance' && order.status === 'new') patch.changesSeen = true // starting it counts as "seen"
        tx.update(`orders/${a.orderId}`, patch)
        return { noop: false, order: { ...order, ...patch } as Order }
      }
      case 'cancel':
        return cancelInTx(tx, a.orderId, 'kitchen', a.reason, now)
      case 'ackChanges': {
        const order = await tx.get<Order>(`orders/${a.orderId}`)
        if (!order) throw fail('NOT_FOUND', 'Order not found.')
        tx.update(`orders/${a.orderId}`, { changesSeen: true })
        return { noop: false, order: { ...order, changesSeen: true } }
      }
      case 'setItem': {
        const item = await tx.get<MenuItem>(`menu/${a.itemId}`)
        if (!item) throw fail('NOT_FOUND', 'Item not found.')
        const patch: Partial<MenuItem> = {}
        if (a.available !== undefined) patch.available = a.available
        if (a.stock !== undefined) patch.stock = a.stock
        if (Object.keys(patch).length) tx.update(`menu/${a.itemId}`, patch)
        return { noop: false }
      }
      case 'setSlot': {
        const slot = await tx.get<SlotDoc>(`slots/${a.slotId}`)
        const p = parseSlotId(a.slotId)
        if (!p) throw fail('VALIDATION', 'Invalid slot.')
        tx.set(`slots/${a.slotId}`, { ...slotDoc(a.slotId, slot, slot?.usedUnits ?? 0), closed: a.closed })
        return { noop: false }
      }
      case 'setSettings': {
        const patch: Partial<CafeSettings> = {}
        if (a.paused !== undefined) patch.paused = a.paused
        if (a.forceOpen !== undefined) patch.forceOpen = a.forceOpen
        if (a.banner !== undefined) patch.banner = a.banner ? a.banner : null // empty clears it
        if (Object.keys(patch).length) tx.update('settings/cafe', patch)
        return { noop: false }
      }
    }
  })
}

