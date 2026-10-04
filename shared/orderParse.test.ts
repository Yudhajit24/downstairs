import { describe, expect, it } from 'vitest'
import { MENU_SEED } from './menu-seed.js'
import { parseOrderText, sanitizeLines } from './orderParse.js'
import type { MenuRow } from './suggest.js'

const menu = Object.entries(MENU_SEED).map(([id, m]) => ({ id, ...m })) as MenuRow[]
const ids = (t: string) => parseOrderText(t, menu)

describe('parseOrderText', () => {
  it('reads quantities, plurals and separators', () => {
    const r = ids('2 cappuccinos, a veg sandwich and three cookies')
    expect(r.lines).toEqual([
      { itemId: 'cappuccino', qty: 2, sugar: 'regular' },
      { itemId: 'veg-sandwich', qty: 1, sugar: null },
      { itemId: 'choco-cookie', qty: 3, sugar: null },
    ])
    expect(r.unmatched).toEqual([])
  })
  it('understands a WhatsApp-style message with filler words', () => {
    const r = ids('Hi! Can I get 2 cutting chai & 1 poha please. Thanks')
    expect(r.lines.map((l) => [l.itemId, l.qty])).toEqual([['cutting-chai', 2], ['kanda-poha', 1]])
  })
  it('reads sugar preferences, including a trailing "no sugar" piece', () => {
    expect(ids('cappuccino without sugar').lines[0].sugar).toBe('none')
    expect(ids('2 filter coffee, less sugar').lines[0]).toEqual({ itemId: 'filter-coffee', qty: 2, sugar: 'less' })
    expect(ids('cold coffee, no sugar').lines[0].sugar).toBe('none')
    expect(ids('1 poha no sugar').lines[0].sugar).toBeNull() // no sugar option on poha
  })
  it('longest phrase wins: cold coffee is not filter coffee', () => {
    expect(ids('cold coffee').lines[0].itemId).toBe('cold-coffee')
    expect(ids('veg grilled sandwich').lines[0].itemId).toBe('veg-sandwich')
  })
  it('merges duplicates and ignores a pickup time', () => {
    const r = ids('cappuccino, 2 cappuccino at 8:30')
    expect(r.lines).toEqual([{ itemId: 'cappuccino', qty: 3, sugar: 'regular' }])
  })
  it('reports what it cannot place instead of guessing', () => {
    const r = ids('2 pizzas and a cappuccino')
    expect(r.lines.map((l) => l.itemId)).toEqual(['cappuccino'])
    expect(r.unmatched).toEqual(['2 pizzas'])
  })
  it('flags build-your-own and sold-out items separately', () => {
    const r = ids('build your sandwich, cold brew')
    expect(r.lines).toEqual([])
    expect(r.needsChoices).toEqual(['Build Your Sandwich'])
    expect(r.soldOut).toEqual(['Cold Brew'])
  })
  it('caps absurd quantities', () => {
    expect(ids('99 cappuccinos').lines[0].qty).toBe(20)
  })
})

describe('chicken items', () => {
  it('are recognised by their everyday names, and the longest phrase wins over plain "sandwich"', () => {
    const r = ids('a chicken sandwich, 2 keema pav and a chicken puff, veg sandwich')
    expect(r.lines.map((l) => [l.itemId, l.qty])).toEqual([['chicken-sandwich', 1], ['chicken-keema-pav', 2], ['chicken-puff', 1], ['veg-sandwich', 1]])
  })
})

describe('sanitizeLines', () => {
  it('drops unknown, sold-out and choice-only items, clamps qty, fixes sugar', () => {
    const { lines, dropped } = sanitizeLines([
      { itemId: 'cappuccino', qty: 500, sugar: 'none' },
      { itemId: 'made-up', qty: 1 },
      { itemId: 'cold-brew', qty: 1 },
      { itemId: 'build-sandwich', qty: 1 },
      { itemId: 'kanda-poha', qty: 2, sugar: 'none' },
      { itemId: 'cappuccino', qty: -3, sugar: 'none' },
    ], menu)
    expect(lines).toEqual([{ itemId: 'cappuccino', qty: 20, sugar: 'none' }, { itemId: 'kanda-poha', qty: 2, sugar: null }])
    expect(dropped).toEqual(['made-up', 'cold-brew', 'build-sandwich'])
  })
})
