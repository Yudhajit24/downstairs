import type { MenuItem } from './types.js'

export type FitFilter = 'all' | 'protein' | 'light'

/** Marked healthier on the menu: tagged light (low-calorie, low-sugar) or protein. */
export const isHealthy = (m: Pick<MenuItem, 'tags'>) => m.tags.includes('light') || m.tags.includes('protein')

/** "High protein" means at least 15 g per serving. */
export const HIGH_PROTEIN_G = 15
/** "Under 250 kcal". */
export const LIGHT_KCAL = 250

export const isHighProtein = (m: Pick<MenuItem, 'nutrition'>) => (m.nutrition?.protein ?? 0) >= HIGH_PROTEIN_G
export const isUnderLight = (m: Pick<MenuItem, 'nutrition'>) => !!m.nutrition && m.nutrition.kcal <= LIGHT_KCAL

/** Items for the Fit picks section, filtered. Highest protein first for the protein filter, lowest kcal for light. */
export function fitPicks<T extends Pick<MenuItem, 'tags' | 'nutrition' | 'sortOrder'>>(menu: T[], filter: FitFilter): T[] {
  const healthy = menu.filter(isHealthy)
  if (filter === 'protein') return healthy.filter(isHighProtein).sort((a, b) => b.nutrition!.protein - a.nutrition!.protein)
  if (filter === 'light') return healthy.filter(isUnderLight).sort((a, b) => a.nutrition!.kcal - b.nutrition!.kcal)
  return healthy.sort((a, b) => a.sortOrder - b.sortOrder)
}

export const nutritionLine = (m: Pick<MenuItem, 'nutrition'>) =>
  m.nutrition ? `~${m.nutrition.kcal} kcal · ${m.nutrition.protein}g protein` : null
