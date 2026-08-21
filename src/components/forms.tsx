'use client'

import Link from 'next/link'
import { useFormStatus } from 'react-dom'
import { Button, cn } from '@/components/ui'

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

export function EditLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      title="Düzenle"
      aria-label="Düzenle"
      className={cn(
        'inline-flex h-8 w-9 items-center justify-center rounded-lg text-[var(--muted)] transition-colors',
        'hover:bg-black/[0.04] hover:text-blue-600 dark:hover:bg-white/[0.06] dark:hover:text-blue-400',
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
      </svg>
    </Link>
  )
}
