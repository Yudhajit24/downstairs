import { describe, expect, it } from 'vitest'
import { buildLines, diffOrder, findItemProblems, qtyByItem } from './pricing.js'
import { createOrderSchema, flatSchema } from './schemas.js'
import { MENU_SEED as M } from './menu-seed.js'

describe('buildLines', () => {
  it('prices from the menu and counts prep units', () => {
    const r = buildLines([{ itemId: 'cutting-chai', qty: 2, sugar: 'less' }, { itemId: 'kanda-poha', qty: 1 }], M)
    expect(r.total).toBe(2 * 25 + 60)
    expect(r.units).toBe(2 + 2)
    expect(r.itemCount).toBe(3)
  })
  it('merges identical item+sugar, keeps different sugar apart', () => {
    const r = buildLines([
      { itemId: 'cutting-chai', qty: 1, sugar: 'less' },
      { itemId: 'cutting-chai', qty: 2, sugar: 'less' },
      { itemId: 'cutting-chai', qty: 1, sugar: 'none' },
    ], M)
    expect(r.lines).toHaveLength(2)
    expect(r.lines[0].qty).toBe(3)
  })
  it('drops sugar on items without the option and defaults it on items with it', () => {
    const r = buildLines([{ itemId: 'kanda-poha', qty: 1, sugar: 'less' }, { itemId: 'filter-coffee', qty: 1 }], M)
    expect(r.lines[0].sugar).toBeNull()
    expect(r.lines[1].sugar).toBe('regular')
  })
  it('bakes cost no prep units', () => {
    expect(buildLines([{ itemId: 'choco-cookie', qty: 5 }], M).units).toBe(0)
  })
})

describe('findItemProblems', () => {
  it('flags unavailable, over-stock and missing items', () => {
    const p = findItemProblems(qtyByItem([{ itemId: 'cold-brew', qty: 1 }, { itemId: 'butter-croissant', qty: 4 }, { itemId: 'nope', qty: 1 }]), M)
    expect(p).toEqual([
      { itemId: 'cold-brew', reason: 'unavailable', remaining: 10 },
      { itemId: 'butter-croissant', reason: 'stock', remaining: 3 },
      { itemId: 'nope', reason: 'missing', remaining: null },
    ])
  })
  it('lets an edited order keep what it already holds', () => {
    const menu = { ...M, 'butter-croissant': { ...M['butter-croissant'], stock: 0 } }
    expect(findItemProblems(new Map([['butter-croissant', 2]]), menu, new Map([['butter-croissant', 2]]))).toEqual([])
    expect(findItemProblems(new Map([['butter-croissant', 3]]), menu, new Map([['butter-croissant', 2]]))).toHaveLength(1)
  })
})

describe('diffOrder', () => {
  const base = buildLines([{ itemId: 'cutting-chai', qty: 2, sugar: 'less' }, { itemId: 'kanda-poha', qty: 1 }], M).lines
  it('labels added, removed, qty, slot and note changes', () => {
    const after = buildLines([{ itemId: 'cutting-chai', qty: 3, sugar: 'less' }, { itemId: 'cappuccino', qty: 1 }], M).lines
    const d = diffOrder({ items: base, slotTime: '08:15', note: null }, { items: after, slotTime: '08:30', note: 'extra hot' })
    expect(d.map((c) => c.label)).toEqual([
      'Cutting Chai (less sugar) 2→3', '+1 Cappuccino', '−Kanda Poha', 'Pickup 08:15→08:30', 'Note: extra hot',
    ])
  })
  it('is empty when nothing changed', () => {
    expect(diffOrder({ items: base, slotTime: '08:15', note: null }, { items: base, slotTime: '08:15', note: null })).toEqual([])
  })
})

describe('schemas', () => {
  it('normalises the flat and requires a digit', () => {
    expect(flatSchema.parse(' b-402 ')).toBe('B-402')
    expect(flatSchema.safeParse('Tower').success).toBe(false)
    expect(flatSchema.safeParse('4').success).toBe(false)
  })
  it('validates an order body', () => {
    const ok = createOrderSchema.safeParse({
      id: 'a'.repeat(21), customer: { name: 'Riya', flat: 'b-402' },
      items: [{ itemId: 'cutting-chai', qty: 1 }], slotId: '2026-10-03_0815', note: '  ',
    })
    expect(ok.success && ok.data.note).toBeNull()
    expect(createOrderSchema.safeParse({ id: 'short', customer: { name: 'R', flat: 'x' }, items: [], slotId: 'x' }).success).toBe(false)
  })
})
