import { MotionConfig } from 'motion/react'
import { Component, useEffect, type ReactNode } from 'react'
import { BrowserRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { ToastProvider } from '../design'
import { Grain } from '../design'
import { KitchenPage } from '../kitchen/KitchenPage'
import { CartProvider } from '../customer/CartContext'
import { CheckoutPage } from '../customer/CheckoutPage'
import { OrderPage } from '../customer/OrderPage'
import { OrdersPage } from '../customer/OrdersPage'
import { MenuPage } from '../customer/MenuPage'
import { RecentOrdersProvider } from '../customer/RecentOrders'
import { CafeDataProvider } from '../lib/CafeData'
import { Styleguide } from '../styleguide/Styleguide'
import { CustomerFrame } from './CustomerFrame'

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(e: unknown) { console.error(e) }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="grid min-h-dvh place-items-center bg-paper p-6 text-center">
        <div>
          <p className="m-0 font-display text-display-l text-ink">Oops.</p>
          <p className="mb-4 mt-1 text-body">Something broke on our side. Your cart is safe.</p>
          <button className="min-h-12 rounded-btn border-2 border-ink bg-ink px-5 font-bold text-paper-raised cursor-pointer" onClick={() => location.assign('/')}>Reload</button>
        </div>
      </main>
    )
  }
}

function Placeholder({ name }: { name: string }) {
  return <p className="p-6 font-display text-display-m text-ink">{name} · coming in a later phase</p>
}

/** The riso grain stays off the kitchen board (tablet performance). */
function GrainGate() {
  const { pathname } = useLocation()
  return pathname.startsWith('/kitchen') ? null : <Grain />
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function CustomerLayout() {
  return (
    <CafeDataProvider>
      <RecentOrdersProvider>
        <CartProvider>
          <CustomerFrame><ScrollToTop /><Outlet /></CustomerFrame>
        </CartProvider>
      </RecentOrdersProvider>
    </CafeDataProvider>
  )
}

export function App() {
  return (
    <ErrorBoundary>
    <MotionConfig reducedMotion="user">
    <BrowserRouter>
      <ToastProvider>
        <GrainGate />
        <Routes>
          <Route path="/styleguide" element={<Styleguide />} />
          <Route path="/kitchen/*" element={<KitchenPage />} />
          <Route element={<CustomerLayout />}>
            <Route path="/" element={<MenuPage />} />
            <Route path="/cart" element={<CheckoutPage />} />
            <Route path="/order/:id" element={<OrderPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="*" element={<Placeholder name="customer" />} />
          </Route>
        </Routes>
      </ToastProvider>
    </BrowserRouter>
    </MotionConfig>
    </ErrorBoundary>
  )
}
