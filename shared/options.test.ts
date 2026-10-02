import { describe, expect, it } from 'vitest'
import { eligible, rulePicks } from './assist.js'
import { MENU_SEED } from './menu-seed.js'
import { buildLines, diffOrder, isQuickAddable, lineKey, optionKey, resolveOptions } from './pricing.js'
import { rightNow, type MenuRow } from './suggest.js'
import type { MenuItem } from './types.js'

const sandwich = MENU_SEED['build-sandwich']
const menu = { 'build-sandwich': sandwich, 'cutting-chai': MENU_SEED['cutting-chai'] } as Record<string, MenuItem>
const good = { bread: ['multigrain'], filling: ['paneer-tikka'] }
const withUnavailable = (groupId: string, choiceId: string): MenuItem => ({
  ...sandwich,
  options: sandwich.options!.map((g) => (g.id === groupId ? { ...g, choices: g.choices.map((c) => (c.id === choiceId ? { ...c, available: false } : c)) } : g)),
})

describe('resolveOptions', () => {
  it('prices the picks and normalises them', () => {
    const r = resolveOptions(sandwich, { bread: ['focaccia'], filling: ['corn-cheese', 'paneer-tikka'], extras: ['extra-cheese'] })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.priceDelta).toBe(15 + 20 + 30 + 20)
    expect(r.options.filling).toEqual(['paneer-tikka', 'corn-cheese']) // menu order, not pick order
    expect(r.custom[0]).toEqual({ group: 'Bread', choices: ['Focaccia'] })
    expect(r.nonVeg).toBe(false)
  })
  it('requires picks up to each group minimum', () => {
    expect(resolveOptions(sandwich, { filling: ['grilled-veg'] })).toMatchObject({ ok: false, issue: { kind: 'invalid', groupId: 'bread', message: 'Pick your bread.' } })
    expect(resolveOptions(sandwich, { bread: ['white'] })).toMatchObject({ ok: false, issue: { groupId: 'filling', message: 'Pick your filling.' } })
    expect(resolveOptions(sandwich, undefined)).toMatchObject({ ok: false })
  })
  it('enforces the maximum per group', () => {
    expect(resolveOptions(sandwich, { bread: ['white', 'multigrain'], filling: ['grilled-veg'] })).toMatchObject({ ok: false, issue: { groupId: 'bread', message: 'Pick at most 1 for bread.' } })
    expect(resolveOptions(sandwich, { ...good, filling: ['paneer-tikka', 'grilled-veg', 'corn-cheese'] })).toMatchObject({ ok: false, issue: { groupId: 'filling' } })
    expect(resolveOptions(sandwich, { ...good, extras: ['extra-cheese', 'jalapenos', 'olives', 'avocado'] })).toMatchObject({ ok: false, issue: { groupId: 'extras' } })
  })
  it('rejects unknown groups and choices', () => {
    expect(resolveOptions(sandwich, { ...good, toppings: ['x'] })).toMatchObject({ ok: false, issue: { kind: 'invalid', groupId: 'toppings' } })
    expect(resolveOptions(sandwich, { bread: ['rye'], filling: ['grilled-veg'] })).toMatchObject({ ok: false, issue: { kind: 'invalid', choiceId: 'rye' } })
  })
  it('flags an ingredient the kitchen switched off, unless allowed', () => {
    const item = withUnavailable('extras', 'jalapenos')
    const picks = { ...good, extras: ['jalapenos'] }
    expect(resolveOptions(item, picks)).toMatchObject({ ok: false, issue: { kind: 'unavailable', groupId: 'extras', choiceId: 'jalapenos', message: 'Jalapeños is sold out.' } })
    expect(resolveOptions(item, picks, true).ok).toBe(true)
  })
  it('an egg filling makes the line non-veg', () => {
    const r = resolveOptions(sandwich, { bread: ['white'], filling: ['egg-bhurji'] })
    expect(r.ok && r.nonVeg).toBe(true)
  })
  it('ignores picks on ordinary items', () => {
    expect(resolveOptions(menu['cutting-chai'], { bread: ['x'] })).toMatchObject({ ok: true, options: {}, priceDelta: 0 })
  })
})

