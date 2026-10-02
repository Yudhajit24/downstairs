import { resolveOptions } from '../../shared/pricing'
import type { Selections } from '../../shared/types'
import type { MenuEntry } from '../lib/CafeData'
import { isSoldOut } from './CartContext'

export interface LineCheck {
  usable: boolean
  /** Why it can't be added (sold out, or the ingredient that is off). */
  reason?: string
  /** Normalised picks, when usable. */
  options?: Selections
  /** Price of one, including picks. */
  unit: number
  /** "Multigrain · Paneer tikka · Extra cheese" */
  picked: string
  nonVeg: boolean
}

/**
 * Can a remembered line (a shared template, a past order, "your usual") be put in the cart right now?
 * Checks the item itself and, for build-your-own items, every pick against the live menu.
 */
export function checkLine(item: MenuEntry | undefined, l: { options?: Selections }): LineCheck {
  if (!item || isSoldOut(item)) return { usable: false, reason: 'sold out', unit: item?.price ?? 0, picked: '', nonVeg: false }
  if (item.options?.length) {
    const r = resolveOptions(item, l.options)
    if (!r.ok) return { usable: false, reason: r.issue.message, unit: item.price, picked: '', nonVeg: false }
    return { usable: true, options: r.options, unit: item.price + r.priceDelta, picked: r.custom.map((c) => c.choices.join(', ')).join(' · '), nonVeg: r.nonVeg }
  }
  return { usable: true, unit: item.price, picked: '', nonVeg: false }
}
