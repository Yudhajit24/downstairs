import { Link, useNavigate } from 'react-router-dom'
import { Button, Skeleton, StatusPill } from '../design'
import { SceneNew } from '../illustrations'
import { rupees, time12, tokenLabel } from '../lib/format'
import { useRecentOrders } from './RecentOrders'
import { TopBar } from './ui'

export function OrdersPage() {
  const { orders, ids, loading } = useRecentOrders()
  const nav = useNavigate()
  return (
    <div className="pb-10">
      <TopBar title="My orders" onBack={() => nav('/')} />
      {ids.length === 0 ? (
        <div className="p-6 text-center">
          <SceneNew size={140} />
          <p className="m-0 font-display text-display-m text-ink">No orders yet.</p>
          <p className="mb-4 mt-1 text-body">Your last 10 orders from this phone show up here.</p>
          <Button onClick={() => nav('/')}>See the menu</Button>
        </div>
      ) : loading && orders.length === 0 ? (
        <div className="flex flex-col gap-3 p-4" aria-busy>{ids.map((id) => <Skeleton key={id} className="h-24" />)}</div>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-4">
          {orders.map((o) => (
            <li key={o.id}>
              <Link to={`/order/${o.id}`} className="block rounded-card border-2 border-ink bg-paper-raised p-4 text-ink-deep no-underline shadow-hard press">
                <div className="flex items-center justify-between">
                  <span className="font-display text-display-m text-ink">{tokenLabel(o.token)}</span>
                  <StatusPill status={o.status} />
                </div>
                <p className="mb-0 mt-1 text-small">
                  {o.date} · pickup {time12(o.slotTime)} · <span className="tnum">{rupees(o.total)}</span>
                </p>
                <p className="m-0 text-small text-ink-deep/80">{o.items.map((i) => `${i.qty} ${i.name}`).join(', ')}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
