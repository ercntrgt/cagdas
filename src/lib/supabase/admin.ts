import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Yalnızca sunucu tarafı. RLS'i tamamen atlar — sadece admin kontrolünden
 * geçmiş server action'lar içinde kullanılmalıdır. Anahtar asla NEXT_PUBLIC_
 * ile başlamaz, yani istemciye gönderilmez.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY tanımlı değil. Kullanıcı yönetimi için gereklidir.',
    )
  }
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
