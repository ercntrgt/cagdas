'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useSearchParams } from 'next/navigation'
import { signIn, type AuthState } from '@/lib/actions/auth'
import { Button, Card, Field, FormError, Input } from '@/components/ui'

function Submit() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Giriş yapılıyor…' : 'Giriş yap'}
    </Button>
  )
}

export default function SignInForm() {
  const [state, action] = useActionState<AuthState, FormData>(signIn, {})
  const params = useSearchParams()
  const next = params.get('next') ?? '/'
  const linkError = params.get('hata')

  return (
    <Card className="p-6">
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <FormError>{state.error ?? linkError}</FormError>

        <Field label="Kullanıcı adı">
          <Input
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            placeholder="kullaniciadi"
          />
        </Field>

        <Field label="Şifre">
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>

        <Submit />
      </form>
    </Card>
  )
}
