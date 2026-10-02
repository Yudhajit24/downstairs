import type { MenuItem } from './types.js'

type Seed = Omit<MenuItem, 'illustration' | 'sortOrder'>

const items: [string, Seed][] = [
  ['filter-coffee', { name: 'Filter Coffee', category: 'hot', description: 'Strong decoction, frothy milk, served the dabara-tumbler way.', price: 45, veg: true, prepUnits: 1, available: true, stock: null, hasSugarOption: true, tags: ['hot'] }],
  ['cutting-chai', { name: 'Cutting Chai', category: 'hot', description: 'Half a glass of strong, sweet, spiced chai. Meant for sharing.', price: 25, veg: true, prepUnits: 1, available: true, stock: null, hasSugarOption: true, tags: ['hot'] }],
  ['cappuccino', { name: 'Cappuccino', category: 'hot', description: 'Double shot, velvety foam, a little heart on top.', price: 130, veg: true, prepUnits: 1, available: true, stock: null, hasSugarOption: true, tags: ['hot'] }],
  ['cold-coffee', { name: 'Cold Coffee', category: 'cold', description: 'Thick, creamy, blended cold. The classic.', price: 120, veg: true, prepUnits: 1, available: true, stock: null, hasSugarOption: true, tags: ['cold'] }],
  ['cold-brew', { name: 'Cold Brew', category: 'cold', description: 'Steeped for 18 hours. Smooth, bold, no bitterness.', price: 150, veg: true, prepUnits: 1, available: false, stock: 10, hasSugarOption: false, tags: ['cold'] }],
  ['lemon-iced-tea', { name: 'Lemon Iced Tea', category: 'cold', description: 'Black tea, fresh lemon, plenty of ice.', price: 90, veg: true, prepUnits: 1, available: true, stock: null, hasSugarOption: true, tags: ['cold'] }],
  ['kanda-poha', { name: 'Kanda Poha', category: 'breakfast', description: 'Fluffy poha with onion, peanuts and a squeeze of lemon.', price: 60, veg: true, prepUnits: 2, available: true, stock: 15, hasSugarOption: false, tags: ['breakfast'] }],
  ['veg-sandwich', { name: 'Veg Grilled Sandwich', category: 'breakfast', description: 'Green chutney, cucumber, tomato, cheese. Grilled till crisp.', price: 90, veg: true, prepUnits: 2, available: true, stock: null, hasSugarOption: false, tags: ['breakfast'] }],
  ['egg-bhurji-pav', { name: 'Egg Bhurji Pav', category: 'breakfast', description: 'Spicy scrambled eggs with two buttered pavs.', price: 100, veg: false, prepUnits: 2, available: true, stock: null, hasSugarOption: false, tags: ['breakfast'] }],
  ['butter-croissant', { name: 'Butter Croissant (contains egg)', category: 'bakes', description: 'Flaky, golden, baked this morning.', price: 90, veg: false, prepUnits: 0, available: true, stock: 3, hasSugarOption: false, tags: ['bakes'] }],
  ['banana-bread', { name: 'Banana Walnut Bread (eggless)', category: 'bakes', description: 'Moist, ripe-banana loaf with crunchy walnuts.', price: 70, veg: true, prepUnits: 0, available: true, stock: 8, hasSugarOption: false, tags: ['bakes'] }],
  ['choco-cookie', { name: 'Choco Chip Cookie (eggless)', category: 'bakes', description: 'Chewy middle, crisp edge, melty chocolate.', price: 50, veg: true, prepUnits: 0, available: true, stock: 20, hasSugarOption: false, tags: ['bakes'] }],
]

export const MENU_SEED: Record<string, MenuItem> = Object.fromEntries(
  items.map(([id, it], i) => [id, { ...it, illustration: id, sortOrder: i }]),
)
