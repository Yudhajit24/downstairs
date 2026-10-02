import type { VercelRequest, VercelResponse } from '@vercel/node'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../shared/constants.js'
import { MENU_SEED } from '../shared/menu-seed.js'
import { memoryDb } from './_lib/memory-db.js'

// Swap the Firebase admin layer for an in-memory store + a fake auth.
let db = memoryDb()
vi.mock('./_lib/admin.js', () => ({
  firestoreDb: () => db,
  adminAuth: () => ({
    createCustomToken: async (_uid: string, claims: object) => `custom:${JSON.stringify(claims)}`,
    verifyIdToken: async (t: string) => {
      if (t === 'staff-token') return { staff: true }
      if (t === 'plain-token') return {}
      throw new Error('bad token')
    },
  }),
}))

const { default: createH } = await import('./orders/index.js')
const { default: patchH } = await import('./orders/[id].js')
const { default: sessionH } = await import('./kitchen/session.js')
const { default: actionH } = await import('./kitchen/action.js')

function call(h: (q: VercelRequest, r: VercelResponse) => Promise<void>, opts: { method?: string; body?: unknown; query?: object; auth?: string }) {
  const out = { code: 0, body: undefined as any }
  const res = {
    setHeader() {}, status(c: number) { out.code = c; return res }, json(b: unknown) { out.body = b; return res },
  }
  const req = { method: opts.method ?? 'POST', body: opts.body, query: opts.query ?? {}, headers: opts.auth ? { authorization: opts.auth } : {} }
  return h(req as unknown as VercelRequest, res as unknown as VercelResponse).then(() => out)
}

// Pin the clock (Date only, so the PIN delay still runs) and pick a slot ahead of "now".
function laterSlotId() {
  const d = new Date(Date.now() + 90 * 60_000)
  const ist = new Date(d.getTime() + 5.5 * 3600_000)
  const p = (n: number) => String(n).padStart(2, '0')
  const mins = Math.ceil((ist.getUTCHours() * 60 + ist.getUTCMinutes()) / 15) * 15
  return `${ist.getUTCFullYear()}-${p(ist.getUTCMonth() + 1)}-${p(ist.getUTCDate())}_${p(Math.floor(mins / 60) % 24)}${p(mins % 60)}`
}

const ID = 'h'.repeat(21)
const order = (over: object = {}) => ({
  id: ID, customer: { name: 'Riya', flat: 'b-402' }, items: [{ itemId: 'cutting-chai', qty: 2, sugar: 'less' }],
  slotId: laterSlotId(), note: null, ...over,
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-03T08:00:00+05:30'))
  const seed: Record<string, object> = { 'settings/cafe': { ...DEFAULT_SETTINGS, forceOpen: true } }
  for (const [id, m] of Object.entries(MENU_SEED)) seed[`menu/${id}`] = m
  db = memoryDb(seed)
  process.env.KITCHEN_PIN = '4321'
})

describe('POST /api/orders', () => {
  it('creates (201), retries idempotently (200), and normalises the flat', async () => {
    const a = await call(createH, { body: order() })
    expect(a.code).toBe(201)
    expect(a.body.order).toMatchObject({ token: 1, total: 50, customer: { flat: 'B-402' } })
    const b = await call(createH, { body: order() })
    expect(b.code).toBe(200)
    expect(b.body.order.token).toBe(1)
  })
  it('400 VALIDATION with field errors', async () => {
    const r = await call(createH, { body: order({ customer: { name: 'R', flat: 'Tower' } }) })
    expect(r.code).toBe(400)
    expect(r.body).toMatchObject({ code: 'VALIDATION', details: { fields: { 'customer.name': expect.any(String), 'customer.flat': expect.any(String) } } })
  })
  it('409 ITEM_UNAVAILABLE for a sold-out item', async () => {
    const r = await call(createH, { body: order({ items: [{ itemId: 'cold-brew', qty: 1 }] }) })
    expect(r.code).toBe(409)
    expect(r.body.code).toBe('ITEM_UNAVAILABLE')
  })
  it('409 SLOT_FULL carries next slots', async () => {
    const slotId = laterSlotId()
    db = memoryDb({ ...Object.fromEntries(db.store as Map<string, object>), [`slots/${slotId}`]: { date: slotId.slice(0, 10), time: 'x', usedUnits: 16, closed: false } })
    const r = await call(createH, { body: order() })
    expect(r.code).toBe(409)
    expect(r.body.code).toBe('SLOT_FULL')
    expect(r.body.details.nextSlots.length).toBeGreaterThan(0)
  })
  it('405 on GET', async () => {
    expect((await call(createH, { method: 'GET' })).code).toBe(405)
  })
})

