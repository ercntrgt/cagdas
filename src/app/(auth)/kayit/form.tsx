'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { signUp, type AuthState } from '@/lib/actions/auth'
import { Button, Card, Field, FormError, FormSuccess, Input } from '@/components/ui'

function Submit() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Hesap oluşturuluyor…' : 'Hesap oluştur'}
    </Button>
  )
}

export default function SignUpForm() {
  const [state, action] = useActionState<AuthState, FormData>(signUp, {})

  return (
    <Card className="p-6">
      <form action={action} className="space-y-4">
        <FormError>{state.error}</FormError>
        <FormSuccess>{state.notice}</FormSuccess>

        <Field label="E-posta">
          <Input
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="ornek@eposta.com"
          />
        </Field>

        <Field label="Şifre" hint="En az 6 karakter">
          <Input name="password" type="password" autoComplete="new-password" required minLength={6} />
        </Field>

        <Field label="Şifre (tekrar)">
          <Input name="password2" type="password" autoComplete="new-password" required minLength={6} />
        </Field>

        <Submit />
      </form>
    </Card>
  )
}
