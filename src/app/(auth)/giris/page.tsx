import { Suspense } from 'react'
import SignInForm from './form'

export const metadata = { title: 'Giriş yap' }

export default function GirisPage() {
  return (
    <>
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
      <p className="mt-6 text-center text-xs text-[var(--muted)]">
        Hesabınız yoksa yöneticinizden bir kullanıcı açmasını isteyin.
      </p>
    </>
  )
}
