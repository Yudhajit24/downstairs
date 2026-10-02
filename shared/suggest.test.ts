import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './constants.js'
import { MENU_SEED } from './menu-seed.js'
import { kitchenLoad, rightNow, weatherBanner, weatherMood, type MenuRow } from './suggest.js'
import type { CafeSettings, SlotDoc } from './types.js'

const S = { ...DEFAULT_SETTINGS, forceOpen: false } as CafeSettings
const at = (hhmm: string) => new Date(`2026-10-03T${hhmm}:00+05:30`)
const menu: MenuRow[] = Object.entries(MENU_SEED).map(([id, m]) => ({ id, ...m }))
const ids = (r: ReturnType<typeof rightNow>) => r!.items.map((i) => i.id)

describe('weather', () => {
  it('classifies the mood', () => {
    expect(weatherMood({ tempC: 26, precipMm: 0, code: 3 })).toBe('mild')
    expect(weatherMood({ tempC: 26, precipMm: 1.2, code: 3 })).toBe('rainy')
    expect(weatherMood({ tempC: 26, precipMm: 0, code: 63 })).toBe('rainy')
    expect(weatherMood({ tempC: 34, precipMm: 0, code: 0 })).toBe('hot')
    expect(weatherMood({ tempC: 18, precipMm: 0, code: 1 })).toBe('cool')
  })
  it('only banners notable weather', () => {
    expect(weatherBanner({ tempC: 26, precipMm: 0, code: 1 })).toBeNull()
    expect(weatherBanner({ tempC: 26, precipMm: 3, code: 61 })).toMatch(/chai weather/)
    expect(weatherBanner({ tempC: 34.4, precipMm: 0, code: 0 })).toBe('34°C outside. Something cold?')
  })
})

describe('kitchenLoad', () => {
  const slot = (id: string, used: number): [string, SlotDoc] => [id, { date: '2026-10-03', time: '', usedUnits: used, closed: false }]
  it('is idle with no bookings', () => {
    expect(kitchenLoad({ settings: S, slots: {}, now: at('08:00') })).toMatchObject({ busy: false, known: true, load: 0 })
  })
  it('is busy when the next slots are mostly full', () => {
    const slots = Object.fromEntries([slot('2026-10-03_0815', 12), slot('2026-10-03_0830', 12), slot('2026-10-03_0845', 12)])
    const r = kitchenLoad({ settings: S, slots, now: at('08:00') })
    expect(r.busy).toBe(true)
    expect(r.load).toBeCloseTo(0.75)
  })
  it('is unknown when no slot is left today', () => {
    expect(kitchenLoad({ settings: S, slots: {}, now: at('21:50') }).known).toBe(false)
  })
})

describe('rightNow', () => {
  it('rain lifts hot drinks', () => {
    const r = rightNow({ now: at('15:00'), menu, weather: { tempC: 24, precipMm: 2, code: 63 } })!
    expect(r.headline).toBe('Rain outside. Something hot?')
    expect(r.items.filter((i) => i.tags.includes('hot')).length).toBeGreaterThanOrEqual(2)
  })
  it('heat lifts cold drinks (and never suggests the sold-out Cold Brew)', () => {
    const r = rightNow({ now: at('15:00'), menu, weather: { tempC: 35, precipMm: 0, code: 0 } })!
    expect(r.headline).toBe('Hot out there. Something cold?')
    expect(ids(r)).not.toContain('cold-brew')
    expect(r.items.some((i) => i.category === 'cold')).toBe(true)
  })
  it('when the kitchen is busy, grab-and-go bakes come first and slow dishes sink', () => {
    const r = rightNow({ now: at('08:30'), menu, weather: null, busy: true })!
    expect(r.headline).toBe("Kitchen's busy. Grab and go:")
    expect(r.reason).toMatch(/no wait/)
    expect(r.items[0].prepUnits).toBe(0)
    expect(r.items.every((i) => i.prepUnits < 2)).toBe(true)
  })
  it('mornings favour breakfast', () => {
    expect(rightNow({ now: at('08:00'), menu, weather: null })!.items.some((i) => i.category === 'breakfast')).toBe(true)
  })
  it('at most two per category, three picks, none out of stock', () => {
    const r = rightNow({ now: at('08:00'), menu: menu.map((m) => (m.id === 'butter-croissant' ? { ...m, stock: 0 } : m)), weather: null, busy: true })!
    expect(r.items).toHaveLength(3)
    const per = r.items.reduce<Record<string, number>>((n, i) => ({ ...n, [i.category]: (n[i.category] ?? 0) + 1 }), {})
    expect(Math.max(...Object.values(per))).toBeLessThanOrEqual(2)
    expect(ids(r)).not.toContain('butter-croissant')
  })
  it('returns null for an empty menu', () => {
    expect(rightNow({ now: at('08:00'), menu: [], weather: null })).toBeNull()
  })
})
