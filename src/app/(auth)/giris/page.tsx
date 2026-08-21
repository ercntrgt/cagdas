import { Suspense } from 'react'
import Link from 'next/link'
import SignInForm from './form'

export const metadata = { title: 'Giriş yap · BIST Portföy' }

export default function GirisPage() {
  return (
    <>
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        Hesabınız yok mu?{' '}
        <Link href="/kayit" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
          Kayıt olun
        </Link>
      </p>
    </>
  )
}
