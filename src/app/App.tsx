import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Grain, ToastProvider } from '../design'
import { Styleguide } from '../styleguide/Styleguide'
import { CustomerFrame } from './CustomerFrame'

// Phase 0: only /styleguide is real. Customer and kitchen routes land in phases 2 and 3.
function Placeholder({ name }: { name: string }) {
  return <p className="p-6 font-display text-display-m text-ink">{name} · coming in a later phase</p>
}

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Grain />
        <Routes>
          <Route path="/styleguide" element={<Styleguide />} />
          <Route path="/kitchen/*" element={<Placeholder name="kitchen" />} />
          <Route path="*" element={<CustomerFrame><Placeholder name="customer" /></CustomerFrame>} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}
