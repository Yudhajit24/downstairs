import { doc, onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import type { Order } from '../../shared/types'
import { fromFs } from './convert'
import { db } from './firebase'

/** Re-renders on an interval so time-based states (slots, open/closed) stay fresh. */
export function useNow(ms = 15_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

export function useOnline(): boolean {
  const [on, setOn] = useState(() => navigator.onLine)
  useEffect(() => {
    const u = () => setOn(true), d = () => setOn(false)
    window.addEventListener('online', u)
    window.addEventListener('offline', d)
    return () => { window.removeEventListener('online', u); window.removeEventListener('offline', d) }
  }, [])
  return on
}

export interface LiveOrder {
  order: Order | null | undefined // undefined = still loading, null = not found
  /** True while the listener is serving cached data / can't reach the server. */
  reconnecting: boolean
}

export function useOrder(id: string | undefined): LiveOrder {
  const [state, setState] = useState<LiveOrder>({ order: undefined, reconnecting: false })
  const online = useOnline()
  useEffect(() => {
    if (!id) return
    setState({ order: undefined, reconnecting: false })
    return onSnapshot(
      doc(db, 'orders', id),
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.exists()) setState({ order: fromFs<Order>(snap.data()), reconnecting: snap.metadata.fromCache })
        else if (!snap.metadata.fromCache) setState({ order: null, reconnecting: false })
      },
      () => setState((s) => ({ ...s, reconnecting: true })),
    )
  }, [id])
  return { ...state, reconnecting: state.reconnecting || !online }
}
