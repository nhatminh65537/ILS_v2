'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAdminLearnCourses } from '@/hooks/useAdminLearnCourses'
import { AdminLearnMetadataTab } from './AdminLearnMetadataTab'
import { AdminLearnTreeTab } from './AdminLearnTreeTab'

type AdminLearnCourseEditorPageClientProps = {
  locale: string
  slug: string
}

export function AdminLearnCourseEditorPageClient({ locale, slug }: AdminLearnCourseEditorPageClientProps) {
  const t = useTranslations('adminLearn')
  const {
    detailState,
    taxonomyState,
    isMutating,
    mutationErrorKey,
    loadCourseDetail,
    loadTaxonomies,
    submitUpdateCourse,
  } = useAdminLearnCourses()

  useEffect(() => {
    void loadCourseDetail(slug)
    void loadTaxonomies()
  }, [loadCourseDetail, loadTaxonomies, slug])

  return (
    <section className="space-y-6 p-6">
      <header className="space-y-2">
        <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Link className="hover:text-foreground hover:underline" href={`/${locale}/admin/learn/courses`}>
            {t('navigation.backToList')}
          </Link>
          <span>/</span>
          <span className="text-foreground">{detailState.data?.title ?? t('editor.title')}</span>
        </nav>
        <h1 className="text-3xl font-semibold">{t('editor.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('editor.subtitle')}</p>
      </header>

      {detailState.errorMessageKey ? <p className="text-sm text-destructive">{t(detailState.errorMessageKey as never)}</p> : null}
      {mutationErrorKey ? <p className="text-sm text-destructive">{t(mutationErrorKey as never)}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>
            {detailState.data ? detailState.data.title : t('editor.loadingTitle')}
          </CardTitle>
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
                <TabsTrigger value="tree">{t('tabs.tree')}</TabsTrigger>
              </TabsList>
              <TabsContent value="metadata" className="space-y-4">
                <AdminLearnMetadataTab
                  course={detailState.data}
                  categories={taxonomyState.categories}
                  tags={taxonomyState.tags}
                  isSubmitting={isMutating}
                  onSubmit={(payload) => submitUpdateCourse(slug, payload)}
                />
              </TabsContent>
              <TabsContent value="tree" className="space-y-4">
                <AdminLearnTreeTab locale={locale} slug={slug} />
              </TabsContent>
            </Tabs>
          ) : (
            <p className="text-sm text-muted-foreground">{t('empty.noCourse')}</p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