describe('buildLines with options', () => {
  it('prices from the menu: base + picks, prep units include deltas', () => {
    const r = buildLines([{ itemId: 'build-sandwich', qty: 2, options: { bread: ['focaccia'], filling: ['paneer-tikka'], extras: ['extra-cheese'] } }], menu)
    expect(r.optionProblems).toEqual([])
    expect(r.lines[0].price).toBe(80 + 15 + 30 + 20)
    expect(r.total).toBe(2 * 145)
    expect(r.units).toBe(2 * 2)
    expect(r.lines[0].custom).toEqual([
      { group: 'Bread', choices: ['Focaccia'] }, { group: 'Filling', choices: ['Paneer tikka'] }, { group: 'Extras', choices: ['Extra cheese'] },
    ])
  })
  it('keeps different builds as separate lines and merges identical ones (pick order does not matter)', () => {
    const r = buildLines([
      { itemId: 'build-sandwich', qty: 1, options: { bread: ['white'], filling: ['corn-cheese', 'grilled-veg'] } },
      { itemId: 'build-sandwich', qty: 1, options: { filling: ['grilled-veg', 'corn-cheese'], bread: ['white'] } },
      { itemId: 'build-sandwich', qty: 1, options: { bread: ['multigrain'], filling: ['grilled-veg'] } },
    ], menu)
    expect(r.lines).toHaveLength(2)
    expect(r.lines.find((l) => l.options?.bread?.[0] === 'white')!.qty).toBe(2)
  })
  it('reports bad picks and leaves the line out', () => {
    const r = buildLines([{ itemId: 'build-sandwich', qty: 1, options: { bread: ['white'] } }, { itemId: 'cutting-chai', qty: 1 }], menu)
    expect(r.lines.map((l) => l.itemId)).toEqual(['cutting-chai'])
    expect(r.optionProblems).toHaveLength(1)
  })
  it('keep / allowUnavailable let an existing order hold an ingredient that went off', () => {
    const m = { ...menu, 'build-sandwich': withUnavailable('extras', 'jalapenos') }
    const input = [{ itemId: 'build-sandwich', qty: 1, options: { ...good, extras: ['jalapenos'] } }]
    expect(buildLines(input, m).optionProblems).toHaveLength(1)
    expect(buildLines(input, m, { allowUnavailable: true }).optionProblems).toHaveLength(0)
    const existing = buildLines(input, menu).lines
    expect(buildLines(input, m, { keep: new Set(existing.map(lineKey)) }).optionProblems).toHaveLength(0)
    // ...but not a *new* build with the same ingredient
    const fresh = [{ itemId: 'build-sandwich', qty: 1, options: { bread: ['white'], filling: ['grilled-veg'], extras: ['jalapenos'] } }]
    expect(buildLines(fresh, m, { keep: new Set(existing.map(lineKey)) }).optionProblems).toHaveLength(1)
  })
  it('optionKey is order independent and empty for no picks', () => {
    expect(optionKey({ b: ['y', 'x'], a: ['z'] })).toBe(optionKey({ a: ['z'], b: ['x', 'y'] }))
    expect(optionKey({})).toBe('')
    expect(optionKey(null)).toBe('')
  })
})

describe('diffOrder with options', () => {
  const line = (options: Record<string, string[]>, qty = 1) => buildLines([{ itemId: 'build-sandwich', qty, options }], menu).lines[0]
  const base = line({ bread: ['multigrain'], filling: ['paneer-tikka'] })
  it('labels builds by their picks', () => {
    const d = diffOrder({ items: [], slotTime: '08:15', note: null }, { items: [base], slotTime: '08:15', note: null })
    expect(d.map((c) => c.label)).toEqual(['+1 Build Your Sandwich (Multigrain, Paneer tikka)'])
  })
  it('swapping a filling reads as removed + added; qty changes keep the build', () => {
    const swapped = line({ bread: ['multigrain'], filling: ['grilled-veg'] })
    expect(diffOrder({ items: [base], slotTime: 'x', note: null }, { items: [swapped], slotTime: 'x', note: null }).map((c) => c.label))
      .toEqual(['+1 Build Your Sandwich (Multigrain, Grilled veg)', '−Build Your Sandwich (Multigrain, Paneer tikka)'])
    expect(diffOrder({ items: [base], slotTime: 'x', note: null }, { items: [line({ bread: ['multigrain'], filling: ['paneer-tikka'] }, 3)], slotTime: 'x', note: null }).map((c) => c.label))
      .toEqual(['Build Your Sandwich (Multigrain, Paneer tikka) 1→3'])
  })
})

describe('items that need choices are never one-tap suggested', () => {
  const rows: MenuRow[] = Object.entries(MENU_SEED).map(([id, m]) => ({ id, ...m }))
  it('isQuickAddable', () => {
    expect(isQuickAddable(sandwich)).toBe(false)
    expect(isQuickAddable(menu['cutting-chai'])).toBe(true)
  })
  it('rightNow, eligible and rulePicks leave them out', () => {
    const now = new Date('2026-10-03T08:30:00+05:30')
    expect(rightNow({ now, menu: rows, weather: null, busy: false })!.items.map((i) => i.id)).not.toContain('build-sandwich')
    expect(eligible(rows, {}).map((m) => m.id)).not.toContain('build-sandwich')
    expect(rulePicks({ query: 'quick breakfast', menu: rows, now }).picks.map((p) => p.itemId)).not.toContain('build-sandwich')
  })
})
