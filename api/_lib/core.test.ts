import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../../shared/constants.js'
import { MENU_SEED } from '../../shared/menu-seed.js'
import type { CreateOrderInput } from '../../shared/schemas.js'
import type { CafeSettings, MenuItem, Order, SlotDoc } from '../../shared/types.js'
import { createOrder, customerCancel, editOrder, kitchenAction, rateOrder } from './core.js'
import { ApiError } from './errors.js'
import { memoryDb } from './memory-db.js'

const NOW = new Date('2026-10-03T08:00:00+05:30')
const DATE = '2026-10-03'
const SLOT = '2026-10-03_0830'
const oid = (n: number) => String(n).padStart(21, 'x')

function world(settings: Partial<CafeSettings> = {}, extra: Record<string, object> = {}) {
  const seed: Record<string, object> = { 'settings/cafe': { ...DEFAULT_SETTINGS, forceOpen: false, ...settings }, ...extra }
  for (const [id, m] of Object.entries(MENU_SEED)) seed[`menu/${id}`] = m
  return memoryDb(seed)
}

const body = (n: number, items: CreateOrderInput['items'], slotId = SLOT): CreateOrderInput => ({
  id: oid(n), customer: { name: 'Riya', flat: 'B-402' }, items, slotId, note: null,
})
const chai = (qty: number, sugar: 'less' | 'regular' | 'none' = 'less') => ({ itemId: 'cutting-chai', qty, sugar })
const poha = (qty: number) => ({ itemId: 'kanda-poha', qty })

async function code(p: Promise<unknown>) {
  try { await p } catch (e) { if (e instanceof ApiError) return e; throw e }
  throw new Error('expected an ApiError')
}
const slotOf = (db: ReturnType<typeof world>, id = SLOT) => db.read<SlotDoc>(`slots/${id}`)
const stockOf = (db: ReturnType<typeof world>, id: string) => db.read<MenuItem>(`menu/${id}`)!.stock

