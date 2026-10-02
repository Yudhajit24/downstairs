import { useState, type ReactNode } from 'react'
import {
  ActiveOrderPill, BottomSheet, Button, CartBar, Card, Chip, Keypad, OpenPill, QtyStepper, Segmented,
  Skeleton, SlotChip, Stamp, StatusPill, StatusStepper, Ticket, VegMark, useToast,
  type OrderStatus, type SlotState,
} from '../design'
import { Poster, POSTERS } from '../posters/Poster'
import { CAFE_LOCATION, CAFE_TAGLINE, CAFE_WORDMARK } from '../../shared/constants'
import {
  HeroScene, ITEM_ILLUSTRATIONS, ItemIllustration, SceneCancelled, SceneNew, ScenePickedUp, ScenePreparing, SceneReady,
} from '../illustrations'

const ITEMS: [string, string][] = [
  ['filter-coffee', 'Filter Coffee'], ['cutting-chai', 'Cutting Chai'], ['cappuccino', 'Cappuccino'],
  ['cold-coffee', 'Cold Coffee'], ['cold-brew', 'Cold Brew'], ['lemon-iced-tea', 'Lemon Iced Tea'],
  ['kanda-poha', 'Kanda Poha'], ['veg-sandwich', 'Veg Grilled Sandwich'], ['egg-bhurji-pav', 'Egg Bhurji Pav'],
  ['butter-croissant', 'Butter Croissant'], ['banana-bread', 'Banana Walnut Bread'], ['choco-cookie', 'Choco Chip Cookie'],
]

function Section({ title, children, dark }: { title: string; children: ReactNode; dark?: boolean }) {
  return (
    <section className={dark ? 'bg-ink px-4 py-10 text-paper-raised' : 'px-4 py-10'}>
      <div className="mx-auto max-w-[1000px]">
        <h2 className={`mb-6 font-display text-display-m ${dark ? 'text-paper' : 'text-ink'}`}>{title}</h2>
        {children}
      </div>
    </section>
  )
}

const Label = ({ children }: { children: ReactNode }) => <p className="mb-2 mt-5 text-micro font-bold uppercase tracking-widest text-fog first:mt-0">{children}</p>

