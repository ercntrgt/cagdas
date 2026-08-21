/**
 * Uygulama e-posta kullanmaz; Supabase Auth'un e-posta gerektirmesi nedeniyle
 * her kullanıcı adı sabit bir iç adrese eşlenir. Bu adrese posta gönderilmez.
 */
export const USER_DOMAIN = 'cagdas.local'

export const USERNAME_PATTERN = '^[a-z0-9_]{3,32}$'
const RE = new RegExp(USERNAME_PATTERN)

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase()
}

export function isValidUsername(username: string): boolean {
  return RE.test(username)
}

export function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}@${USER_DOMAIN}`
}

export function emailToUsername(email: string | null | undefined): string {
  return (email ?? '').split('@')[0]
}

export const USERNAME_HINT = '3-32 karakter; küçük harf, rakam ve alt çizgi'
