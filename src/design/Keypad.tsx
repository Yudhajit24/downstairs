import clsx from 'clsx'

/** Large numeric keypad for the kitchen PIN gate. Sits on cobalt. */
export function Keypad({
  value, onChange, length = 4, onSubmit, error,
}: { value: string; onChange: (v: string) => void; length?: number; onSubmit?: (v: string) => void; error?: boolean }) {
  const press = (d: string) => {
    if (value.length >= length) return
    const next = value + d
    onChange(next)
    if (next.length === length) onSubmit?.(next)
  }
  const key = 'grid h-16 place-items-center rounded-btn border-2 border-paper bg-ink text-paper-raised font-display text-display-m cursor-pointer'
  return (
    <div className="mx-auto w-full max-w-[300px]">
      <div className={clsx('mb-6 flex justify-center gap-3', error && 'animate-[shake_300ms]')} role="status" aria-label={`${value.length} of ${length} digits entered`}>
        {Array.from({ length }, (_, i) => (
          <span key={i} className={clsx('size-4 rounded-full border-2 border-paper', i < value.length && 'bg-paper')} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" className={clsx(key, 'active:translate-x-0.5 active:translate-y-0.5')} onClick={() => press(d)}>{d}</button>
        ))}
        <button type="button" className={clsx(key, '!font-sans !text-body font-bold')} onClick={() => onChange('')}>Clear</button>
        <button type="button" className={key} onClick={() => press('0')}>0</button>
        <button type="button" className={clsx(key, '!font-sans !text-body font-bold')} onClick={() => onChange(value.slice(0, -1))}>Delete</button>
      </div>
    </div>
  )
}
