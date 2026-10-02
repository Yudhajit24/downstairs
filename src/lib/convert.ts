import { Timestamp } from 'firebase/firestore'

/** Deep-convert Firestore Timestamps to Dates. */
export function fromFs<T>(v: unknown): T {
  if (v instanceof Timestamp) return v.toDate() as T
  if (Array.isArray(v)) return v.map((x) => fromFs(x)) as T
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fromFs(x)])) as T
  }
  return v as T
}
