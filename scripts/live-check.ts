/** Runs the core scenarios against the REAL Firestore, then cleans up. Run: npm run live-check */
import { firestoreDb, adminFirestore } from '../api/_lib/admin.js'
import { createOrder, customerCancel, editOrder, kitchenAction } from '../api/_lib/core.js'
import { ApiError } from '../api/_lib/errors.js'
import { DEFAULT_SETTINGS } from '../shared/constants.js'
import { MENU_SEED } from '../shared/menu-seed.js'
import { dateKey, nextBookableSlots } from '../shared/slots.js'

const db = firestoreDb()
const fs = adminFirestore()
const now = new Date()
const slots = nextBookableSlots({ settings: DEFAULT_SETTINGS as never, slots: {}, now, units: 1, limit: 12 })
const [A, B] = [slots[8].slotId, slots[9].slotId] // an hour or two out; slots that are empty
const id = (c: string) => `live${c}`.padEnd(21, 'x')
const ids = ['1', '2', '3', '4', '5', '6'].map(id)
const body = (i: number, items: any[], slotId = A) => ({ id: ids[i], customer: { name: 'Live Check', flat: 'T-1' }, items, slotId, note: null })
let pass = 0, fail = 0
const ok = (name: string, cond: boolean, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`) }
const err = async (p: Promise<unknown>) => { try { await p } catch (e) { return e as ApiError } return undefined }
const stock = async (item: string) => (await fs.doc(`menu/${item}`).get()).data()!.stock
const used = async (s: string) => (await fs.doc(`slots/${s}`).get()).data()?.usedUnits

async function cleanup() {
  const b = fs.batch()
  for (const i of ids) b.delete(fs.doc(`orders/${i}`))
  for (const s of [A, B]) b.delete(fs.doc(`slots/${s}`))
  b.delete(fs.doc(`counters/${dateKey(now)}`))
  for (const [k, v] of Object.entries(MENU_SEED)) b.set(fs.doc(`menu/${k}`), v)
  b.set(fs.doc('settings/cafe'), DEFAULT_SETTINGS)
  await b.commit()
}

await cleanup()
try {
  const poha = { itemId: 'kanda-poha', qty: 1 }
  const r1 = await createOrder(db, body(0, [poha, { itemId: 'cutting-chai', qty: 2, sugar: 'less' }]), now)
  ok('create → token 1, total 110', r1.created && r1.order.token === 1 && r1.order.total === 110)
  ok('stock decremented (poha 15→14), slot used 4', (await stock('kanda-poha')) === 14 && (await used(A)) === 4)
  ok('Timestamps round-trip as Dates', r1.order.slotStart instanceof Date)

  const again = await createOrder(db, body(0, [poha]), now)
  ok('idempotent retry returns same order', !again.created && again.order.token === 1 && again.order.createdAt instanceof Date)
  ok('retry did not double-decrement', (await stock('kanda-poha')) === 14)

  const e1 = await err(createOrder(db, body(1, [{ itemId: 'cold-brew', qty: 1 }]), now))
  ok('sold-out item → ITEM_UNAVAILABLE', e1?.code === 'ITEM_UNAVAILABLE')
  const e2 = await err(createOrder(db, body(1, [{ itemId: 'butter-croissant', qty: 4 }]), now))
  ok('over-stock → ITEM_UNAVAILABLE (remaining 3)', e2?.code === 'ITEM_UNAVAILABLE' && JSON.stringify(e2.details).includes('"remaining":3'))

  await fs.doc(`slots/${B}`).set({ date: dateKey(now), time: B.slice(-4), usedUnits: 15, closed: false })
  const e3 = await err(createOrder(db, body(1, [poha], B), now))
  ok('full slot → SLOT_FULL with 3 suggestions', e3?.code === 'SLOT_FULL' && (e3.details as any).nextSlots.length === 3)

  await fs.doc(`slots/${B}`).set({ date: dateKey(now), time: B.slice(-4), usedUnits: 14, closed: false })
  const race = await Promise.allSettled([createOrder(db, body(2, [poha], B), now), createOrder(db, body(3, [poha], B), now)])
  ok('race for last 2 units: exactly one wins', race.filter((r) => r.status === 'fulfilled').length === 1, `used=${await used(B)}`)

  const ed = await editOrder(db, ids[0], { action: 'edit', items: [{ itemId: 'cutting-chai', qty: 3, sugar: 'less' }], slotId: A, note: 'extra hot' }, now)
  ok('edit: 3 changes recorded, flagged unseen', ed.changes!.length === 3 && ed.changesSeen === false)

  await kitchenAction(db, { type: 'advance', orderId: ids[0], expectedStatus: 'new' }, now)
  const locked = await err(editOrder(db, ids[0], { action: 'edit', items: [{ itemId: 'cutting-chai', qty: 1 }], slotId: A, note: null }, now))
  ok('edit after start → ORDER_LOCKED', locked?.code === 'ORDER_LOCKED')
  const dbl = await kitchenAction(db, { type: 'advance', orderId: ids[0], expectedStatus: 'new' }, now)
  ok('second advance with stale expectedStatus is a no-op', dbl.noop === true)

  const before = await used(A)
  const c = await createOrder(db, body(4, [{ itemId: 'cutting-chai', qty: 1 }]), now)
  const cancelled = await customerCancel(db, c.order.id, now)
  ok('customer cancel releases slot units', cancelled.status === 'cancelled' && (await used(A)) === before)
} finally {
  await cleanup()
  console.log(`\nCleaned up and re-seeded. ${pass} passed, ${fail} failed.`)
  process.exit(fail ? 1 : 0)
}
