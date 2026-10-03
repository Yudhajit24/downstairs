import { getAuth, onAuthStateChanged, signInWithCustomToken, signOut } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { api, ApiClientError, type KitchenActionBody } from '../lib/api'
import { app } from '../lib/firebase'

// Auth is only needed by the kitchen, so it lives here and stays out of the customer bundle.
const auth = getAuth(app)

export type StaffState = 'loading' | 'out' | 'in'

/** Signed in AND carrying the staff claim. */
export function useStaff(): StaffState {
  const [state, setState] = useState<StaffState>('loading')
  useEffect(() => onAuthStateChanged(auth, async (user) => {
    if (!user) return setState('out')
    const t = await user.getIdTokenResult()
    setState(t.claims.staff === true ? 'in' : 'out')
  }), [])
  return state
}

export async function unlock(pin: string) {
  const { token } = await api.kitchenSession(pin)
  await signInWithCustomToken(auth, token)
}

export const lock = () => signOut(auth)

/** Calls a staff action. A 401 drops the session back to the PIN gate. */
export async function kitchenAction(action: KitchenActionBody) {
  const user = auth.currentUser
  if (!user) throw new ApiClientError('UNAUTHORIZED', 'Kitchen sign-in required.', 401)
  try {
    return await api.kitchenAction(await user.getIdToken(), action)
  } catch (e) {
    if (e instanceof ApiClientError && e.code === 'UNAUTHORIZED') void lock()
    throw e
  }
}

/** AI briefing of today's live orders. Same sign-in handling as actions. */
export async function kitchenBrief() {
  const user = auth.currentUser
  if (!user) throw new ApiClientError('UNAUTHORIZED', 'Kitchen sign-in required.', 401)
  try {
    return await api.kitchenBrief(await user.getIdToken())
  } catch (e) {
    if (e instanceof ApiClientError && e.code === 'UNAUTHORIZED') void lock()
    throw e
  }
}
