import { collection, doc, onSnapshot, query, where, type FirestoreError } from 'firebase/firestore'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { dateKey } from '../../shared/slots'
import type { CafeSettings, MenuItem, SlotDoc } from '../../shared/types'
import { fromFs } from './convert'
import { db } from './firebase'

export type MenuEntry = MenuItem & { id: string }

interface CafeData {
  menu: Record<string, MenuEntry>
  menuList: MenuEntry[]
  settings: CafeSettings | null
  slots: Record<string, SlotDoc>
  ready: boolean
  error: boolean
}

const Ctx = createContext<CafeData | null>(null)

/** One set of live listeners (menu, settings, today's slots) shared by every customer screen. */
export function CafeDataProvider({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState<Record<string, MenuEntry> | null>(null)
  const [settings, setSettings] = useState<CafeSettings | null>(null)
  const [slots, setSlots] = useState<Record<string, SlotDoc>>({})
  const [error, setError] = useState(false)
  const [today, setToday] = useState(() => dateKey(new Date()))

  useEffect(() => {
    const onErr = (e: FirestoreError) => { console.error(e); setError(true) }
    const un1 = onSnapshot(collection(db, 'menu'), (s) => {
      setError(false)
      setMenu(Object.fromEntries(s.docs.map((d) => [d.id, { id: d.id, ...fromFs<MenuItem>(d.data()) }])))
    }, onErr)
    const un2 = onSnapshot(doc(db, 'settings', 'cafe'), (s) => setSettings(s.exists() ? (s.data() as CafeSettings) : null), onErr)
    return () => { un1(); un2() }
  }, [])

  // Roll the slot query over at IST midnight.
  useEffect(() => {
    const t = setInterval(() => setToday(dateKey(new Date())), 60_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    return onSnapshot(query(collection(db, 'slots'), where('date', '==', today)), (s) => {
      setSlots(Object.fromEntries(s.docs.map((d) => [d.id, d.data() as SlotDoc])))
    }, (e) => console.error(e))
  }, [today])

  const value = useMemo<CafeData>(() => {
    const m = menu ?? {}
    return {
      menu: m,
      menuList: Object.values(m).sort((a, b) => a.sortOrder - b.sortOrder),
      settings, slots, ready: menu !== null && settings !== null, error,
    }
  }, [menu, settings, slots, error])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCafe(): CafeData {
  const c = useContext(Ctx)
  if (!c) throw new Error('useCafe outside CafeDataProvider')
  return c
}
