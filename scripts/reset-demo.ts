/**
 * Puts Firestore back to the demo start state: settings + menu reseeded, and every order,
 * slot and counter deleted. DESTRUCTIVE. Run: npm run reset-demo
 */
import { adminFirestore } from '../api/_lib/admin.js'
import { DEFAULT_SETTINGS } from '../shared/constants.js'
import { MENU_SEED } from '../shared/menu-seed.js'

const fs = adminFirestore()
const b = fs.batch()
b.set(fs.doc('settings/cafe'), DEFAULT_SETTINGS)
for (const [k, v] of Object.entries(MENU_SEED)) b.set(fs.doc(`menu/${k}`), v)
for (const col of ['orders', 'slots', 'counters', 'templates']) (await fs.collection(col).get()).docs.forEach((d) => b.delete(d.ref))
await b.commit()
console.log('Reset: settings + menu reseeded; orders, slots and counters cleared.')
