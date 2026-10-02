/**
 * Writes the menu and settings/cafe (forceOpen: true) to Firestore.
 * Overwrites menu docs, so stock goes back to seed values. Run: npm run seed
 * Needs FIREBASE_SERVICE_ACCOUNT_BASE64 (see .env.example).
 */
import { adminFirestore } from '../api/_lib/admin.js'
import { DEFAULT_SETTINGS } from '../shared/constants.js'
import { MENU_SEED } from '../shared/menu-seed.js'

const db = adminFirestore()
const batch = db.batch()
batch.set(db.doc('settings/cafe'), DEFAULT_SETTINGS)
for (const [id, item] of Object.entries(MENU_SEED)) batch.set(db.doc(`menu/${id}`), item)
await batch.commit()
console.log(`Seeded settings/cafe (forceOpen: ${DEFAULT_SETTINGS.forceOpen}) and ${Object.keys(MENU_SEED).length} menu items.`)
