'use client'

import { useActionState } from 'react'
import { changePassword, type AuthState } from '@/lib/actions/auth'
import { SubmitButton } from '@/components/forms'
import { FormError, FormSuccess, Input } from '@/components/ui'

export default function PasswordForm({ userId }: { userId: string }) {
  const [state, action] = useActionState<AuthState, FormData>(changePassword, {})

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="user_id" value={userId} />
      <Input
        name="password"
        type="text"
        minLength={8}
        required
        placeholder="Yeni şifre"
        className="h-8 w-40 text-xs"
        aria-label="Yeni şifre"
      />
      <SubmitButton size="sm" variant="secondary" pendingText="…">
        Değiştir
      </SubmitButton>
      <FormError>{state.error}</FormError>
      <FormSuccess>{state.notice}</FormSuccess>
    </form>
  )
}
