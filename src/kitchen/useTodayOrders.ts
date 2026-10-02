import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { useEffect, useRef, useState } from 'react'
import { dateKey } from '../../shared/slots'
import type { Order } from '../../shared/types'
import { fromFs } from '../lib/convert'
import { db } from '../lib/firebase'
import { useOnline } from '../lib/hooks'

export interface OrderEvents {
  onNew?: (o: Order) => void
  onEdit?: (o: Order) => void
  onCustomerCancel?: (o: Order) => void
}

/** Today's orders (live). Events fire only for changes after the first load. */
export function useTodayOrders(events: OrderEvents) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loaded, setLoaded] = useState(false)
  const [serverLive, setServerLive] = useState(false)
  const [today, setToday] = useState(() => dateKey(new Date()))
  const online = useOnline()
  const ev = useRef(events)
  ev.current = events

  useEffect(() => {
    const t = setInterval(() => setToday(dateKey(new Date())), 60_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const prev = new Map<string, Order>()
    let first = true
    return onSnapshot(
      query(collection(db, 'orders'), where('date', '==', today)),
      { includeMetadataChanges: true },
      (snap) => {
        setServerLive(!snap.metadata.fromCache)
        for (const ch of snap.docChanges()) {
          if (first) break
          const o = fromFs<Order>(ch.doc.data())
          const p = prev.get(o.id)
          if (ch.type === 'added' && !p) ev.current.onNew?.(o)
          else if (ch.type === 'modified' && p) {
            if (p.status !== 'cancelled' && o.status === 'cancelled' && o.cancelledBy === 'customer') ev.current.onCustomerCancel?.(o)
            else if (o.editCount > p.editCount) ev.current.onEdit?.(o)
          }
        }
        const list = snap.docs.map((d) => fromFs<Order>(d.data()))
        list.forEach((o) => prev.set(o.id, o))
        first = false
        setOrders(list)
        setLoaded(true)
      },
      () => setServerLive(false),
    )
  }, [today])

  return { orders, loaded, live: online && serverLive }
}
