/** Today's customer ratings: how many, and the average to one decimal. null average when nobody has rated yet. */
export function ratingSummary(orders: { rating?: number | null }[]): { count: number; average: number | null } {
  const r = orders.map((o) => o.rating).filter((n): n is number => typeof n === 'number' && n >= 1 && n <= 5)
  if (r.length === 0) return { count: 0, average: null }
  return { count: r.length, average: Math.round((r.reduce((a, b) => a + b, 0) / r.length) * 10) / 10 }
}
