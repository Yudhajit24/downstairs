import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../../shared/constants.js'
import { MENU_SEED } from '../../shared/menu-seed.js'
import type { CreateOrderInput } from '../../shared/schemas.js'
import type { MenuItem, Order } from '../../shared/types.js'
import { createOrder, editOrder, kitchenAction } from './core.js'
import { ApiError } from './errors.js'
import { memoryDb } from './memory-db.js'

const NOW = new Date('2026-10-03T08:00:00+05:30')
const SLOT = '2026-10-03_0830'
const oid = (n: number) => String(n).padStart(21, 'o')
function world() {
  const seed: Record<string, object> = { 'settings/cafe': { ...DEFAULT_SETTINGS, forceOpen: false } }
  for (const [id, m] of Object.entries(MENU_SEED)) seed[`menu/${id}`] = m
  return memoryDb(seed)
}
const build = (options: Record<string, string[]>, qty = 1) => ({ itemId: 'build-sandwich', qty, options })
const body = (n: number, items: CreateOrderInput['items']): CreateOrderInput => ({ id: oid(n), customer: { name: 'Riya', flat: 'B-402' }, items, slotId: SLOT, note: null })
const err = async (p: Promise<unknown>) => ((await p.catch((e) => e)) as ApiError)
const good = { bread: ['multigrain'], filling: ['paneer-tikka'] }
const choiceOf = (db: ReturnType<typeof world>, g: string, c: string) =>
  db.read<MenuItem>('menu/build-sandwich')!.options!.find((x) => x.id === g)!.choices.find((x) => x.id === c)!

describe('create order with a build-your-own item', () => {
  it('prices it, counts prep units, and snapshots the picks for the kitchen', async () => {
    const db = world()
    const { order } = await createOrder(db, body(1, [build({ bread: ['focaccia'], filling: ['paneer-tikka', 'egg-bhurji'], extras: ['avocado'] }, 2)]), NOW)
    expect(order.total).toBe(2 * (80 + 15 + 30 + 20 + 40))
    expect(order.units).toBe(4)
    expect(order.items[0].custom).toEqual([
      { group: 'Bread', choices: ['Focaccia'] }, { group: 'Filling', choices: ['Paneer tikka', 'Egg bhurji'] }, { group: 'Extras', choices: ['Avocado'] },
    ])
    expect(order.items[0].nonVeg).toBe(true)
    expect(db.read(`slots/${SLOT}`)).toMatchObject({ usedUnits: 4 })
  })
  it('never trusts client prices or labels (only choice ids are read)', async () => {
    const { order } = await createOrder(world(), body(1, [{ ...build(good), price: 1, name: 'Free', custom: [] } as never]), NOW).catch((e) => { throw e })
    expect(order.items[0].price).toBe(110)
    expect(order.items[0].name).toBe('Build Your Sandwich')
  })
  it('rejects a missing required pick, too many picks and unknown choices as VALIDATION', async () => {
    const db = world()
    const e1 = await err(createOrder(db, body(1, [build({ filling: ['paneer-tikka'] })]), NOW))
    expect(e1).toMatchObject({ code: 'VALIDATION', message: 'Pick your bread.' })
    expect((await err(createOrder(db, body(2, [build({ ...good, filling: ['paneer-tikka', 'grilled-veg', 'corn-cheese'] })]), NOW))).code).toBe('VALIDATION')
    expect((await err(createOrder(db, body(3, [build({ bread: ['rye'], filling: ['grilled-veg'] })]), NOW))).code).toBe('VALIDATION')
    expect(db.read(`orders/${oid(1)}`)).toBeUndefined()
  })
  it('rejects a build with no picks at all, and a sandwich the same way as any invalid line', async () => {
    expect((await err(createOrder(world(), body(1, [{ itemId: 'build-sandwich', qty: 1 }]), NOW))).code).toBe('VALIDATION')
  })
  it('an ingredient switched off by the kitchen blocks the order as ITEM_UNAVAILABLE with the choice named', async () => {
    const db = world()
    await kitchenAction(db, { type: 'setChoice', itemId: 'build-sandwich', groupId: 'extras', choiceId: 'jalapenos', available: false }, NOW)
    expect(choiceOf(db, 'extras', 'jalapenos').available).toBe(false)
    const e = await err(createOrder(db, body(1, [build({ ...good, extras: ['jalapenos'] })]), NOW))
    expect(e.code).toBe('ITEM_UNAVAILABLE')
    expect(e.details).toMatchObject({ items: [{ itemId: 'build-sandwich', reason: 'option', groupId: 'extras', choiceId: 'jalapenos' }] })
    // switching it back on lets the same order through
    await kitchenAction(db, { type: 'setChoice', itemId: 'build-sandwich', groupId: 'extras', choiceId: 'jalapenos', available: true }, NOW)
    expect((await createOrder(db, body(1, [build({ ...good, extras: ['jalapenos'] })]), NOW)).created).toBe(true)
  })
  it('setChoice 404s on an unknown item, group or choice', async () => {
    const db = world()
    for (const a of [
      { itemId: 'ghost', groupId: 'bread', choiceId: 'white' }, { itemId: 'build-sandwich', groupId: 'nope', choiceId: 'white' },
      { itemId: 'build-sandwich', groupId: 'bread', choiceId: 'nope' }, { itemId: 'cutting-chai', groupId: 'bread', choiceId: 'white' },
    ]) expect((await err(kitchenAction(db, { type: 'setChoice', ...a, available: false }, NOW))).code).toBe('NOT_FOUND')
  })
})