describe('create order', () => {
  it('creates an order: token, prices from menu, stock and slot updated', async () => {
    const db = world()
    const { created, order } = await createOrder(db, body(1, [chai(2), poha(1)]), NOW)
    expect(created).toBe(true)
    expect(order).toMatchObject({ token: 1, total: 110, units: 4, itemCount: 3, status: 'new', date: DATE, slotTime: '08:30', changesSeen: true })
    expect(slotOf(db)!.usedUnits).toBe(4)
    expect(stockOf(db, 'kanda-poha')).toBe(14)
    expect(db.read<{ lastToken: number }>(`counters/${DATE}`)!.lastToken).toBe(1)
  })

  it('issues increasing daily tokens', async () => {
    const db = world()
    await createOrder(db, body(1, [chai(1)]), NOW)
    const r = await createOrder(db, body(2, [chai(1)]), NOW)
    expect(r.order.token).toBe(2)
  })

  it('is idempotent: retrying the same id returns the same order once', async () => {
    const db = world()
    const a = await createOrder(db, body(1, [poha(1)]), NOW)
    const b = await createOrder(db, body(1, [poha(1)]), NOW)
    expect(a.created).toBe(true)
    expect(b.created).toBe(false)
    expect(b.order.token).toBe(1)
    expect(stockOf(db, 'kanda-poha')).toBe(14) // decremented once
    expect(slotOf(db)!.usedUnits).toBe(2)
  })

  it('double tap (concurrent same id) still makes exactly one order', async () => {
    const db = world()
    const rs = await Promise.all([createOrder(db, body(1, [poha(1)]), NOW), createOrder(db, body(1, [poha(1)]), NOW)])
    expect(rs.filter((r) => r.created)).toHaveLength(1)
    expect(slotOf(db)!.usedUnits).toBe(2)
  })

  it('rejects an unavailable item and an over-stock quantity, with details', async () => {
    const db = world()
    const e1 = await code(createOrder(db, body(1, [{ itemId: 'cold-brew', qty: 1 }]), NOW))
    expect(e1.code).toBe('ITEM_UNAVAILABLE')
    expect(e1.details).toMatchObject({ items: [{ itemId: 'cold-brew', reason: 'unavailable' }] })
    const e2 = await code(createOrder(db, body(2, [{ itemId: 'butter-croissant', qty: 4 }]), NOW))
    expect(e2.details).toMatchObject({ items: [{ itemId: 'butter-croissant', reason: 'stock', remaining: 3 }] })
    expect(db.read(`orders/${oid(1)}`)).toBeUndefined()
    expect(stockOf(db, 'butter-croissant')).toBe(3)
  })

  it('rejects a full slot with the next 3 bookable slots, and writes nothing', async () => {
    const db = world({}, { [`slots/${SLOT}`]: { date: DATE, time: '08:30', usedUnits: 15, closed: false } })
    const e = await code(createOrder(db, body(1, [poha(1)]), NOW)) // needs 2, 1 left
    expect(e.code).toBe('SLOT_FULL')
    const d = e.details as { nextSlots: { slotId: string }[] }
    expect(d.nextSlots).toHaveLength(3)
    expect(d.nextSlots.map((s) => s.slotId)).not.toContain(SLOT)
    expect(slotOf(db)!.usedUnits).toBe(15)
    expect(stockOf(db, 'kanda-poha')).toBe(15)
  })

  it('a 1-unit cart still fits the slot a 2-unit cart cannot', async () => {
    const db = world({}, { [`slots/${SLOT}`]: { date: DATE, time: '08:30', usedUnits: 15, closed: false } })
    const r = await createOrder(db, body(1, [chai(1)]), NOW)
    expect(r.created).toBe(true)
    expect(slotOf(db)!.usedUnits).toBe(16)
  })

  it('rejects a slot inside the lead time and a closed slot', async () => {
    const db = world({}, { [`slots/${SLOT}`]: { date: DATE, time: '08:30', usedUnits: 0, closed: true } })
    expect((await code(createOrder(db, body(1, [chai(1)], '2026-10-03_0800'), NOW))).code).toBe('SLOT_PASSED')
    expect((await code(createOrder(db, body(2, [chai(1)], '2026-10-02_0900'), NOW))).code).toBe('SLOT_PASSED')
    expect((await code(createOrder(db, body(3, [chai(1)]), NOW))).code).toBe('SLOT_CLOSED')
  })

  it('rejects a time outside opening hours or on a future day as a validation error', async () => {
    const db = world()
    expect((await code(createOrder(db, body(1, [chai(1)], '2026-10-03_0630'), NOW))).code).toBe('VALIDATION')
    expect((await code(createOrder(db, body(2, [chai(1)], '2026-10-04_0900'), NOW))).code).toBe('VALIDATION')
  })

  it('accepts any minute: stores the exact time, counts capacity on its 15-minute window', async () => {
    const db = world()
    const { order } = await createOrder(db, body(1, [chai(1)], '2026-10-03_0837'), NOW)
    expect(order).toMatchObject({ slotId: '2026-10-03_0830', slotTime: '08:37' })
    expect(order.slotStart.getTime()).toBe(new Date('2026-10-03T08:37:00+05:30').getTime())
    expect(slotOf(db)!.usedUnits).toBe(1) // window 08:30
    await createOrder(db, body(2, [chai(1)], '2026-10-03_0844'), NOW)
    expect(slotOf(db)!.usedUnits).toBe(2) // same window, two different minutes
  })

  it('the lead time applies to the exact minute, not the window start', async () => {
    const db = world()
    expect((await code(createOrder(db, body(1, [chai(1)], '2026-10-03_0807'), NOW))).code).toBe('SLOT_PASSED') // 7 min away, lead is 10
    const ok = await createOrder(db, body(2, [chai(1)], '2026-10-03_0812'), NOW) // window started at 08:00 but 12 min away
    expect(ok.order.slotTime).toBe('08:12')
    expect(ok.order.slotId).toBe('2026-10-03_0800')
  })

  it('a full window refuses every minute inside it', async () => {
    const db = world({}, { [`slots/${SLOT}`]: { date: DATE, time: '08:30', usedUnits: 16, closed: false } })
    expect((await code(createOrder(db, body(1, [chai(1)], '2026-10-03_0841'), NOW))).code).toBe('SLOT_FULL')
  })

  it('editing only the minute inside the same window keeps capacity and records the change', async () => {
    const db = world()
    await createOrder(db, body(1, [chai(1)], '2026-10-03_0835'), NOW)
    const r = await editOrder(db, oid(1), { action: 'edit', items: [chai(1)], slotId: '2026-10-03_0842', note: null }, NOW)
    expect(r).toMatchObject({ slotTime: '08:42', slotId: '2026-10-03_0830' })
    expect(r.changes?.[0].label).toMatch(/08:35→08:42/)
    expect(slotOf(db)!.usedUnits).toBe(1) // not double counted
  })

  it('two customers racing for the last units: exactly one wins', async () => {
    const db = world({}, { [`slots/${SLOT}`]: { date: DATE, time: '08:30', usedUnits: 14, closed: false } })
    const rs = await Promise.allSettled([
      createOrder(db, body(1, [poha(1)]), NOW),
      createOrder(db, body(2, [poha(1)]), NOW),
    ])
    expect(rs.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    const lost = rs.find((r) => r.status === 'rejected') as PromiseRejectedResult
    expect((lost.reason as ApiError).code).toBe('SLOT_FULL')
    expect(slotOf(db)!.usedUnits).toBe(16)
    expect(stockOf(db, 'kanda-poha')).toBe(14)
  })

  it('rejects oversized orders with no partial write', async () => {
    const db = world()
    const e1 = await code(createOrder(db, body(1, [chai(13)]), NOW))
    expect(e1.code).toBe('ORDER_TOO_LARGE')
    const e2 = await code(createOrder(db, body(2, [{ itemId: 'choco-cookie', qty: 16 }]), NOW)) // 16 items, 0 units
    expect(e2.code).toBe('ORDER_TOO_LARGE')
    expect(db.read(`orders/${oid(1)}`)).toBeUndefined()
    expect(slotOf(db)).toBeUndefined()
  })

  it('blocks checkout when closed or paused, but not with forceOpen', async () => {
    const late = new Date('2026-10-03T23:00:00+05:30')
    const closed = await code(createOrder(world(), body(1, [chai(1)], '2026-10-03_2315'), late))
    expect(closed.code).toBe('CLOSED')
    expect(closed.message).toBe("We're closed. Back at 7:00 AM.")
    expect((await code(createOrder(world({ paused: true }), body(2, [chai(1)]), NOW))).code).toBe('PAUSED')
    const demo = await createOrder(world({ forceOpen: true }), body(3, [chai(1)], '2026-10-03_2315'), late)
    expect(demo.created).toBe(true)
  })
})

describe('customer edit', () => {
  it('saves changes, moves stock and slot units, and flags the ticket as updated', async () => {
    const db = world()
    await createOrder(db, body(1, [chai(2), poha(1)]), NOW)
    const o = await editOrder(db, oid(1), { action: 'edit', items: [chai(3), { itemId: 'butter-croissant', qty: 1 }], slotId: '2026-10-03_0845', note: 'extra hot' }, NOW)
    expect(o.changes!.map((c) => c.label)).toEqual([
      'Cutting Chai (less sugar) 2→3', '+1 Butter Croissant (contains egg)', '−Kanda Poha', 'Pickup 08:30→08:45', 'Note: extra hot',
    ])
    expect(o).toMatchObject({ changesSeen: false, editCount: 1, units: 3, total: 3 * 25 + 90 })
    expect(stockOf(db, 'kanda-poha')).toBe(15)       // restored
    expect(stockOf(db, 'butter-croissant')).toBe(2)  // taken
    expect(slotOf(db)!.usedUnits).toBe(0)
    expect(slotOf(db, '2026-10-03_0845')!.usedUnits).toBe(3)
    expect(db.read<Order>(`orders/${oid(1)}`)!.slotTime).toBe('08:45')
  })

  it('is a no-op when nothing changed', async () => {
    const db = world()
    await createOrder(db, body(1, [chai(1)]), NOW)
    const o = await editOrder(db, oid(1), { action: 'edit', items: [chai(1)], slotId: SLOT, note: null }, NOW)
    expect(o.editCount).toBe(0)
  })

  it('is locked once the kitchen has started it', async () => {
    const db = world()
    await createOrder(db, body(1, [chai(1)]), NOW)
    await kitchenAction(db, { type: 'advance', orderId: oid(1), expectedStatus: 'new' }, NOW)
    const e = await code(editOrder(db, oid(1), { action: 'edit', items: [chai(2)], slotId: SLOT, note: null }, NOW))
    expect(e).toMatchObject({ code: 'ORDER_LOCKED', details: { status: 'preparing' } })
    expect(db.read<Order>(`orders/${oid(1)}`)!.items[0].qty).toBe(1)
  })

  it("capacity check ignores the order's own units", async () => {
    const db = world({}, { [`slots/${SLOT}`]: { date: DATE, time: '08:30', usedUnits: 12, closed: false } })
    await createOrder(db, body(1, [chai(4)]), NOW) // slot now 16/16
    const same = await editOrder(db, oid(1), { action: 'edit', items: [chai(4, 'none')], slotId: SLOT, note: null }, NOW)
    expect(same.items[0].sugar).toBe('none')
    const e = await code(editOrder(db, oid(1), { action: 'edit', items: [chai(5)], slotId: SLOT, note: null }, NOW))
    expect(e.code).toBe('SLOT_FULL')
  })

  it('lets an order keep an item that has since sold out, but not add more', async () => {
    const db = world()
    await createOrder(db, body(1, [{ itemId: 'butter-croissant', qty: 3 }]), NOW) // stock now 0
    await kitchenAction(db, { type: 'setItem', itemId: 'butter-croissant', available: false }, NOW)
    const keep = await editOrder(db, oid(1), { action: 'edit', items: [{ itemId: 'butter-croissant', qty: 2 }], slotId: SLOT, note: null }, NOW)
    expect(keep.items[0].qty).toBe(2)
    expect(stockOf(db, 'butter-croissant')).toBe(1)
    const e = await code(editOrder(db, oid(1), { action: 'edit', items: [{ itemId: 'butter-croissant', qty: 3 }], slotId: SLOT, note: null }, NOW))
    expect(e.code).toBe('ITEM_UNAVAILABLE')
  })

  it('still works while new orders are paused', async () => {
    const db = world()
    await createOrder(db, body(1, [chai(1)]), NOW)
    await kitchenAction(db, { type: 'setSettings', paused: true }, NOW)
    const o = await editOrder(db, oid(1), { action: 'edit', items: [chai(2)], slotId: SLOT, note: null }, NOW)
    expect(o.items[0].qty).toBe(2)
  })

  it('404s on an unknown order', async () => {
    expect((await code(editOrder(world(), oid(9), { action: 'edit', items: [chai(1)], slotId: SLOT, note: null }, NOW))).code).toBe('NOT_FOUND')
  })
})

describe('customer cancel', () => {
  it('cancels while new, releasing stock and slot units', async () => {
    const db = world()
    await createOrder(db, body(1, [chai(2), poha(1)]), NOW)
    const o = await customerCancel(db, oid(1), NOW)
    expect(o).toMatchObject({ status: 'cancelled', cancelledBy: 'customer' })
    expect(stockOf(db, 'kanda-poha')).toBe(15)
    expect(slotOf(db)!.usedUnits).toBe(0)
  })

  it('is idempotent and releases only once', async () => {
    const db = world()
    await createOrder(db, body(1, [poha(1)]), NOW)
    await customerCancel(db, oid(1), NOW)
    await customerCancel(db, oid(1), NOW)
    expect(stockOf(db, 'kanda-poha')).toBe(15)
    expect(slotOf(db)!.usedUnits).toBe(0)
  })

  it('is locked once preparing', async () => {
    const db = world()
    await createOrder(db, body(1, [chai(1)]), NOW)
    await kitchenAction(db, { type: 'advance', orderId: oid(1), expectedStatus: 'new' }, NOW)
    expect((await code(customerCancel(db, oid(1), NOW))).code).toBe('ORDER_LOCKED')
  })
})

describe('kitchen actions', () => {
  it('two tablets advancing the same ticket move it one step only', async () => {
    const db = world()
    await createOrder(db, body(1, [chai(1)]), NOW)
    const a = { type: 'advance', orderId: oid(1), expectedStatus: 'new' } as const
    const [r1, r2] = await Promise.all([kitchenAction(db, a, NOW), kitchenAction(db, a, NOW)])
    expect([r1.noop, r2.noop].sort()).toEqual([false, true])
    expect(db.read<Order>(`orders/${oid(1)}`)!.status).toBe('preparing')
  })

  it('walks the flow, records history, and can move back', async () => {
    const db = world()
    await createOrder(db, body(1, [chai(1)]), NOW)
    await kitchenAction(db, { type: 'advance', orderId: oid(1), expectedStatus: 'new' }, NOW)
    await kitchenAction(db, { type: 'advance', orderId: oid(1), expectedStatus: 'preparing' }, NOW)
    await kitchenAction(db, { type: 'advance', orderId: oid(1), expectedStatus: 'ready' }, NOW)
    expect(db.read<Order>(`orders/${oid(1)}`)!.statusHistory.map((h) => h.status)).toEqual(['new', 'preparing', 'ready', 'picked_up'])
    await kitchenAction(db, { type: 'revert', orderId: oid(1), expectedStatus: 'picked_up' }, NOW)
    expect(db.read<Order>(`orders/${oid(1)}`)!.status).toBe('ready')
    const e = await code(kitchenAction(db, { type: 'advance', orderId: oid(9), expectedStatus: 'new' }, NOW))
    expect(e.code).toBe('NOT_FOUND')
  })

  it('starting an order marks edits as seen; ackChanges does too', async () => {
    const db = world()
    await createOrder(db, body(1, [chai(1)]), NOW)
    await editOrder(db, oid(1), { action: 'edit', items: [chai(2)], slotId: SLOT, note: null }, NOW)
    expect(db.read<Order>(`orders/${oid(1)}`)!.changesSeen).toBe(false)
    await kitchenAction(db, { type: 'ackChanges', orderId: oid(1) }, NOW)
    expect(db.read<Order>(`orders/${oid(1)}`)!.changesSeen).toBe(true)
  })

  it('cancels from preparing with a reason and releases stock and slot', async () => {
    const db = world()
    await createOrder(db, body(1, [poha(1)]), NOW)
    await kitchenAction(db, { type: 'advance', orderId: oid(1), expectedStatus: 'new' }, NOW)
    await kitchenAction(db, { type: 'cancel', orderId: oid(1), reason: 'item ran out' }, NOW)
    expect(db.read<Order>(`orders/${oid(1)}`)).toMatchObject({ status: 'cancelled', cancelledBy: 'kitchen', cancelReason: 'item ran out' })
    expect(stockOf(db, 'kanda-poha')).toBe(15)
    expect(slotOf(db)!.usedUnits).toBe(0)
    const again = await kitchenAction(db, { type: 'cancel', orderId: oid(1), reason: 'other' }, NOW)
    expect(again.noop).toBe(true)
  })

  it('stock, slot and settings controls', async () => {
    const db = world()
    await kitchenAction(db, { type: 'setItem', itemId: 'cold-brew', available: true, stock: 5 }, NOW)
    expect(db.read<MenuItem>('menu/cold-brew')).toMatchObject({ available: true, stock: 5 })
    await kitchenAction(db, { type: 'setItem', itemId: 'cutting-chai', stock: null }, NOW)
    await kitchenAction(db, { type: 'setSlot', slotId: SLOT, closed: true }, NOW)
    expect(slotOf(db)).toMatchObject({ closed: true, usedUnits: 0, time: '08:30' })
    expect((await code(kitchenAction(db, { type: 'setItem', itemId: 'ghost', available: true }, NOW))).code).toBe('NOT_FOUND')
  })

  it('closing a slot leaves existing orders alone but blocks new ones', async () => {
    const db = world()
    await createOrder(db, body(1, [chai(1)]), NOW)
    await kitchenAction(db, { type: 'setSlot', slotId: SLOT, closed: true }, NOW)
    expect(db.read<Order>(`orders/${oid(1)}`)!.status).toBe('new')
    expect(slotOf(db)!.usedUnits).toBe(1)
    expect((await code(createOrder(db, body(2, [chai(1)]), NOW))).code).toBe('SLOT_CLOSED')
  })
})

describe('rate order', () => {
  async function pickedUp(db: ReturnType<typeof world>, n: number) {
    await createOrder(db, body(n, [poha(1)]), NOW)
    for (const expectedStatus of ['new', 'preparing', 'ready'] as const) {
      await kitchenAction(db, { type: 'advance', orderId: oid(n), expectedStatus }, new Date(NOW.getTime() + 60_000))
    }
  }
  it('stores the rating once the order is picked up, and lets the customer change it', async () => {
    const db = world(); await pickedUp(db, 1)
    expect((await rateOrder(db, oid(1), 4, NOW)).rating).toBe(4)
    await rateOrder(db, oid(1), 5, NOW)
    expect(db.read<Order>(`orders/${oid(1)}`)!.rating).toBe(5)
  })
  it('refuses before pickup and for a missing order', async () => {
    const db = world()
    await createOrder(db, body(2, [poha(1)]), NOW)
    expect((await code(rateOrder(db, oid(2), 5, NOW))).code).toBe('VALIDATION')
    expect(db.read<Order>(`orders/${oid(2)}`)!.rating).toBeUndefined()
    expect((await code(rateOrder(db, oid(9), 5, NOW))).code).toBe('NOT_FOUND')
  })
})