describe('PATCH /api/orders/:id', () => {
  it('edits, then cancels, then 409 locks an edit after kitchen start', async () => {
    await call(createH, { body: order() })
    const e = await call(patchH, { method: 'PATCH', query: { id: ID }, body: { action: 'edit', items: [{ itemId: 'cutting-chai', qty: 3, sugar: 'less' }], slotId: order().slotId, note: 'extra hot' } })
    expect(e.code).toBe(200)
    expect(e.body.order).toMatchObject({ editCount: 1, changesSeen: false, total: 75 })

    await call(actionH, { auth: 'Bearer staff-token', body: { type: 'advance', orderId: ID, expectedStatus: 'new' } })
    const locked = await call(patchH, { method: 'PATCH', query: { id: ID }, body: { action: 'cancel' } })
    expect(locked.code).toBe(409)
    expect(locked.body).toMatchObject({ code: 'ORDER_LOCKED', message: "The kitchen's already on it. For changes, talk to the counter." })
  })
  it('cancels while new', async () => {
    await call(createH, { body: order() })
    const r = await call(patchH, { method: 'PATCH', query: { id: ID }, body: { action: 'cancel' } })
    expect(r.body.order.status).toBe('cancelled')
  })
  it('404 for a bad or unknown id', async () => {
    expect((await call(patchH, { method: 'PATCH', query: { id: 'nope' }, body: { action: 'cancel' } })).code).toBe(404)
    expect((await call(patchH, { method: 'PATCH', query: { id: 'z'.repeat(21) }, body: { action: 'cancel' } })).code).toBe(404)
  })
})

describe('kitchen endpoints', () => {
  it('issues a staff token for the right PIN only', async () => {
    const ok = await call(sessionH, { body: { pin: '4321' } })
    expect(ok.code).toBe(200)
    expect(ok.body.token).toContain('"staff":true')
    const bad = await call(sessionH, { body: { pin: '0000' } })
    expect(bad.code).toBe(401)
  })
  it('rejects actions without a staff token', async () => {
    const act = { type: 'setSettings', paused: true }
    expect((await call(actionH, { body: act })).code).toBe(401)
    expect((await call(actionH, { auth: 'Bearer plain-token', body: act })).code).toBe(401)
    expect((await call(actionH, { auth: 'Bearer garbage', body: act })).code).toBe(401)
    expect((await call(actionH, { auth: 'Bearer staff-token', body: act })).code).toBe(200)
  })
  it('pausing blocks checkout with the paused message; existing orders keep flowing', async () => {
    await call(createH, { body: order() })
    await call(actionH, { auth: 'Bearer staff-token', body: { type: 'setSettings', paused: true } })
    const blocked = await call(createH, { body: order({ id: 'p'.repeat(21) }) })
    expect(blocked.body).toMatchObject({ code: 'PAUSED', message: "The kitchen's swamped right now. New orders back in a few minutes." })
    const adv = await call(actionH, { auth: 'Bearer staff-token', body: { type: 'advance', orderId: ID, expectedStatus: 'new' } })
    expect(adv.body.order.status).toBe('preparing')
  })
  it('two tablets: the second advance is a no-op', async () => {
    await call(createH, { body: order() })
    const a = { type: 'advance', orderId: ID, expectedStatus: 'new' }
    const r1 = await call(actionH, { auth: 'Bearer staff-token', body: a })
    const r2 = await call(actionH, { auth: 'Bearer staff-token', body: a })
    expect([r1.body.noop, r2.body.noop]).toEqual([false, true])
    expect(r2.body.order.status).toBe('preparing')
  })
  it('400 on a malformed action', async () => {
    expect((await call(actionH, { auth: 'Bearer staff-token', body: { type: 'explode' } })).code).toBe(400)
  })
})