describe('edits to a build-your-own order', () => {
  async function placed() {
    const db = world()
    await createOrder(db, body(1, [build(good)]), NOW)
    return db
  }
  const edit = (db: ReturnType<typeof world>, items: CreateOrderInput['items'], note: string | null = null) =>
    editOrder(db, oid(1), { action: 'edit', items, slotId: SLOT, note }, NOW)

  it('changing a filling is saved, repriced and shown to the kitchen as remove + add', async () => {
    const db = await placed()
    const o = await edit(db, [build({ bread: ['multigrain'], filling: ['corn-cheese'], extras: ['olives'] })])
    expect(o.total).toBe(80 + 20 + 15)
    expect(o.changes!.map((c) => c.label)).toEqual(['+1 Build Your Sandwich (Multigrain, Corn & cheese, Olives)', '−Build Your Sandwich (Multigrain, Paneer tikka)'])
  })
  it('an order may keep an ingredient that has since gone off (e.g. editing only the note)', async () => {
    const db = world()
    await createOrder(db, body(1, [build({ ...good, extras: ['jalapenos'] })]), NOW)
    await kitchenAction(db, { type: 'setChoice', itemId: 'build-sandwich', groupId: 'extras', choiceId: 'jalapenos', available: false }, NOW)
    const o = await edit(db, [build({ ...good, extras: ['jalapenos'] })], 'extra crispy')
    expect(o.note).toBe('extra crispy')
    // ...but cannot add it to a different build
    const e = await err(edit(db, [build({ bread: ['white'], filling: ['grilled-veg'], extras: ['jalapenos'] })]))
    expect(e.code).toBe('ITEM_UNAVAILABLE')
  })
  it('still validates picks on edit', async () => {
    const db = await placed()
    expect((await err(edit(db, [build({ filling: ['paneer-tikka'] })]))).code).toBe('VALIDATION')
  })
  it('prep units follow the build for slot capacity', async () => {
    const db = world()
    await createOrder(db, body(1, [build(good, 3)]), NOW) // 6 units
    const o = await edit(db, [build(good, 5)])
    expect(o.units).toBe(10)
    expect(db.read(`slots/${SLOT}`)).toMatchObject({ usedUnits: 10 })
    expect(db.read<Order>(`orders/${oid(1)}`)!.items[0].options).toEqual(good)
  })
})

