export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 text-sm font-bold text-white dark:bg-white dark:text-neutral-900">
            ₺
          </div>
          <h1 className="text-lg font-semibold">BIST Portföy</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Hisse portföyü, cüzdan ve kâr/zarar takibi
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
