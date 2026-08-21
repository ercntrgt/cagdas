import type { ComponentProps, ReactNode } from 'react'

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

/* -------------------------------------------------------------------- Card */

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-[var(--muted)]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

/* ------------------------------------------------------------------ Button */

const BUTTON_VARIANTS = {
  primary:
    'bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200',
  secondary:
    'border border-[var(--border)] bg-[var(--surface)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
  danger:
    'border border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40',
  ghost: 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
} as const

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ComponentProps<'button'> & {
  variant?: keyof typeof BUTTON_VARIANTS
  size?: 'sm' | 'md'
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm',
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...props}
    />
  )
}

/* ------------------------------------------------------------------- Field */

export const inputClass = cn(
  'h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm',
  'placeholder:text-[var(--muted)]',
  'focus:border-blue-500 focus:outline-2 focus:outline-offset-0 focus:outline-blue-500/30',
  'disabled:opacity-60',
)

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string
  hint?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-xs font-medium text-[var(--muted)]">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-[var(--muted)]">{hint}</span> : null}
    </label>
  )
}

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(inputClass, className)} {...props} />
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(inputClass, 'pr-8', className)} {...props} />
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(inputClass, 'h-auto min-h-20 resize-y py-2', className)}
      {...props}
    />
  )
}

/* ------------------------------------------------------------------- Table */

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full min-w-max text-sm', className)} {...props} />
    </div>
  )
}

export function Th({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'whitespace-nowrap border-b border-[var(--border)] px-4 py-2.5 text-left text-xs font-medium text-[var(--muted)]',
        className,
      )}
      {...props}
    />
  )
}

export function Td({ className, ...props }: ComponentProps<'td'>) {
  return (
    <td
      className={cn(
        'whitespace-nowrap border-b border-[var(--border)] px-4 py-3',
        className,
      )}
      {...props}
    />
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="px-5 py-12 text-center text-sm text-[var(--muted)]">{children}</div>
  )
}

/* ------------------------------------------------------------------- Badge */

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'buy' | 'sell' | 'in' | 'out'
  children: ReactNode
}) {
  const tones = {
    neutral: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
    buy: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
    sell: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    in: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    out: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  } as const
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}

/* ------------------------------------------------------------- Form durumu */

export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null
  return (
    <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
      {children}
    </p>
  )
}

export function FormSuccess({ children }: { children?: ReactNode }) {
  if (!children) return null
  return (
    <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
      {children}
    </p>
  )
}
