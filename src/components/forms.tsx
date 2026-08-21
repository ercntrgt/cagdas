'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui'

export function SubmitButton({
  children,
  pendingText,
  variant = 'primary',
  size = 'md',
  className,
}: {
  children: React.ReactNode
  pendingText?: string
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
  className?: string
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant={variant} size={size} className={className} disabled={pending}>
      {pending && pendingText ? pendingText : children}
    </Button>
  )
}

export function DeleteButton({ confirmText }: { confirmText: string }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      variant="ghost"
      size="sm"
      disabled={pending}
      title="Sil"
      aria-label="Sil"
      className="text-[var(--muted)] hover:text-rose-600 dark:hover:text-rose-400"
      onClick={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault()
      }}
    >
      {pending ? (
        '…'
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
        </svg>
      )}
    </Button>
  )
}
