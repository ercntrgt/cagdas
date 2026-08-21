import { Card, cn } from '@/components/ui'

export function Kpi({
  label,
  value,
  hint,
  tone,
  className,
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  tone?: 'profit' | 'loss' | 'neutral'
  className?: string
}) {
  return (
    <Card className={cn('p-4', className)}>
      <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
      <p
        className={cn(
          'tnum mt-1.5 text-xl font-semibold',
          tone === 'profit' && 'text-emerald-600 dark:text-emerald-400',
          tone === 'loss' && 'text-rose-600 dark:text-rose-400',
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p> : null}
    </Card>
  )
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}
