import type { VercelRequest, VercelResponse } from '@vercel/node'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../../shared/constants.js'
import { MENU_SEED } from '../../shared/menu-seed.js'
import { memoryDb } from './memory-db.js'

// Swap the Firebase admin layer for an in-memory store + a fake auth.
let db = memoryDb()
// assist reads Firestore through the admin SDK directly (collection queries), so give it a tiny fake of that API.
const fakeFs = () => ({
  collection: (name: string) => ({
    get: async () => ({ docs: [...(db.store as Map<string, object>).entries()].filter(([k]) => k.startsWith(`${name}/`)).map(([k, v]) => ({ id: k.slice(name.length + 1), data: () => v })) }),
    where: () => ({ get: async () => ({ docs: [] }) }),
  }),
  doc: (path: string) => ({ get: async () => ({ exists: (db.store as Map<string, object>).has(path), data: () => (db.store as Map<string, object>).get(path) }) }),
})
vi.mock('./admin.js', () => ({
  firestoreDb: () => db,
  adminFirestore: () => fakeFs(),
  adminAuth: () => ({
    createCustomToken: async (_uid: string, claims: object) => `custom:${JSON.stringify(claims)}`,
    verifyIdToken: async (t: string) => {
      if (t === 'staff-token') return { staff: true }
      if (t === 'plain-token') return {}
      throw new Error('bad token')
    },
  }),
}))

const { default: createH } = await import('../orders/index.js')
const { default: patchH } = await import('../orders/[id].js')
const { default: sessionH } = await import('../kitchen/session.js')
const { default: actionH } = await import('../kitchen/action.js')
const { default: templatesH } = await import('../templates/index.js')
const { default: weatherH } = await import('../weather/index.js')
const { default: assistH } = await import('../assist/index.js')
const { resetWeatherCache } = await import('./weather.js')

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

describe('POST /api/templates', () => {
  it('creates (201) then returns the same id for the same cart (200)', async () => {
    const body = { items: [{ itemId: 'cutting-chai', qty: 2, sugar: 'less' }] }
    const a = await call(templatesH, { body })
    expect(a.code).toBe(201)
    expect(a.body.id).toMatch(/^[A-Za-z0-9_-]{12}$/)
    const b = await call(templatesH, { body })
    expect(b.code).toBe(200)
    expect(b.body.id).toBe(a.body.id)
  })
  it('400 on an empty cart, 409 on an unknown item, 405 on GET', async () => {
    expect((await call(templatesH, { body: { items: [] } })).code).toBe(400)
    expect((await call(templatesH, { body: { items: [{ itemId: 'ghost', qty: 1 }] } })).code).toBe(409)
    expect((await call(templatesH, { method: 'GET' })).code).toBe(405)
  })
})

describe('GET /api/weather', () => {
  const ok = { current: { temperature_2m: 27.4, precipitation: 0.6, weather_code: 61 } }
  it('returns the current weather and caches it', async () => {
    resetWeatherCache()
    const f = vi.fn(async () => new Response(JSON.stringify(ok)))
    vi.stubGlobal('fetch', f)
    const a = await call(weatherH, { method: 'GET' })
    expect(a.code).toBe(200)
    expect(a.body.weather).toEqual({ tempC: 27.4, precipMm: 0.6, code: 61 })
    await call(weatherH, { method: 'GET' })
    expect(f).toHaveBeenCalledTimes(1) // second call served from the cache
    vi.unstubAllGlobals()
  })
  it('degrades to { weather: null } when the upstream fails', async () => {
    resetWeatherCache()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network') }))
    const r = await call(weatherH, { method: 'GET' })
    expect(r.code).toBe(200)
    expect(r.body.weather).toBeNull()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 503 })))
    expect((await call(weatherH, { method: 'GET' })).body.weather).toBeNull()
    vi.unstubAllGlobals()
  })
  it('kitchen can set and clear the banner', async () => {
    await call(actionH, { auth: 'Bearer staff-token', body: { type: 'setSettings', banner: '  Live music at 7  ' } })
    expect((db.read('settings/cafe') as any).banner).toBe('Live music at 7')
    await call(actionH, { auth: 'Bearer staff-token', body: { type: 'setSettings', banner: '' } })
    expect((db.read('settings/cafe') as any).banner).toBeNull()
    expect((await call(actionH, { auth: 'Bearer staff-token', body: { type: 'setSettings', banner: 'x'.repeat(81) } })).code).toBe(400)
  })
})

describe('POST /api/assist', () => {
  it('answers with the rule-based engine when no LLM is configured', async () => {
    delete process.env.LLM_BASE_URL
    const r = await call(assistH, { body: { query: 'high protein under ₹150' } })
    expect(r.code).toBe(200)
    expect(r.body.source).toBe('rules')
    expect(r.body.picks.length).toBeGreaterThan(0)
    expect(r.body.picks[0]).toHaveProperty('itemId')
    expect(r.body.picks[0]).toHaveProperty('reason')
  })
  it('400 on an empty or too long query, 405 on GET', async () => {
    expect((await call(assistH, { body: { query: '   ' } })).code).toBe(400)
    expect((await call(assistH, { body: { query: 'x'.repeat(141) } })).code).toBe(400)
    expect((await call(assistH, { method: 'GET' })).code).toBe(405)
  })
})

describe('build-your-own over HTTP', () => {
  const sandwich = (options: unknown) => ({ items: [{ itemId: 'build-sandwich', qty: 1, options }] })
  it('creates a priced order from picks', async () => {
    const r = await call(createH, { body: order(sandwich({ bread: ['focaccia'], filling: ['paneer-tikka'], extras: ['olives'] })) })
    expect(r.code).toBe(201)
    expect(r.body.order.total).toBe(80 + 15 + 30 + 15)
    expect(r.body.order.items[0].custom).toHaveLength(3)
  })
  it('400 when a required pick is missing, with a field message', async () => {
    const r = await call(createH, { body: order(sandwich({ filling: ['paneer-tikka'] })) })
    expect(r.code).toBe(400)
    expect(r.body).toMatchObject({ code: 'VALIDATION', message: 'Pick your bread.' })
  })
  it('400 on malformed options (wrong shape, too many groups, oversized lists)', async () => {
    expect((await call(createH, { body: order(sandwich({ bread: 'white' })) })).code).toBe(400)
    expect((await call(createH, { body: order(sandwich(Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`g${i}`, ['x']])))) })).code).toBe(400)
    expect((await call(createH, { body: order(sandwich({ bread: Array(13).fill('white') })) })).code).toBe(400)
  })
  it('409 ITEM_UNAVAILABLE (reason option) once the kitchen switches an ingredient off', async () => {
    await call(actionH, { auth: 'Bearer staff-token', body: { type: 'setChoice', itemId: 'build-sandwich', groupId: 'extras', choiceId: 'olives', available: false } })
    const r = await call(createH, { body: order(sandwich({ bread: ['white'], filling: ['grilled-veg'], extras: ['olives'] })) })
    expect(r.code).toBe(409)
    expect(r.body.details.items[0]).toMatchObject({ reason: 'option', groupId: 'extras', choiceId: 'olives' })
  })
  it('setChoice needs staff and a known option', async () => {
    const a = { type: 'setChoice', itemId: 'build-sandwich', groupId: 'extras', choiceId: 'olives', available: true }
    expect((await call(actionH, { body: a })).code).toBe(401)
    expect((await call(actionH, { auth: 'Bearer staff-token', body: { ...a, choiceId: 'nope' } })).code).toBe(404)
  })
})
