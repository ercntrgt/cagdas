import Link from 'next/link'
import { Button, Card } from '@/components/ui'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <Card className="max-w-md p-8 text-center">
        <h1 className="text-base font-semibold">Sayfa bulunamadı</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Aradığınız sayfa taşınmış veya hiç var olmamış olabilir.
        </p>
        <Link href="/" className="mt-6 inline-block">
          <Button>Gösterge paneline dön</Button>
        </Link>
      </Card>
    </div>
  )
}
