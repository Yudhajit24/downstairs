/** FSSAI-style mark: veg = green square + circle, non-veg = brown square + triangle. */
export function VegMark({ veg, size = 16 }: { veg: boolean; size?: number }) {
  const c = veg ? 'var(--leaf)' : 'var(--nonveg)'
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" role="img" aria-label={veg ? 'Vegetarian' : 'Non-vegetarian'}>
      <rect x="1" y="1" width="14" height="14" rx="2" fill="none" stroke={c} strokeWidth="1.8" />
      {veg ? <circle cx="8" cy="8" r="3.6" fill={c} /> : <path d="M8 4l4 7.4H4z" fill={c} />}
    </svg>
  )
}
