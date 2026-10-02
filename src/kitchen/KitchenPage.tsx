import { Skeleton } from '../design'
import { CafeDataProvider } from '../lib/CafeData'
import { Board } from './Board'
import { PinGate } from './PinGate'
import { useStaff } from './staff'

export function KitchenPage() {
  const staff = useStaff()
  if (staff === 'loading') return <div className="grid min-h-dvh place-items-center bg-ink"><Skeleton className="h-24 w-64 !bg-paper/20" /></div>
  if (staff === 'out') return <PinGate />
  return <CafeDataProvider><Board /></CafeDataProvider>
}
