import type { MenuItem, OptionChoice } from './types.js'

type Seed = Omit<MenuItem, 'illustration' | 'sortOrder'> & { illustration?: string }

const ch = (id: string, label: string, priceDelta = 0, extra: Partial<OptionChoice> = {}): OptionChoice => ({ id, label, priceDelta, available: true, ...extra })

const items: [string, Seed][] = [
  ['filter-coffee', { name: 'Filter Coffee', category: 'hot', description: 'Strong decoction, frothy milk, served the dabara-tumbler way.', price: 45, veg: true, prepUnits: 1, available: true, stock: null, hasSugarOption: true, tags: ['hot'], nutrition: { kcal: 70, protein: 3 } }],
  ['cutting-chai', { name: 'Cutting Chai', category: 'hot', description: 'Half a glass of strong, sweet, spiced chai. Meant for sharing.', price: 25, veg: true, prepUnits: 1, available: true, stock: null, hasSugarOption: true, tags: ['hot'], nutrition: { kcal: 60, protein: 2 } }],
  ['cappuccino', { name: 'Cappuccino', category: 'hot', description: 'Double shot, velvety foam, a little heart on top.', price: 130, veg: true, prepUnits: 1, available: true, stock: null, hasSugarOption: true, tags: ['hot'], nutrition: { kcal: 110, protein: 6 } }],
  ['cold-coffee', { name: 'Cold Coffee', category: 'cold', description: 'Thick, creamy, blended cold. The classic.', price: 120, veg: true, prepUnits: 1, available: true, stock: null, hasSugarOption: true, tags: ['cold'], nutrition: { kcal: 220, protein: 6 } }],
  ['cold-brew', { name: 'Cold Brew', category: 'cold', description: 'Steeped for 18 hours. Smooth, bold, no bitterness.', price: 150, veg: true, prepUnits: 1, available: false, stock: 10, hasSugarOption: false, tags: ['cold', 'light'], nutrition: { kcal: 5, protein: 0 } }],
  ['lemon-iced-tea', { name: 'Lemon Iced Tea', category: 'cold', description: 'Black tea, fresh lemon, plenty of ice.', price: 90, veg: true, prepUnits: 1, available: true, stock: null, hasSugarOption: true, tags: ['cold'], nutrition: { kcal: 90, protein: 0 } }],
  ['kanda-poha', { name: 'Kanda Poha', category: 'breakfast', description: 'Fluffy poha with onion, peanuts and a squeeze of lemon.', price: 60, veg: true, prepUnits: 2, available: true, stock: 15, hasSugarOption: false, tags: ['breakfast', 'light'], nutrition: { kcal: 250, protein: 6 } }],
  ['veg-sandwich', { name: 'Veg Grilled Sandwich', category: 'breakfast', description: 'Green chutney, cucumber, tomato, cheese. Grilled till crisp.', price: 90, veg: true, prepUnits: 2, available: true, stock: null, hasSugarOption: false, tags: ['breakfast'], nutrition: { kcal: 320, protein: 11 } }],
  ['build-sandwich', { name: 'Build Your Sandwich', category: 'breakfast', description: 'Pick your bread, fillings, extras and sauce. Grilled to order.', price: 80, veg: true, prepUnits: 2, available: true, stock: null, hasSugarOption: false, tags: ['breakfast'], illustration: 'veg-sandwich', options: [
    { id: 'bread', label: 'Bread', min: 1, max: 1, choices: [ch('multigrain', 'Multigrain'), ch('white', 'White'), ch('focaccia', 'Focaccia', 15)] },
    { id: 'filling', label: 'Filling', min: 1, max: 2, choices: [ch('paneer-tikka', 'Paneer tikka', 30), ch('grilled-veg', 'Grilled veg'), ch('corn-cheese', 'Corn & cheese', 20), ch('egg-bhurji', 'Egg bhurji', 20, { nonVeg: true })] },
    { id: 'extras', label: 'Extras', min: 0, max: 3, choices: [ch('extra-cheese', 'Extra cheese', 20), ch('jalapenos', 'Jalapeños', 10), ch('olives', 'Olives', 15), ch('avocado', 'Avocado', 40)] },
    { id: 'sauce', label: 'Sauce', min: 0, max: 2, choices: [ch('mint-mayo', 'Mint mayo'), ch('chipotle', 'Chipotle'), ch('tandoori', 'Tandoori'), ch('schezwan', 'Schezwan')] },
  ] }],
  ['egg-bhurji-pav', { name: 'Egg Bhurji Pav', category: 'breakfast', description: 'Spicy scrambled eggs with two buttered pavs.', price: 100, veg: false, prepUnits: 2, available: true, stock: null, hasSugarOption: false, tags: ['breakfast', 'protein'], nutrition: { kcal: 410, protein: 17 } }],
  ['butter-croissant', { name: 'Butter Croissant (contains egg)', category: 'bakes', description: 'Flaky, golden, baked this morning.', price: 90, veg: false, prepUnits: 0, available: true, stock: 3, hasSugarOption: false, tags: ['bakes'], nutrition: { kcal: 270, protein: 5 } }],
  ['banana-bread', { name: 'Banana Walnut Bread (eggless)', category: 'bakes', description: 'Moist, ripe-banana loaf with crunchy walnuts.', price: 70, veg: true, prepUnits: 0, available: true, stock: 8, hasSugarOption: false, tags: ['bakes'], nutrition: { kcal: 280, protein: 4 } }],
  ['choco-cookie', { name: 'Choco Chip Cookie (eggless)', category: 'bakes', description: 'Chewy middle, crisp edge, melty chocolate.', price: 50, veg: true, prepUnits: 0, available: true, stock: 20, hasSugarOption: false, tags: ['bakes'], nutrition: { kcal: 190, protein: 2 } }],
  ['egg-white-wrap', { name: 'Egg White Wrap', category: 'breakfast', description: 'Egg whites, spinach and mint chutney in a whole-wheat wrap.', price: 110, veg: false, prepUnits: 2, available: true, stock: null, hasSugarOption: false, tags: ['breakfast', 'protein'], nutrition: { kcal: 280, protein: 22 } }],
  ['sprouts-bowl', { name: 'Sprouts & Chickpea Bowl', category: 'breakfast', description: 'Sprouted moong, chickpeas, cucumber, lemon and chaat masala.', price: 90, veg: true, prepUnits: 1, available: true, stock: null, hasSugarOption: false, tags: ['breakfast', 'light'], nutrition: { kcal: 210, protein: 14 } }],
  ['protein-shake', { name: 'Banana Peanut Protein Shake', category: 'cold', description: 'Banana, peanut butter, milk and a scoop of whey. Post-workout.', price: 140, veg: true, prepUnits: 1, available: true, stock: null, hasSugarOption: false, tags: ['cold', 'protein'], nutrition: { kcal: 320, protein: 24 } }],
]

export const MENU_SEED: Record<string, MenuItem> = Object.fromEntries(
  items.map(([id, it], i) => [id, { ...it, illustration: it.illustration ?? id, sortOrder: i }]),
)
