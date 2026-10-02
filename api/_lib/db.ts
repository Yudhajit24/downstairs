/**
 * Minimal transactional store the business logic runs on. Production uses Firestore
 * (firestore-db.ts); tests use an in-memory store (memory-db.ts).
 * Contract: all reads happen before any write inside a transaction (a Firestore rule).
 */
export interface Tx {
  get<T>(path: string): Promise<T | undefined>
  /** Create or fully replace. */
  set(path: string, data: object): void
  /** Merge fields into an existing doc. */
  update(path: string, data: object): void
}

export interface Db {
  runTransaction<R>(fn: (tx: Tx) => Promise<R>): Promise<R>
}
