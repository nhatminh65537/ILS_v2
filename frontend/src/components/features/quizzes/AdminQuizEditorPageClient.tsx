'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminQuizzes } from '@/hooks/useAdminQuizzes'
import type { AdminQuizMutationPayload } from '@/types/quiz.types'
import { AdminQuizForm } from './AdminQuizForm'

type AdminQuizEditorPageClientProps = {
  locale: string
  quizId: number
}

export function AdminQuizEditorPageClient({ locale, quizId }: AdminQuizEditorPageClientProps) {
  const t = useTranslations('adminQuizzes')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const {
    detailState,
    isMutating,
    mutationErrorKey,
    loadDetail,
    submitUpdate,
  } = useAdminQuizzes()

  useEffect(() => {
    void loadDetail(quizId)
  }, [loadDetail, quizId])

  const handleSubmit = async (payload: AdminQuizMutationPayload) => {
    const ok = await submitUpdate(quizId, payload)
    setSaveSuccess(ok)
  }

  return (
    <section className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{t('editTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('editSubtitle')}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Link className="underline" href={`/${locale}/admin/quizzes`}>
            {t('backToList')}
          </Link>
          <Link className="underline" href={`/${locale}/admin/quizzes/${quizId}/questions`}>
            {t('actions.manageQuestions')}
          </Link>
        </div>
      </header>

      {detailState.errorMessageKey ? (
        <p className="text-sm text-destructive">{t(detailState.errorMessageKey as Parameters<typeof t>[0])}</p>
      ) : null}
      {mutationErrorKey ? <p className="text-sm text-destructive">{t(mutationErrorKey as Parameters<typeof t>[0])}</p> : null}
      {saveSuccess ? <p className="text-sm text-green-700">{t('status.saveSuccess')}</p> : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('editCardTitle')}</CardTitle>
          <Button asChild size="sm" variant="outline">
            <Link href={`/${locale}/admin/quizzes/${quizId}/questions`}>
              {t('actions.manageQuestions')}
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {detailState.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : detailState.data ? (
            <AdminQuizForm
              initialQuiz={detailState.data}
              isSubmitting={isMutating}
              mode="edit"
              onSubmit={handleSubmit}
              submitLabel={t('actions.save')}
            />
          ) : (
            <p className="text-sm text-muted-foreground">{t('empty.noQuizSelected')}</p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
