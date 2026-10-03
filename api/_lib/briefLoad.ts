import type { BriefOrder } from '../../shared/kitchenBrief.js'
import { dateKey } from '../../shared/slots.js'
import type { MenuRow } from '../../shared/suggest.js'
import type { MenuItem, Status } from '../../shared/types.js'
import { adminFirestore } from './admin.js'

/** Today's live orders, the menu and the paused flag, read with the Admin SDK. */
export async function loadBriefData() {
  const fs = adminFirestore()
  const [ordersSnap, menuSnap, settingsSnap] = await Promise.all([
    fs.collection('orders').where('date', '==', dateKey(new Date())).get(),
    fs.collection('menu').get(),
    fs.doc('settings/cafe').get(),
  ])
  const orders: BriefOrder[] = ordersSnap.docs.map((d) => {
    const o = d.data()
    return {
      token: o.token, status: o.status as Status, slotTime: o.slotTime,
      createdAtMs: o.createdAt?.toMillis?.() ?? Date.now(),
      items: (o.items ?? []).map((i: { name: string; qty: number }) => ({ name: i.name, qty: i.qty })),
    }
  })
  return {
    orders,
    menu: menuSnap.docs.map((d) => ({ id: d.id, ...(d.data() as MenuItem) }) as MenuRow),
    paused: !!settingsSnap.data()?.paused,
  }
}
