import Link from 'next/link'
import SignUpForm from './form'

export const metadata = { title: 'Kayıt ol · BIST Portföy' }

export default function KayitPage() {
  return (
    <>
      <SignUpForm />
      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        Zaten hesabınız var mı?{' '}
        <Link href="/giris" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
          Giriş yapın
        </Link>
      </p>
    </>
  )
}
