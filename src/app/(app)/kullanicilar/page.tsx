import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/supabase/server'
import { deleteUser } from '@/lib/actions/auth'
import { PageHeader } from '@/components/kpi'
import { DeleteButton } from '@/components/forms'
import { Badge, Card, CardHeader, Empty, Table, Td, Th } from '@/components/ui'
import { date } from '@/lib/format'
import NewUserForm from './form'
import PasswordForm from './password-form'

export const metadata = { title: 'Kullanıcılar · BIST Portföy' }

type Profile = {
  id: string
  username: string
  is_admin: boolean
  created_at: string
}

export default async function KullanicilarPage() {
  const { supabase, user } = await requireUser()

  const { data: isAdmin } = await supabase.rpc('is_admin')
  if (isAdmin !== true) notFound()

  const { data } = await supabase
    .from('profiles')
    .select('id,username,is_admin,created_at')
    .order('created_at')

  const profiles = (data ?? []) as Profile[]

  return (
    <>
      <PageHeader
        title="Kullanıcılar"
        description="Bu sayfayı yalnızca yöneticiler görür. Her kullanıcının portföyü kendisine özeldir; kimse başkasının verisini göremez."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <NewUserForm />

        <Card className="overflow-hidden">
          <CardHeader title="Hesaplar" description={`${profiles.length} kullanıcı`} />
          {profiles.length === 0 ? (
            <Empty>Kayıtlı kullanıcı yok.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Kullanıcı adı</Th>
                  <Th>Yetki</Th>
                  <Th>Oluşturulma</Th>
                  <Th>Şifre sıfırla</Th>
                  <Th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => {
                  const isSelf = p.id === user.id
                  return (
                    <tr key={p.id}>
                      <Td className="font-semibold">
                        {p.username}
                        {isSelf ? (
                          <span className="ml-2 text-xs font-normal text-[var(--muted)]">
                            (siz)
                          </span>
                        ) : null}
                      </Td>
                      <Td>
                        {p.is_admin ? (
                          <Badge tone="in">Yönetici</Badge>
                        ) : (
                          <Badge>Kullanıcı</Badge>
                        )}
                      </Td>
                      <Td className="tnum text-[var(--muted)]">{date(p.created_at)}</Td>
                      <Td>
                        <PasswordForm userId={p.id} />
                      </Td>
                      <Td>
                        {isSelf ? (
                          <span className="px-2 text-xs text-[var(--muted)]">—</span>
                        ) : (
                          <form action={deleteUser}>
                            <input type="hidden" name="user_id" value={p.id} />
                            <DeleteButton
                              confirmText={`"${p.username}" kullanıcısı ve TÜM portföy verisi kalıcı olarak silinsin mi? Bu işlem geri alınamaz.`}
                            />
                          </form>
                        )}
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  )
}
