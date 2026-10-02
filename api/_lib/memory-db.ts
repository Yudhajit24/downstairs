import type { Db, Tx } from './db.js'

/**
 * In-memory Db for tests. Transactions run one at a time (like Firestore retrying
 * contended transactions), writes are buffered and discarded if the function throws.
 */
export function memoryDb(seed: Record<string, object> = {}) {
  const store = new Map<string, unknown>(Object.entries(seed).map(([k, v]) => [k, structuredClone(v)]))
  let queue: Promise<unknown> = Promise.resolve()

  const db: Db & { store: Map<string, unknown>; read<T>(path: string): T | undefined } = {
    store,
    read: <T>(p: string) => structuredClone(store.get(p)) as T | undefined,
    runTransaction<R>(fn: (tx: Tx) => Promise<R>): Promise<R> {
      const run = async () => {
        const writes: [string, object, boolean][] = []
        let wrote = false
        const tx: Tx = {
          async get<T>(path: string) {
            if (wrote) throw new Error('reads must come before writes in a transaction')
            await Promise.resolve() // yield, so concurrent callers interleave if not serialised
            return structuredClone(store.get(path)) as T | undefined
          },
          set(path, data) { wrote = true; writes.push([path, structuredClone(data), false]) },
          update(path, data) {
            wrote = true
            if (!store.has(path) && !writes.some((w) => w[0] === path)) throw new Error(`update on missing doc ${path}`)
            writes.push([path, structuredClone(data), true])
          },
        }
        const result = await fn(tx)
        for (const [path, data, merge] of writes) {
          store.set(path, merge ? { ...(store.get(path) as object), ...data } : data)
        }
        return result
      }
      const p = queue.then(run, run)
      queue = p.catch(() => undefined)
      return p
    },
  }
  return db
}
