import { Logo } from '@/components/logo'
import { APP_DESCRIPTION, APP_NAME } from '@/lib/brand'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo size={88} className="mx-auto mb-4 shadow-sm" />
          <h1 className="text-xl font-semibold">{APP_NAME}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{APP_DESCRIPTION}</p>
        </div>
        {children}
      </div>
    </div>
  )
}
