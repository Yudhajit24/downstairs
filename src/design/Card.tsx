import clsx from 'clsx'
import type { HTMLAttributes } from 'react'

export function Card({
  raised, className, ...rest
}: HTMLAttributes<HTMLDivElement> & { raised?: boolean }) {
  return (
    <div
      {...rest}
      className={clsx(
        'rounded-card border-2 border-ink bg-paper-raised p-4',
        raised && 'shadow-hard',
        className,
      )}
    />
  )
}
