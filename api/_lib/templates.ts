import { createHash } from 'node:crypto'
import { COPY } from '../../shared/constants.js'
import { buildLines, findItemProblems, lineKey, qtyByItem } from '../../shared/pricing.js'
import type { CreateTemplateInput } from '../../shared/schemas.js'
import type { CafeSettings, MenuItem, TemplateDoc } from '../../shared/types.js'
import type { Db } from './db.js'
import { fail } from './errors.js'

/**
 * Create (or return) a shareable template for a cart.
 *
 * The id is a hash of the normalised lines (sugar defaulted/dropped per the menu, duplicates merged, sorted),
 * so sharing the same cart twice yields the same link. That also bounds spam from this unauthenticated
 * endpoint to the number of distinct carts rather than the number of requests.
 * Availability is deliberately NOT checked: an item that is sold out now may be back when the link is opened.
 */
export async function createTemplate(db: Db, input: CreateTemplateInput, now: Date): Promise<{ created: boolean; template: TemplateDoc }> {
  return db.runTransaction(async (tx) => {
    const settings = await tx.get<CafeSettings>('settings/cafe')
    if (!settings) throw fail('INTERNAL', 'Café settings missing. Run the seed script.')

    const ids = [...new Set(input.items.map((i) => i.itemId))]
    const docs = await Promise.all(ids.map((id) => tx.get<MenuItem>(`menu/${id}`)))
    const menu: Record<string, MenuItem> = {}
    ids.forEach((id, i) => { if (docs[i]) menu[id] = docs[i]! })

    // Unknown ids are rejected; sold-out ones are fine (see above).
    const missing = findItemProblems(qtyByItem(input.items), menu).filter((p) => p.reason === 'missing')
    if (missing.length) throw fail('ITEM_UNAVAILABLE', 'Some items are not on the menu.', { items: missing })

    // Picks are validated (unknown group/choice, min/max) but ingredient availability is not: it may change before the link is opened.
    const built = buildLines(input.items, menu, { allowUnavailable: true })
    const bad = built.optionProblems.find((p) => p.issue.kind === 'invalid')
    if (bad) throw fail('VALIDATION', bad.issue.message, { fields: { items: bad.issue.message } })
    if (built.itemCount > settings.maxItemsPerOrder) {
      throw fail('ORDER_TOO_LARGE', COPY.tooLarge, { maxItems: settings.maxItemsPerOrder, itemCount: built.itemCount })
    }

    const items = built.lines
      .map((l) => ({ itemId: l.itemId, sugar: l.sugar, qty: l.qty, ...(l.options && { options: l.options }) }))
      .sort((a, b) => (lineKey(a) < lineKey(b) ? -1 : 1))
    const id = createHash('sha256').update(JSON.stringify(items)).digest('base64url').slice(0, 12)

    const existing = await tx.get<TemplateDoc>(`templates/${id}`)
    if (existing) return { created: false, template: existing }

    const template: TemplateDoc = { id, items, itemCount: built.itemCount, createdAt: now }
    tx.set(`templates/${id}`, template)
    return { created: true, template }
  })
}
