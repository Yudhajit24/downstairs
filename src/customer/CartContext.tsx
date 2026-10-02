import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { buildLines, lineKey, qtyByItem } from '../../shared/pricing'
import type { Order, Selections, Sugar } from '../../shared/types'
import { useCafe, type MenuEntry } from '../lib/CafeData'
import { loadCart, saveCart } from '../lib/storage'

export interface CartLine { itemId: string; sugar: Sugar | null; qty: number; /** Build-your-own picks (group id -> choice ids). */ options?: Selections }
export interface CartState { lines: CartLine[]; note: string; slotId: string | null }
interface EditState extends CartState { orderId: string; held: Record<string, number> }

interface Root {
  main: CartState
  edit: EditState | null
  /** Per-item messages like "Only 2 left, reduced to 2" (not persisted). */
  notices: Record<string, string>
}

type Target = 'main' | 'edit'
type Action =
  | { t: 'add'; target: Target; itemId: string; sugar: Sugar | null; qty: number; max?: number; options?: Selections }
  | { t: 'setQty'; target: Target; itemId: string; sugar: Sugar | null; qty: number; options?: Selections }
  | { t: 'fixOption'; target: Target; itemId: string; sugar: Sugar | null; options?: Selections; groupId: string; choiceId: string }
  | { t: 'note'; target: Target; note: string }
  | { t: 'slot'; target: Target; slotId: string | null }
  | { t: 'replace'; target: Target; lines: CartLine[] }
  | { t: 'clear'; target: Target }
  | { t: 'startEdit'; order: Order }
  | { t: 'clamp'; lines: CartLine[]; target: Target; notices: Record<string, string> }
  | { t: 'dismiss'; itemId: string }

const key = lineKey
const EMPTY: CartState = { lines: [], note: '', slotId: null }

function updateCart(root: Root, target: Target, f: (c: CartState) => CartState): Root {
  if (target === 'main') return { ...root, main: f(root.main) }
  if (!root.edit) return root
  return { ...root, edit: { ...root.edit, ...f(root.edit) } }
}

function reducer(root: Root, a: Action): Root {
  switch (a.t) {
    case 'add':
      return updateCart(root, a.target, (c) => {
        const i = c.lines.findIndex((l) => key(l) === key(a))
        const lines = [...c.lines]
        if (i >= 0) lines[i] = { ...lines[i], qty: Math.min(lines[i].qty + a.qty, a.max ?? 99) }
        else lines.push({ itemId: a.itemId, sugar: a.sugar, qty: Math.min(a.qty, a.max ?? 99), ...(a.options && Object.keys(a.options).length > 0 && { options: a.options }) })
        return { ...c, lines }
      })
    case 'setQty': {
      const next = updateCart(root, a.target, (c) => ({
        ...c,
        lines: c.lines
          .map((l) => (key(l) === key(a) ? { ...l, qty: a.qty } : l))
          .filter((l) => l.qty > 0),
      }))
      const { [a.itemId]: _gone, ...notices } = next.notices
      return { ...next, notices }
    }
    case 'fixOption': {
      // Drop one ingredient from a line (the kitchen switched it off). Merge into an identical line if one exists.
      return updateCart(root, a.target, (c) => {
        const i = c.lines.findIndex((l) => key(l) === key(a))
        if (i < 0) return c
        const old = c.lines[i]
        const options: Selections = {}
        for (const [g, ids] of Object.entries(old.options ?? {})) {
          const kept = g === a.groupId ? ids.filter((x) => x !== a.choiceId) : ids
          if (kept.length) options[g] = kept
        }
        const fixed: CartLine = { ...old, options: Object.keys(options).length ? options : undefined }
        const twin = c.lines.findIndex((l, j) => j !== i && key(l) === key(fixed))
        const lines = [...c.lines]
        if (twin >= 0) { lines[twin] = { ...lines[twin], qty: lines[twin].qty + old.qty }; lines.splice(i, 1) }
        else lines[i] = fixed
        return { ...c, lines }
      })
    }
    case 'note': return updateCart(root, a.target, (c) => ({ ...c, note: a.note }))
    case 'slot': return updateCart(root, a.target, (c) => ({ ...c, slotId: a.slotId }))
    case 'replace': return updateCart(root, a.target, (c) => ({ ...c, lines: a.lines }))
    case 'clear':
      return a.target === 'main' ? { ...root, main: EMPTY, notices: {} } : { ...root, edit: null }
    case 'startEdit': {
      const o = a.order
      if (root.edit?.orderId === o.id) return root
      return {
        ...root,
        edit: {
          orderId: o.id, slotId: o.slotId, note: o.note ?? '',
          lines: o.items.map((i) => ({ itemId: i.itemId, sugar: i.sugar, qty: i.qty, ...(i.options && { options: i.options }) })),
          held: Object.fromEntries(qtyByItem(o.items)),
        },
      }
    }
    case 'clamp':
      return { ...updateCart(root, a.target, (c) => ({ ...c, lines: a.lines })), notices: { ...root.notices, ...a.notices } }
    case 'dismiss': {
      const { [a.itemId]: _gone, ...notices } = root.notices
      return { ...root, notices }
    }
  }
}

