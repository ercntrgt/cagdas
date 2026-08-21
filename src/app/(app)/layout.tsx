import Link from 'next/link'
import { requireUser } from '@/lib/supabase/server'
import { signOut } from '@/lib/actions/auth'
import { MobileNav, SidebarNav } from '@/components/nav'
import { Button } from '@/components/ui'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser()

  return (
    <div className="lg:flex">
      {/* Masaüstü kenar çubuğu */}
      <aside className="hidden w-60 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-sm font-bold text-white dark:bg-white dark:text-neutral-900">
            ₺
          </span>
          <span className="text-sm font-semibold">BIST Portföy</span>
        </div>

        <div className="flex-1 px-3">
          <SidebarNav />
        </div>

        <div className="border-t border-[var(--border)] p-3">
          <p className="truncate px-2 pb-2 text-xs text-[var(--muted)]" title={user.email}>
            {user.email}
          </p>
          <form action={signOut}>
            <Button type="submit" variant="secondary" size="sm" className="w-full">
              Çıkış yap
            </Button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Mobil başlık */}
        <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 lg:hidden">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-xs font-bold text-white dark:bg-white dark:text-neutral-900">
              ₺
            </span>
            BIST Portföy
          </Link>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              Çıkış
            </Button>
          </form>
        </header>
        <MobileNav />

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  )
}
