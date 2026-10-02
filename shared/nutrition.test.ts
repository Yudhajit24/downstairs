import { describe, expect, it } from 'vitest'
import { MENU_SEED } from './menu-seed.js'
import { fitPicks, isHealthy, nutritionLine } from './nutrition.js'

const menu = Object.entries(MENU_SEED).map(([id, m]) => ({ id, ...m }))
const ids = (l: { id: string }[]) => l.map((x) => x.id)

describe('seed nutrition', () => {
  it('every ordinary item has approximate nutrition (build-your-own items depend on the picks)', () => {
    for (const m of menu.filter((x) => !x.options)) {
      expect(m.nutrition, m.id).toBeDefined()
      expect(m.nutrition!.kcal).toBeGreaterThanOrEqual(0)
      expect(m.nutrition!.protein).toBeGreaterThanOrEqual(0)
    }
  })
  it('has the three new fit items on the menu', () => {
    expect(ids(menu)).toEqual(expect.arrayContaining(['egg-white-wrap', 'sprouts-bowl', 'protein-shake']))
  })
})

describe('fitPicks', () => {
  it('all: only healthy-tagged items, in menu order', () => {
    const r = fitPicks(menu, 'all')
    expect(r.every(isHealthy)).toBe(true)
    expect(ids(r)).toEqual(expect.arrayContaining(['cold-brew', 'kanda-poha', 'sprouts-bowl', 'egg-white-wrap', 'protein-shake', 'egg-bhurji-pav']))
    expect(ids(r)).not.toContain('butter-croissant')
  })
  it('protein: at least 15 g, highest first', () => {
    const r = fitPicks(menu, 'protein')
    expect(ids(r)).toEqual(['protein-shake', 'egg-white-wrap', 'egg-bhurji-pav'])
    expect(r.every((m) => m.nutrition!.protein >= 15)).toBe(true)
  })
  it('light: at most 250 kcal, lowest first', () => {
    const r = fitPicks(menu, 'light')
    expect(r.every((m) => m.nutrition!.kcal <= 250)).toBe(true)
    expect(ids(r)[0]).toBe('cold-brew')
    expect(ids(r)).toContain('sprouts-bowl')
    expect(ids(r)).not.toContain('protein-shake') // 320 kcal
  })
  it('formats the line, and nothing when unknown', () => {
    expect(nutritionLine({ nutrition: { kcal: 280, protein: 22 } })).toBe('~280 kcal · 22g protein')
    expect(nutritionLine({})).toBeNull()
  })
})
