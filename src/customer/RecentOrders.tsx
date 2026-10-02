import { doc, onSnapshot } from 'firebase/firestore'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Order } from '../../shared/types'
import { fromFs } from '../lib/convert'
import { db } from '../lib/firebase'
import { loadRecentIds, pushRecentId } from '../lib/storage'

interface Recent {
  ids: string[]
  /** True until every saved id has reported once. */
  loading: boolean
  /** Live orders for the saved ids, newest first. Unknown ids are left out. */
  orders: Order[]
  remember: (id: string) => void
}
const Ctx = createContext<Recent | null>(null)

/** Live listeners for the customer's last 10 order ids (from localStorage). */
export function RecentOrdersProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>(() => loadRecentIds())
  const [byId, setById] = useState<Record<string, Order | null>>({})

  useEffect(() => {
    const unsubs = ids.map((id) =>
      onSnapshot(doc(db, 'orders', id), (snap) => {
        if (snap.exists()) setById((m) => ({ ...m, [id]: fromFs<Order>(snap.data()) }))
        else if (!snap.metadata.fromCache) setById((m) => ({ ...m, [id]: null }))
      }, () => {}),
    )
    return () => unsubs.forEach((u) => u())
  }, [ids])

  const remember = useCallback((id: string) => setIds(pushRecentId(id)), [])
  const value = useMemo<Recent>(() => ({
    ids, remember, loading: ids.some((id) => !(id in byId)),
    orders: ids.map((id) => byId[id]).filter((o): o is Order => !!o)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
  }), [ids, byId, remember])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useRecentOrders(): Recent {
  const c = useContext(Ctx)
  if (!c) throw new Error('useRecentOrders outside provider')
  return c
}

/** The order that should show in the header pill: the newest one still in progress. */
export function useActiveOrder(): Order | undefined {
  return useRecentOrders().orders.find((o) => o.status === 'new' || o.status === 'preparing' || o.status === 'ready')
}
