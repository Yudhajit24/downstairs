import { describe, expect, it } from 'vitest'
import { eligible, parseQuery, rulePicks } from './assist.js'
import { MENU_SEED } from './menu-seed.js'
import type { MenuRow } from './suggest.js'

const menu: MenuRow[] = Object.entries(MENU_SEED).map(([id, m]) => ({ id, ...m }))
const now = new Date('2026-10-03T15:00:00+05:30')
const ids = (r: { picks: { itemId: string }[] }) => r.picks.map((p) => p.itemId)
const byId = (id: string) => menu.find((m) => m.id === id)!

describe('parseQuery', () => {
  it('reads budgets in several phrasings', () => {
    expect(parseQuery('something under ₹150').maxPrice).toBe(150)
    expect(parseQuery('below Rs. 100 please').maxPrice).toBe(100)
    expect(parseQuery('max 200').maxPrice).toBe(200)
    expect(parseQuery('₹90 or less').maxPrice).toBe(90)
    expect(parseQuery('two coffees').maxPrice).toBeUndefined()
  })
  it('reads diet and mood keywords', () => {
    expect(parseQuery('light and healthy')).toMatchObject({ light: true })
    expect(parseQuery('post workout, high protein')).toMatchObject({ protein: true })
    expect(parseQuery("I'm in a hurry")).toMatchObject({ quick: true })
    expect(parseQuery('something cold and sweet')).toMatchObject({ cold: true, sweet: true })
    expect(parseQuery('rainy evening')).toMatchObject({ hot: true })
  })
  it('veg means veg, but non-veg does not', () => {
    expect(parseQuery('vegetarian please').veg).toBe(true)
    expect(parseQuery('eggless').veg).toBe(true)
    expect(parseQuery('non-veg is fine').veg).toBeUndefined()
  })
})

describe('eligible (hard constraints)', () => {
  it('drops sold-out items, items over budget and non-veg when veg is asked', () => {
    const e = eligible(menu, { maxPrice: 100, veg: true }).map((m) => m.id)
    expect(e).not.toContain('cold-brew')        // sold out
    expect(e).not.toContain('cappuccino')       // ₹130 > 100
    expect(e).not.toContain('egg-bhurji-pav')   // non-veg
    expect(e).toContain('cutting-chai')
  })
  it('drops items whose stock hit zero', () => {
    const m2 = menu.map((m) => (m.id === 'butter-croissant' ? { ...m, stock: 0 } : m))
    expect(eligible(m2, {}).map((m) => m.id)).not.toContain('butter-croissant')
  })
})

describe('rulePicks', () => {
  it('protein request surfaces high-protein items first', () => {
    const r = rulePicks({ query: 'high protein for the gym', menu, now })
    expect(ids(r)[0]).toBe('grilled-chicken-bowl')
    expect(r.picks[0].reason).toMatch(/30g protein/)
    expect(ids(r).every((id) => (byId(id).nutrition?.protein ?? 0) >= 15)).toBe(true)
  })
  it('respects budget and veg together', () => {
    const r = rulePicks({ query: 'light, veg, under ₹100', menu, now })
    expect(r.picks.length).toBeGreaterThan(0)
    for (const id of ids(r)) { expect(byId(id).price).toBeLessThanOrEqual(100); expect(byId(id).veg).toBe(true) }
  })
  it('quick means grab-and-go first', () => {
    const r = rulePicks({ query: "quick, I'm late", menu, now })
    expect(byId(ids(r)[0]).prepUnits).toBe(0)
  })
  it('never suggests a sold-out item even when it matches best', () => {
    expect(ids(rulePicks({ query: 'cold and light', menu, now }))).not.toContain('cold-brew')
  })
  it('falls back to the right-now ranking when nothing is recognised, without a note', () => {
    const r = rulePicks({ query: 'surprise me', menu, now })
    expect(r.picks.length).toBeGreaterThan(0)
    expect(r.note).toBeUndefined()
    expect(r.picks[0].reason).toBe('good right now')
  })
  it('explains when a request cannot be met', () => {
    const r = rulePicks({ query: 'anything under ₹10', menu, now })
    expect(r.picks).toEqual([])
    expect(r.note).toMatch(/relaxing the budget/)
  })
  it('at most three picks, at most two per category', () => {
    const r = rulePicks({ query: 'cold sweet hot quick light protein', menu, now })
    expect(r.picks.length).toBeLessThanOrEqual(3)
    const per: Record<string, number> = {}
    for (const id of ids(r)) per[byId(id).category] = (per[byId(id).category] ?? 0) + 1
    expect(Math.max(...Object.values(per))).toBeLessThanOrEqual(2)
  })
})
