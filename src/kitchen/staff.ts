import { onAuthStateChanged, signInWithCustomToken, signOut } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { api, ApiClientError, type KitchenActionBody } from '../lib/api'
import { auth } from '../lib/firebase'

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
