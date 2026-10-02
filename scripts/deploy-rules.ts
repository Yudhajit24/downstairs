/** Publishes firestore.rules via the Admin SDK (no firebase-tools needed). Run: npm run deploy-rules */
import { readFileSync } from 'node:fs'
import { getSecurityRules } from 'firebase-admin/security-rules'
import { getApps } from 'firebase-admin/app'
import { adminFirestore } from '../api/_lib/admin.js'

adminFirestore() // initialises the default app from FIREBASE_SERVICE_ACCOUNT_BASE64
const source = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8')
const rules = getSecurityRules(getApps()[0])
await rules.releaseFirestoreRulesetFromSource(source)
const current = await rules.getFirestoreRuleset()
console.log(`Published Firestore rules (ruleset ${current.name.split('/').pop()}, created ${current.createTime}).`)
