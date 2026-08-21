'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/components/ui'

export const NAV_ITEMS = [
  { href: '/', label: 'Gösterge Paneli', icon: 'M3 12h4l3 8 4-16 3 8h4' },
  { href: '/islemler', label: 'İşlemler', icon: 'M4 7h16M4 12h16M4 17h10' },
  { href: '/portfoy', label: 'Portföy', icon: 'M3 7h18v12H3zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' },
  { href: '/cuzdan', label: 'Cüzdan', icon: 'M3 7h15a3 3 0 0 1 3 3v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM17 13h.01' },
  { href: '/fiyatlar', label: 'Fiyatlar', icon: 'M3 17l6-6 4 4 8-8' },
  { href: '/raporlar', label: 'Raporlar', icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
] as const

function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px] shrink-0"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="space-y-0.5">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-neutral-900 font-medium text-white dark:bg-white dark:text-neutral-900'
                : 'text-[var(--muted)] hover:bg-black/[0.04] hover:text-[var(--fg)] dark:hover:bg-white/[0.06]',
            )}
          >
            <Icon d={item.icon} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="flex overflow-x-auto border-b border-[var(--border)] bg-[var(--surface)] px-2 lg:hidden">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-xs font-medium transition-colors',
              active
                ? 'border-neutral-900 text-[var(--fg)] dark:border-white'
                : 'border-transparent text-[var(--muted)]',
            )}
          >
            <Icon d={item.icon} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
