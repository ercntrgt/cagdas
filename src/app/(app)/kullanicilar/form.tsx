'use client'

import { useActionState, useEffect, useRef } from 'react'
import { createUser, type AuthState } from '@/lib/actions/auth'
import { SubmitButton } from '@/components/forms'
import { Card, CardHeader, Field, FormError, FormSuccess, Input } from '@/components/ui'
import { USERNAME_HINT } from '@/lib/username'

export default function NewUserForm() {
  const [state, action] = useActionState<AuthState, FormData>(createUser, {})
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.notice) formRef.current?.reset()
  }, [state.notice])

  return (
    <Card>
      <CardHeader
        title="Yeni kullanıcı"
        description="Oluşturulan hesap anında kullanılabilir; e-posta doğrulaması istenmez."
      />
      <form ref={formRef} action={action} className="space-y-4 p-5">
        <FormError>{state.error}</FormError>
        <FormSuccess>{state.notice}</FormSuccess>

        <Field label="Kullanıcı adı" hint={USERNAME_HINT}>
          <Input
            name="username"
            required
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="yenikullanici"
          />
        </Field>

        <Field label="Şifre" hint="En az 8 karakter">
          <Input name="password" type="text" required minLength={8} autoComplete="new-password" />
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_admin" className="h-4 w-4 rounded" />
          Yönetici yetkisi ver
          <span className="text-xs text-[var(--muted)]">(kullanıcı açıp silebilir)</span>
        </label>

        <SubmitButton pendingText="Oluşturuluyor…">Kullanıcı oluştur</SubmitButton>
      </form>
    </Card>
  )
}
