'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type AuthState = { error?: string; notice?: string }

/** Supabase'in İngilizce hata mesajlarını Türkçeleştirir. */
function trMessage(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'E-posta veya şifre hatalı.'
  if (m.includes('email not confirmed')) return 'E-posta adresiniz henüz doğrulanmamış.'
  if (m.includes('user already registered') || m.includes('already been registered'))
    return 'Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin.'
  if (m.includes('password should be at least'))
    return 'Şifre en az 6 karakter olmalı.'
  if (m.includes('unable to validate email') || m.includes('invalid email'))
    return 'Geçerli bir e-posta adresi girin.'
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Çok fazla deneme yapıldı. Biraz bekleyip tekrar deneyin.'
  return message
}

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === 'string' ? value : ''
  // Sadece uygulama içi göreli yollara izin ver (açık yönlendirme koruması)
  return next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const next = safeNext(formData.get('next'))

  if (!email || !password) return { error: 'E-posta ve şifre zorunludur.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: trMessage(error.message) }

  revalidatePath('/', 'layout')
  redirect(next)
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const password2 = String(formData.get('password2') ?? '')

  if (!email || !password) return { error: 'E-posta ve şifre zorunludur.' }
  if (password.length < 6) return { error: 'Şifre en az 6 karakter olmalı.' }
  if (password !== password2) return { error: 'Şifreler eşleşmiyor.' }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return { error: trMessage(error.message) }

  // E-posta doğrulaması açıksa oturum açılmaz.
  if (!data.session) {
    return {
      notice: `${email} adresine bir doğrulama bağlantısı gönderildi. Bağlantıya tıkladıktan sonra giriş yapabilirsiniz.`,
    }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/giris')
}
