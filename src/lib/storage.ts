/** localStorage helpers. Every access is guarded: private mode / blocked storage must not break the app. */
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
}

export interface Profile { name: string; flat: string }
export const loadProfile = () => read<Profile | null>('ds.profile', null)
export const saveProfile = (p: Profile) => write('ds.profile', p)

const RECENT_MAX = 10
export const loadRecentIds = () => read<string[]>('ds.orders', [])
export function pushRecentId(id: string): string[] {
  const next = [id, ...loadRecentIds().filter((x) => x !== id)].slice(0, RECENT_MAX)
  write('ds.orders', next)
  return next
}

export interface StoredCart { lines: { itemId: string; sugar: string | null; qty: number }[]; note: string; slotId: string | null }
export const loadCart = () => read<StoredCart | null>('ds.cart', null)
export const saveCart = (c: StoredCart) => write('ds.cart', c)
