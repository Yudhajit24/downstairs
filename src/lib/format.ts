export const tokenLabel = (n: number) => `#${String(n).padStart(3, '0')}`
export const rupees = (n: number) => `₹${n}`

/** 'HH:mm' → '8:30 AM' */
export function time12(t: string): string {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

/** 'HH:mm' → '8 AM' (hour heading) */
export function hour12(t: string): string {
  const h = Number(t.split(':')[0])
  return `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`
}

export const SUGAR_TEXT = { regular: 'regular sugar', less: 'less sugar', none: 'no sugar' } as const

export const STATUS_COPY = {
  new: "Order's in. We'll start on it soon.",
  preparing: 'Brewing now.',
  ready: (token: string) => `Come on down! Show ${token} at the counter.`,
  picked_up: 'Enjoy. See you tomorrow?',
} as const
