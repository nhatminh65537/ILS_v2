'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAdminLearnCourses } from '@/hooks/useAdminLearnCourses'
import type { AdminLearnCourseMutationPayload } from '@/types/course.types'
import { AdminLearnCourseForm } from './AdminLearnCourseForm'

type AdminLearnCourseCreatePageClientProps = {
  locale: string
}

export function AdminLearnCourseCreatePageClient({ locale }: AdminLearnCourseCreatePageClientProps) {
  const t = useTranslations('adminLearn')
  const router = useRouter()
  const {
    taxonomyState,
    isMutating,
    mutationErrorKey,
    loadTaxonomies,
    submitCreateCourse,
  } = useAdminLearnCourses()

  useEffect(() => {
    void loadTaxonomies()
  }, [loadTaxonomies])

  const handleSubmit = async (payload: AdminLearnCourseMutationPayload) => {
    const created = await submitCreateCourse(payload)
    if (created?.slug) {
      router.push(`/${locale}/admin/learn/courses/${created.slug}`)
    }
  }

  return (
    <section className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{t('create.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('create.subtitle')}</p>
        <Link className="text-xs underline" href={`/${locale}/admin/learn/courses`}>
          {t('navigation.backToList')}
        </Link>
      </header>

      {mutationErrorKey ? <p className="text-sm text-destructive">{t(mutationErrorKey as never)}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('create.formTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminLearnCourseForm
            mode="create"
            categories={taxonomyState.categories}
            tags={taxonomyState.tags}
            isSubmitting={isMutating}
            submitLabel={t('actions.createCourse')}
            onSubmit={handleSubmit}
          />
        </CardContent>
      </Card>
    </section>
  )
}