function init(): Root {
  const s = loadCart()
  return {
    main: s ? { lines: s.lines.map((l) => ({ ...l, sugar: l.sugar as Sugar | null })), note: s.note, slotId: s.slotId } : EMPTY, // options (if any) pass straight through
    edit: null,
    notices: {},
  }
}

export interface CartApi {
  state: CartState
  held: Record<string, number>
  qtyOf: (itemId: string, sugar: Sugar | null, options?: Selections) => number
  totalQtyOf: (itemId: string) => number
  add: (itemId: string, sugar: Sugar | null, qty?: number, max?: number, options?: Selections) => void
  setQty: (itemId: string, sugar: Sugar | null, qty: number, options?: Selections) => void
  /** Remove one ingredient from a line (used when it has been switched off). */
  fixOption: (line: CartLine, groupId: string, choiceId: string) => void
  setNote: (n: string) => void
  setSlot: (id: string | null) => void
  replace: (lines: CartLine[]) => void
  clear: () => void
}

interface Ctx { root: Root; dispatch: (a: Action) => void }
const C = createContext<Ctx | null>(null)

export function isSoldOut(item: MenuEntry | undefined, held = 0): boolean {
  if (!item) return true
  return !item.available || (item.stock !== null && item.stock + held <= 0)
}

/** Remaining orderable qty for an item (Infinity when unlimited). */
export function remainingFor(item: MenuEntry, held = 0): number {
  if (!item.available && held === 0) return 0
  return item.stock === null ? Infinity : Math.max(0, item.stock + held)
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [root, dispatch] = useReducer(reducer, undefined, init)
  const { menu, ready } = useCafe()

  useEffect(() => { saveCart(root.main) }, [root.main])

  // When stock drops under what's in a cart, clamp the quantity and say so.
  useEffect(() => {
    if (!ready) return
    for (const target of ['main', 'edit'] as const) {
      const cart = target === 'main' ? root.main : root.edit
      if (!cart) continue
      const held = target === 'edit' ? root.edit!.held : {}
      let lines = cart.lines
      const notices: Record<string, string> = {}
      for (const [itemId, total] of qtyByItem(cart.lines)) {
        const item = menu[itemId]
        if (!item || isSoldOut(item, held[itemId] ?? 0)) continue
        const rem = remainingFor(item, held[itemId] ?? 0)
        if (total <= rem) continue
        let over = total - rem
        lines = [...lines].reverse().map((l) => {
          if (l.itemId !== itemId || over <= 0) return l
          const cut = Math.min(l.qty, over)
          over -= cut
          return { ...l, qty: l.qty - cut }
        }).reverse().filter((l) => l.qty > 0)
        notices[itemId] = `Only ${rem} left, reduced to ${rem}`
      }
      if (Object.keys(notices).length) dispatch({ t: 'clamp', target, lines, notices })
    }
  }, [menu, ready, root.main, root.edit])

  return <C.Provider value={{ root, dispatch }}>{children}</C.Provider>
}

function makeApi(root: Root, dispatch: (a: Action) => void, target: Target): CartApi {
  const state = target === 'main' ? root.main : root.edit ?? EMPTY
  const held = target === 'edit' ? root.edit?.held ?? {} : {}
  return {
    state, held,
    qtyOf: (itemId, sugar, options) => state.lines.find((l) => key(l) === key({ itemId, sugar, options }))?.qty ?? 0,
    totalQtyOf: (itemId) => state.lines.filter((l) => l.itemId === itemId).reduce((n, l) => n + l.qty, 0),
    add: (itemId, sugar, qty = 1, max, options) => dispatch({ t: 'add', target, itemId, sugar, qty, max, options }),
    setQty: (itemId, sugar, qty, options) => dispatch({ t: 'setQty', target, itemId, sugar, qty, options }),
    fixOption: (line, groupId, choiceId) => dispatch({ t: 'fixOption', target, itemId: line.itemId, sugar: line.sugar, options: line.options, groupId, choiceId }),
    setNote: (note) => dispatch({ t: 'note', target, note }),
    setSlot: (slotId) => dispatch({ t: 'slot', target, slotId }),
    replace: (lines) => dispatch({ t: 'replace', target, lines }),
    clear: () => dispatch({ t: 'clear', target }),
  }
}

export function useCart(): CartApi {
  const c = useContext(C)!
  return useMemo(() => makeApi(c.root, c.dispatch, 'main'), [c.root, c.dispatch])
}

export function useEditCart(order: Order | null | undefined): CartApi | null {
  const c = useContext(C)!
  useEffect(() => {
    if (order && order.status === 'new') c.dispatch({ t: 'startEdit', order })
  }, [order?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const ready = c.root.edit && order && c.root.edit.orderId === order.id
  return useMemo(() => (ready ? makeApi(c.root, c.dispatch, 'edit') : null), [c.root, c.dispatch, ready])
}

export function useNotices() {
  const c = useContext(C)!
  const dismiss = useCallback((itemId: string) => c.dispatch({ t: 'dismiss', itemId }), [c])
  return { notices: c.root.notices, dismiss }
}

/** Cart totals priced from the live menu (never from the client's own numbers). */
export function useTotals(state: CartState) {
  const { menu } = useCafe()
  return useMemo(() => buildLines(state.lines, menu), [state.lines, menu])
}
