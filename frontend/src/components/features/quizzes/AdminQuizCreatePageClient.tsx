'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAdminQuizzes } from '@/hooks/useAdminQuizzes'
import type { AdminQuizMutationPayload } from '@/types/quiz.types'
import { AdminQuizForm } from './AdminQuizForm'

type AdminQuizCreatePageClientProps = {
  locale: string
}

export function AdminQuizCreatePageClient({ locale }: AdminQuizCreatePageClientProps) {
  const t = useTranslations('adminQuizzes')
  const router = useRouter()
  const { isMutating, mutationErrorKey, submitCreate } = useAdminQuizzes()

  const handleSubmit = async (payload: AdminQuizMutationPayload) => {
    const created = await submitCreate(payload)
    if (created) {
      router.push(`/${locale}/admin/quizzes/${created.id}`)
    }
  }

  return (
    <section className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{t('createTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('createSubtitle')}</p>
        <p className="text-xs text-muted-foreground">
          <Link className="underline" href={`/${locale}/admin/quizzes`}>
            {t('backToList')}
          </Link>
        </p>
      </header>

      {mutationErrorKey ? <p className="text-sm text-destructive">{t(mutationErrorKey as Parameters<typeof t>[0])}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('createCardTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminQuizForm
            isSubmitting={isMutating}
            mode="create"
            onSubmit={handleSubmit}
            submitLabel={t('actions.create')}
          />
        </CardContent>
      </Card>
    </section>
  )
}
