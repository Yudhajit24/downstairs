import { describe, expect, it } from 'vitest'
import { MENU_SEED } from './menu-seed.js'
import { briefFacts, ruleBrief, type BriefOrder } from './kitchenBrief.js'
import { orderFacts, ruleAnswer, type OrderLike } from './orderTalk.js'
import type { MenuRow } from './suggest.js'

const menu = Object.entries(MENU_SEED).map(([id, m]) => ({ id, ...m })) as MenuRow[]
const NOW = new Date('2026-10-03T12:00:00Z')
const min = (n: number) => NOW.getTime() - n * 60_000
const o = (token: number, status: BriefOrder['status'], slotTime: string, ageMin: number, items: [string, number][]): BriefOrder =>
  ({ token, status, slotTime, createdAtMs: min(ageMin), items: items.map(([name, qty]) => ({ name, qty })) })

describe('kitchen brief', () => {
  const orders = [
    o(1, 'new', '18:30', 12, [['Cappuccino', 2]]),
    o(2, 'new', '18:15', 3, [['Cappuccino', 1], ['Veg Grilled Sandwich', 1]]),
    o(3, 'preparing', '18:15', 8, [['Kanda Poha', 1]]),
    o(4, 'ready', '18:00', 20, [['Cold Coffee', 1]]),
    o(5, 'picked_up', '17:45', 40, [['Cold Coffee', 9]]),
    o(6, 'cancelled', '17:45', 40, [['Cold Coffee', 9]]),
  ]
  const f = briefFacts({ orders, menu, now: NOW })

  it('counts only live orders and aggregates what is left to make', () => {
    expect(f.counts).toEqual({ new: 2, preparing: 1, ready: 1 })
    expect(f.toMake[0]).toEqual({ name: 'Cappuccino', qty: 3 })
    expect(f.toMake.map((t) => t.name)).not.toContain('Cold Coffee')
    expect(f.slots.map((s) => s.time)).toEqual(['18:00', '18:15', '18:30'])
    expect(f.oldestNew).toEqual({ token: 1, minutes: 12 })
  })
  it('lists items that are available but nearly out', () => {
    expect(f.lowStock.map((l) => l.name)).toEqual(['Butter Croissant (contains egg)'])
  })
  it('renders a short, factual brief', () => {
    const t = ruleBrief(f)
    expect(t).toMatch(/2 new, 1 preparing, 1 ready/)
    expect(t).toMatch(/Cappuccino ×3/)
    expect(t).toMatch(/Order #1 has been waiting 12 min/)
    expect(t).toMatch(/Butter Croissant.*3 left/)
  })
  it('says so when the kitchen is quiet', () => {
    expect(ruleBrief(briefFacts({ orders: [], menu: [], now: NOW }))).toMatch(/No open orders/)
  })
})

describe('order talk', () => {
  const base: OrderLike = { token: 7, status: 'new', items: [{ name: 'Cappuccino', qty: 2 }], total: 260, slotTime: '18:30', createdAtMs: min(1), cancelReason: null }
  const others = [
    { status: 'new' as const, slotTime: '18:15', createdAtMs: min(5) },
    { status: 'preparing' as const, slotTime: '18:30', createdAtMs: min(4) },
    { status: 'new' as const, slotTime: '18:30', createdAtMs: min(0) }, // placed after ours
    { status: 'ready' as const, slotTime: '18:00', createdAtMs: min(9) }, // already done
  ]
  const facts = (o: Partial<OrderLike> = {}) => orderFacts({ ...base, ...o }, others, NOW.getTime() + 25 * 60_000, NOW)

  it('counts only unfinished orders ahead of it', () => {
    expect(facts().ordersAhead).toBe(2)
    expect(facts().minutesToSlot).toBe(25)
    expect(facts({ status: 'ready' }).ordersAhead).toBe(0)
  })
  it('answers wait, content, change and place questions from the facts', () => {
    expect(ruleAnswer('how long will it take?', facts())).toMatch(/2 orders are ahead/)
    expect(ruleAnswer("what's in my order and how much?", facts())).toMatch(/2 × Cappuccino.*₹260/)
    expect(ruleAnswer('can I cancel?', facts())).toMatch(/Edit or Cancel/)
    expect(ruleAnswer('can I cancel?', facts({ status: 'preparing' }))).toMatch(/can't be changed/)
    expect(ruleAnswer('where do I collect it', facts())).toMatch(/Clubhouse counter/)
    expect(ruleAnswer('is it ready?', facts({ status: 'ready' }))).toMatch(/ready!/)
    expect(ruleAnswer('is it ready?', facts({ status: 'cancelled', cancelReason: 'Out of milk' }))).toMatch(/Out of milk/)
  })
  it('falls back to the status plus what can be asked', () => {
    expect(ruleAnswer('banana', facts())).toMatch(/waiting for the kitchen.*Ask me about/)
  })
})
