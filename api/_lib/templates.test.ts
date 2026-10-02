import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../../shared/constants.js'
import { MENU_SEED } from '../../shared/menu-seed.js'
import type { TemplateDoc } from '../../shared/types.js'
import { ApiError } from './errors.js'
import { memoryDb } from './memory-db.js'
import { createTemplate } from './templates.js'

const NOW = new Date('2026-10-03T08:00:00+05:30')
function world() {
  const seed: Record<string, object> = { 'settings/cafe': { ...DEFAULT_SETTINGS } }
  for (const [id, m] of Object.entries(MENU_SEED)) seed[`menu/${id}`] = m
  return memoryDb(seed)
}
const chai = (qty: number, sugar: 'less' | 'regular' | 'none' = 'less') => ({ itemId: 'cutting-chai', qty, sugar })
const poha = (qty: number) => ({ itemId: 'kanda-poha', qty })

describe('createTemplate', () => {
  it('stores the normalised lines and returns a short id', async () => {
    const db = world()
    const { created, template } = await createTemplate(db, { items: [chai(2), poha(1)] }, NOW)
    expect(created).toBe(true)
    expect(template.id).toMatch(/^[A-Za-z0-9_-]{12}$/)
    expect(template.itemCount).toBe(3)
    expect(db.read<TemplateDoc>(`templates/${template.id}`)!.items).toHaveLength(2)
  })

  it('gives the same cart the same link, regardless of line order or duplicate lines', async () => {
    const db = world()
    const a = await createTemplate(db, { items: [chai(2), poha(1)] }, NOW)
    const b = await createTemplate(db, { items: [poha(1), chai(1), chai(1)] }, NOW)
    expect(b.created).toBe(false)
    expect(b.template.id).toBe(a.template.id)
  })

  it('treats sugar on a no-sugar item as nothing, and a missing sugar as regular', async () => {
    const db = world()
    const a = await createTemplate(db, { items: [{ itemId: 'kanda-poha', qty: 1, sugar: 'less' }, { itemId: 'filter-coffee', qty: 1 }] }, NOW)
    const b = await createTemplate(db, { items: [poha(1), { itemId: 'filter-coffee', qty: 1, sugar: 'regular' }] }, NOW)
    expect(b.template.id).toBe(a.template.id)
  })

  it('different carts get different links', async () => {
    const db = world()
    const a = await createTemplate(db, { items: [chai(1)] }, NOW)
    const b = await createTemplate(db, { items: [chai(2)] }, NOW)
    expect(a.template.id).not.toBe(b.template.id)
  })

  it('accepts sold-out items (they may be back when the link is opened)', async () => {
    const { created } = await createTemplate(world(), { items: [{ itemId: 'cold-brew', qty: 1 }] }, NOW)
    expect(created).toBe(true)
  })

  it('rejects items that are not on the menu, and oversized carts', async () => {
    const e1 = (await createTemplate(world(), { items: [{ itemId: 'ghost', qty: 1 }] }, NOW).catch((e) => e)) as ApiError
    expect(e1.code).toBe('ITEM_UNAVAILABLE')
    const e2 = (await createTemplate(world(), { items: [{ itemId: 'choco-cookie', qty: 16 }] }, NOW).catch((e) => e)) as ApiError
    expect(e2.code).toBe('ORDER_TOO_LARGE')
  })
})
