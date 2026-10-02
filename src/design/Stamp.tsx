import clsx from 'clsx'

/** Rubber-stamp text, rotated -8deg. Decorative: pair with a text equivalent for AT. */
export function Stamp({ children = 'SOLD OUT', className }: { children?: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={clsx(
        'inline-block rounded-md border-[3px] border-tomato px-2 py-0.5',
        'font-display text-small tracking-wider text-tomato select-none pointer-events-none',
        'animate-[stamp-in_220ms_cubic-bezier(.3,1.6,.5,1)_both]',
        className,
      )}
    >
      {children}
    </span>
  )
}
