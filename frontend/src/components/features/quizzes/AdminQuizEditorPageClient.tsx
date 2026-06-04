'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAdminQuizzes } from '@/hooks/useAdminQuizzes'
import type { AdminQuizMutationPayload } from '@/types/quiz.types'
import { AdminQuizForm } from './AdminQuizForm'
import { AdminQuizQuestionsTab } from './admin/AdminQuizQuestionsTab'

type AdminQuizEditorPageClientProps = {
  locale: string
  quizId: number
}

export function AdminQuizEditorPageClient({ locale, quizId }: AdminQuizEditorPageClientProps) {
  const t = useTranslations('adminQuizzes')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const {
    detailState,
    taxonomyState,
    isMutating,
    mutationErrorKey,
    loadDetail,
    loadTaxonomies,
    submitUpdate,
  } = useAdminQuizzes()

  useEffect(() => {
    void loadDetail(quizId)
    void loadTaxonomies()
  }, [loadDetail, loadTaxonomies, quizId])

  const handleSubmit = async (payload: AdminQuizMutationPayload) => {
    const ok = await submitUpdate(quizId, payload)
    setSaveSuccess(ok)
  }

  return (
    <section className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{t('editTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('editSubtitle')}</p>
        <Link className="text-xs underline" href={`/${locale}/admin/quizzes`}>
          {t('backToList')}
        </Link>
      </header>

      {detailState.errorMessageKey ? (
        <p className="text-sm text-destructive">{t(detailState.errorMessageKey as Parameters<typeof t>[0])}</p>
      ) : null}
      {mutationErrorKey ? <p className="text-sm text-destructive">{t(mutationErrorKey as Parameters<typeof t>[0])}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>{detailState.data ? detailState.data.title : t('editCardTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {detailState.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : detailState.data ? (
            <Tabs defaultValue="metadata" className="space-y-4">
              <TabsList>
                <TabsTrigger value="metadata">{t('tabs.metadata')}</TabsTrigger>
                <TabsTrigger value="questions">{t('tabs.questions')}</TabsTrigger>
              </TabsList>
              <TabsContent value="metadata" className="space-y-4">
                {saveSuccess ? <p className="text-sm text-green-700">{t('status.saveSuccess')}</p> : null}
                <AdminQuizForm
                  initialQuiz={detailState.data}
                  categories={taxonomyState.categories}
                  tags={taxonomyState.tags}
                  isSubmitting={isMutating}
                  mode="edit"
                  onSubmit={handleSubmit}
                  submitLabel={t('actions.save')}
                />
              </TabsContent>
              <TabsContent value="questions" className="space-y-4">
                <AdminQuizQuestionsTab quizId={quizId} />
              </TabsContent>
            </Tabs>
          ) : (
            <p className="text-sm text-muted-foreground">{t('empty.noQuizSelected')}</p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
