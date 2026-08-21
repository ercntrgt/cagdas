'use client'

import { Button, Card } from '@/components/ui'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <Card className="max-w-md p-8 text-center">
        <h1 className="text-base font-semibold">Bir şeyler ters gitti</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {error.message || 'Beklenmeyen bir hata oluştu.'}
        </p>
        <Button className="mt-6" onClick={reset}>
          Tekrar dene
        </Button>
      </Card>
    </div>
  )
}