export function Styleguide() {
  const [qty, setQty] = useState(0)
  const [sugar, setSugar] = useState<'regular' | 'less' | 'none'>('regular')
  const [cat, setCat] = useState('Hot')
  const [slot, setSlot] = useState('8:30')
  const [sheet, setSheet] = useState(false)
  const [pin, setPin] = useState('')
  const toast = useToast()
  const slots: [string, SlotState][] = [['8:00', 'past'], ['8:15', 'full'], ['8:30', 'few'], ['8:45', 'open'], ['9:00', 'closed'], ['9:15', 'open']]
  const statuses: OrderStatus[] = ['new', 'preparing', 'ready', 'picked_up', 'cancelled']

  return (
    <div>
      {/* Header block, the way the menu will open */}
      <header className="bg-paper px-4 pb-6 pt-8">
        <div className="mx-auto grid max-w-[1000px] items-center gap-6 md:grid-cols-2">
          <div>
            <h1 className="m-0 font-display text-display-xl text-ink">{CAFE_WORDMARK}</h1>
            <p className="m-0 font-script text-script-l font-bold text-tomato-text">{CAFE_TAGLINE}</p>
            <p className="mt-2 text-small text-ink-deep">{CAFE_LOCATION}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <OpenPill open label="Open till 10 PM" />
              <ActiveOrderPill token={27} status="preparing" />
            </div>
            <p className="mt-4 max-w-sm text-body">Order from your flat. Pick up at the Clubhouse counter.</p>
          </div>
          <div className="max-w-[420px] justify-self-center"><HeroScene /></div>
        </div>
      </header>

      <Section title="Colour">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[['ink', 'bg-ink', 'text-paper'], ['ink-deep', 'bg-ink-deep', 'text-paper'], ['paper', 'bg-paper', 'text-ink-deep'], ['paper-raised', 'bg-paper-raised', 'text-ink-deep'],
            ['tomato', 'bg-tomato', 'text-ink-deep'], ['tomato-text', 'bg-tomato-text', 'text-paper'], ['mustard', 'bg-mustard', 'text-ink-deep'], ['leaf', 'bg-leaf', 'text-paper'],
            ['fog', 'bg-fog', 'text-ink-deep'], ['nonveg', 'bg-nonveg', 'text-paper']].map(([n, bg, fg]) => (
            <div key={n} className={`${bg} ${fg} flex h-20 items-end rounded-card border-2 border-ink p-2 text-micro font-bold`}>{n}</div>
          ))}
        </div>
      </Section>

      <Section title="Type">
        <p className="m-0 font-display text-display-xl text-ink">#027</p>
        <p className="m-0 font-display text-display-l text-ink">Screen title</p>
        <p className="m-0 font-display text-display-m text-ink">Column header</p>
        <p className="m-0 font-script text-script text-tomato-text font-bold">only 3 left!</p>
        <p className="m-0 text-body">Body · DM Sans 16/24. Prices use tabular numerals: <span className="tnum font-bold">₹1,110 · ₹245</span></p>
        <p className="m-0 text-small">Small 14/20</p>
        <p className="m-0 text-micro">Micro 12/16</p>
        <p className="m-0 font-mono text-body">KOT #027 · 08:15 · Space Mono</p>
      </Section>

      <Section title="Buttons, chips, controls">
        <Label>Buttons</Label>
        <div className="flex flex-wrap gap-4">
          <Button>Review order</Button>
          <Button variant="secondary">Edit order</Button>
          <Button variant="tomato">Cancel order</Button>
          <Button variant="ghost">Skip</Button>
          <Button disabled>Disabled</Button>
          <Button size="lg" block>Place order · ₹245</Button>
        </div>
        <Label>Category chips (tap to press)</Label>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['Hot', 'Cold', 'Breakfast', 'Bakes'].map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}
        </div>
        <Label>Slot chips · IST</Label>
        <div className="flex gap-2 overflow-x-auto p-1">
          {slots.map(([t, s]) => <SlotChip key={t} time={t} state={s} selected={slot === t} onClick={() => setSlot(t)} />)}
        </div>
        <Label>Add → stepper</Label>
        <QtyStepper qty={qty} onChange={setQty} label="Cutting Chai" />
        <Label>Segmented</Label>
        <div className="max-w-sm">
          <Segmented label="Sugar" value={sugar} onChange={setSugar} options={[{ value: 'regular', label: 'Regular' }, { value: 'less', label: 'Less' }, { value: 'none', label: 'None' }]} />
        </div>
        <Label>Sheet, toast, status pills</Label>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => setSheet(true)}>Open bottom sheet</Button>
          <Button variant="secondary" onClick={() => toast({ message: '#027 moved to Preparing', actionLabel: 'Undo' })}>Show undo toast</Button>
          {statuses.map((s) => <StatusPill key={s} status={s} />)}
        </div>
        <Label>Cart bar</Label>
        <div className="max-w-[440px]"><CartBar count={3} total={245} /></div>
        <Label>Loading</Label>
        <div className="flex max-w-[440px] flex-col gap-3"><Skeleton className="h-20" /><Skeleton className="h-20 w-2/3" /></div>
      </Section>

      <Section title="Menu rows">
        <div className="grid max-w-[440px] gap-3">
          <Card className="flex items-center gap-3">
            <ItemIllustration name="cutting-chai" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 font-bold"><span>Cutting Chai</span><VegMark veg /></div>
              <p className="m-0 text-small text-ink-deep/80">Half a glass of strong, sweet, spiced chai.</p>
              <span className="tnum font-bold">₹25</span>
            </div>
            <QtyStepper qty={qty} onChange={setQty} label="Cutting Chai" />
          </Card>
          <Card className="flex items-center gap-3">
            <ItemIllustration name="butter-croissant" />
            <div className="min-w-0 flex-1">
              <div className="font-bold">Butter Croissant <span className="inline-block align-middle"><VegMark veg={false} /></span></div>
              <p className="m-0 font-script text-script font-bold leading-5 text-tomato-text">only 3 left!</p>
              <span className="tnum font-bold">₹90</span>
            </div>
            <Button variant="secondary">Add</Button>
          </Card>
          <Card className="relative flex items-center gap-3 [&>*:not(span)]:grayscale [&>*:not(span)]:opacity-60">
            <ItemIllustration name="cold-brew" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 font-bold"><span>Cold Brew</span><VegMark veg /></div>
              <span className="tnum font-bold">₹150</span>
            </div>
            <span className="sr-only">Sold out</span>
            <span className="absolute right-6 top-1/2 -translate-y-1/2" aria-hidden><Stamp /></span>
          </Card>
        </div>
        <div className="mt-10 flex items-center gap-6">
          <VegMark veg size={24} /><VegMark veg={false} size={24} />
        </div>
      </Section>

      <Section title="Status steppers & scenes">
        <div className="grid gap-8 sm:grid-cols-2">
          {([['new', SceneNew, "Order's in. We'll start on it soon."], ['preparing', ScenePreparing, 'Brewing now.'],
            ['ready', SceneReady, 'Come on down! Show #027 at the counter.'], ['picked_up', ScenePickedUp, 'Enjoy. See you tomorrow?']] as const).map(([s, Scene, copy]) => (
            <Card key={s} raised className="text-center">
              <Scene size={150} />
              <p className="m-0 mb-3 font-display text-display-m text-ink">{copy}</p>
              <StatusStepper status={s} />
            </Card>
          ))}
          <Card raised className="text-center"><SceneCancelled size={150} /><p className="m-0 font-display text-display-m text-ink">Cancelled</p></Card>
        </div>
      </Section>

      <Section title="Item illustrations" >
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
          {ITEMS.map(([id, n]) => (
            <div key={id} className="flex flex-col items-center gap-2 rounded-card border-2 border-ink bg-paper-raised p-3 text-center">
              <ItemIllustration name={id} size={88} />
              <span className="text-micro font-bold">{n}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-micro text-fog">{Object.keys(ITEM_ILLUSTRATIONS).length} of 12 drawn</p>
      </Section>

      <Section title="Poster of the day">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {POSTERS.map((p) => <Poster key={p.id} poster={p} variant="card" />)}
        </div>
        <Label>Strip (menu)</Label>
        <div className="max-w-[440px]"><Poster poster={POSTERS[0]} variant="strip" /></div>
      </Section>

      <Section title="Kitchen · KOT tickets, keypad" dark>
        <div className="grid gap-6 md:grid-cols-3">
          <Ticket token={27} time="08:15" tone="flash"
            header={<div className="flex justify-between"><span className="font-bold">Riya · B-402</span><span>in 7 min</span></div>}
            footer={<button className="h-14 w-full rounded-btn border-2 border-ink-deep bg-ink font-sans text-body font-bold text-paper-raised cursor-pointer">START →</button>}>
            <div className="flex justify-between"><span>2  Cutting Chai</span><span className="text-small">less sugar</span></div>
            <div>1  Kanda Poha</div>
            <div className="text-small">note: extra hot</div>
            <div className="mt-2 inline-block rounded border-2 border-tomato px-2 text-small font-bold text-tomato-text">UPDATED +1 Cutting Chai</div>
          </Ticket>
          <Ticket token={28} time="08:30" tone="soon"
            header={<div className="flex justify-between"><span className="font-bold">Arun · A-101</span><span className="font-bold">due soon</span></div>}>
            <div>1  Filter Coffee</div><div>1  Butter Croissant</div>
          </Ticket>
          <Ticket token={26} time="08:00" tone="late"
            header={<div className="flex justify-between"><span className="font-bold">Meera · C-1204</span><span className="font-bold text-tomato-text">late 3 min</span></div>}>
            <div>3  Cold Coffee</div>
          </Ticket>
        </div>
        <div className="mt-10"><Keypad value={pin} onChange={setPin} /></div>
      </Section>

      <p className="bg-paper px-4 py-8 text-center text-micro text-fog">Styleguide · Phase 0</p>

      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Cutting Chai">
        <div className="flex justify-center"><ItemIllustration name="cutting-chai" size={112} /></div>
        <h3 className="m-0 mt-2 font-display text-display-m text-ink">Cutting Chai</h3>
        <p className="mt-1 text-small">Half a glass of strong, sweet, spiced chai.</p>
        <div className="my-4"><Segmented label="Sugar" value={sugar} onChange={setSugar} options={[{ value: 'regular', label: 'Regular' }, { value: 'less', label: 'Less' }, { value: 'none', label: 'None' }]} /></div>
        <Button size="lg" block onClick={() => setSheet(false)}>Add · ₹25</Button>
      </BottomSheet>
    </div>
  )
}
