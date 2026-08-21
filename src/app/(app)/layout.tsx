import Link from 'next/link'
import { requireUser } from '@/lib/supabase/server'
import { emailToUsername } from '@/lib/username'
import { signOut } from '@/lib/actions/auth'
import { MobileNav, SidebarNav } from '@/components/nav'
import { Button } from '@/components/ui'
import { Logo } from '@/components/logo'
import { LogoEasterEgg } from '@/components/easter-egg'
import { APP_NAME } from '@/lib/brand'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser()
  const { data: isAdmin } = await supabase.rpc('is_admin')
  const username = emailToUsername(user.email)

  return (
    <div className="lg:flex">
      {/* Masaüstü kenar çubuğu */}
      <aside className="hidden w-60 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <div className="flex items-center gap-3 px-4 py-5">
          <LogoEasterEgg>
            <Logo size={52} />
          </LogoEasterEgg>
          <span className="text-sm font-semibold leading-tight">{APP_NAME}</span>
        </div>

        <div className="flex-1 px-3">
          <SidebarNav isAdmin={isAdmin === true} />
        </div>

        <div className="border-t border-[var(--border)] p-3">
          <div className="flex items-center gap-1.5 px-2 pb-2">
            <p className="truncate text-xs font-medium text-[var(--muted)]" title={username}>
              {username}
            </p>
            {isAdmin === true ? (
              <span className="rounded bg-black/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)] dark:bg-white/[0.08]">
                yönetici
              </span>
            ) : null}
          </div>
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
          <div className="flex items-center gap-2.5">
            <LogoEasterEgg>
              <Logo size={40} />
            </LogoEasterEgg>
            <Link href="/" className="text-sm font-semibold">
              {APP_NAME}
            </Link>
          </div>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              Çıkış
            </Button>
          </form>
        </header>
        <MobileNav isAdmin={isAdmin === true} />

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  )
}
