import clsx from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'tomato' | 'ghost'
type Size = 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-paper-raised border-ink press',
  secondary: 'bg-paper-raised text-ink border-ink press',
  tomato: 'bg-tomato text-ink-deep border-ink-deep press',
  ghost: 'bg-transparent text-ink border-transparent underline underline-offset-4',
}

export function Button({
  variant = 'primary', size = 'md', block, className, children, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; block?: boolean }) {
  return (
    <button
      {...rest}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-btn border-2 px-5 font-bold tnum cursor-pointer',
        'disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none',
        size === 'lg' ? 'min-h-14 text-body' : 'min-h-11 text-small',
        block && 'w-full',
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  )
}
