import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import type { Db, Tx } from './db.js'

function app(): App {
  if (getApps().length) return getApps()[0]
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
  if (!b64) throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 is not set')
  const sa = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'))
  const a = initializeApp({ credential: cert(sa) })
  getFirestore(a).settings({ ignoreUndefinedProperties: true })
  return a
}

export const adminAuth = () => getAuth(app())
export const adminFirestore = () => getFirestore(app())

/** Firestore Timestamps come back as Dates so the core logic only deals in Dates. */
function fromFirestore(v: unknown): unknown {
  if (v instanceof Timestamp) return v.toDate()
  if (Array.isArray(v)) return v.map(fromFirestore)
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fromFirestore(x)]))
  return v
}

export function firestoreDb(): Db {
  const fs = adminFirestore()
  return {
    runTransaction: (fn) =>
      fs.runTransaction(async (t) => {
        const tx: Tx = {
          async get<T>(path: string) {
            const snap = await t.get(fs.doc(path))
            return snap.exists ? (fromFirestore(snap.data()) as T) : undefined
          },
          set: (path, data) => { t.set(fs.doc(path), data) },
          update: (path, data) => { t.update(fs.doc(path), data) },
        }
        return fn(tx)
      }),
  }
}
