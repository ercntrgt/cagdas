'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidUsername, normalizeUsername, usernameToEmail } from '@/lib/username'

export type AuthState = { error?: string; notice?: string }

/** Supabase'in İngilizce hata mesajlarını Türkçeleştirir. */
function trMessage(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Kullanıcı adı veya şifre hatalı.'
  if (m.includes('email not confirmed')) return 'Bu hesap henüz etkinleştirilmemiş.'
  if (m.includes('already been registered') || m.includes('already exists'))
    return 'Bu kullanıcı adı zaten kayıtlı.'
  if (m.includes('password should be at least')) return 'Şifre en az 6 karakter olmalı.'
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Çok fazla deneme yapıldı. Biraz bekleyip tekrar deneyin.'
  return message
}

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === 'string' ? value : ''
  // Sadece uygulama içi göreli yollara izin ver (açık yönlendirme koruması)
  return next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

/* ======================================================================= Giriş */

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const username = normalizeUsername(String(formData.get('username') ?? ''))
  const password = String(formData.get('password') ?? '')
  const next = safeNext(formData.get('next'))

  if (!username || !password) return { error: 'Kullanıcı adı ve şifre zorunludur.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  })
  if (error) return { error: trMessage(error.message) }

  revalidatePath('/', 'layout')
  redirect(next)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/giris')
}

/* ========================================================= Kullanıcı yönetimi */

/** Oturumdaki kullanıcının admin olup olmadığını veritabanından doğrular. */
async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum bulunamadı.' as const }

  const { data } = await supabase.rpc('is_admin')
  if (data !== true) return { error: 'Bu işlem için yönetici yetkisi gerekiyor.' as const }

  return { userId: user.id }
}

export async function createUser(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const guard = await requireAdmin()
  if ('error' in guard) return { error: guard.error }

  const username = normalizeUsername(String(formData.get('username') ?? ''))
  const password = String(formData.get('password') ?? '')
  const isAdmin = formData.get('is_admin') === 'on'

  if (!isValidUsername(username))
    return { error: 'Kullanıcı adı 3-32 karakter olmalı; küçük harf, rakam ve alt çizgi.' }
  if (password.length < 8) return { error: 'Şifre en az 8 karakter olmalı.' }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.createUser({
    email: usernameToEmail(username),
    password,
    email_confirm: true, // e-posta gönderilmez, hesap doğrudan aktif
    user_metadata: { username, is_admin: isAdmin },
  })
  if (error) return { error: trMessage(error.message) }

  revalidatePath('/kullanicilar')
  return { notice: `"${username}" kullanıcısı oluşturuldu.` }
}

export async function changePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const guard = await requireAdmin()
  if ('error' in guard) return { error: guard.error }

  const userId = String(formData.get('user_id') ?? '')
  const password = String(formData.get('password') ?? '')
  if (!userId) return { error: 'Kullanıcı bulunamadı.' }
  if (password.length < 8) return { error: 'Şifre en az 8 karakter olmalı.' }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, { password })
  if (error) return { error: trMessage(error.message) }

  revalidatePath('/kullanicilar')
  return { notice: 'Şifre güncellendi.' }
}

export async function deleteUser(formData: FormData): Promise<void> {
  const guard = await requireAdmin()
  if ('error' in guard) throw new Error(guard.error)

  const userId = String(formData.get('user_id') ?? '')
  if (!userId) throw new Error('Kullanıcı bulunamadı.')
  if (userId === guard.userId) throw new Error('Kendi hesabınızı silemezsiniz.')

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) throw new Error(trMessage(error.message))

  revalidatePath('/kullanicilar')
}
