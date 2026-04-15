'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCourses } from '@/hooks/useCourses'
import { ContentStatus } from '@/types/course.types'
import { CourseTreePanel } from './CourseTreePanel'

type CourseDetailClientProps = {
  locale: string
  slug: string
}

const STATUS_VARIANT: Record<ContentStatus, 'default' | 'secondary' | 'outline'> = {
  [ContentStatus.Published]: 'default',
  [ContentStatus.Draft]: 'secondary',
  [ContentStatus.Archived]: 'outline',
}

export function CourseDetailClient({ locale, slug }: CourseDetailClientProps) {
  const t = useTranslations('courses')
  const {
    selectedCourse,
    courseProgress,
    rootNodes,
    expandedNodeIds,
    childrenByParentId,
    isTreeLoadingByNodeId,
    isDetailLoading,
    error,
    loadCourseDetail,
    loadCourseProgress,
    loadRootNodes,
    expandNode,
  } = useCourses()

  useEffect(() => {
    void Promise.all([
      loadCourseDetail(slug),
      loadCourseProgress(slug),
      loadRootNodes(slug),
    ])
  }, [loadCourseDetail, loadCourseProgress, loadRootNodes, slug])

  if (isDetailLoading && !selectedCourse) {
    return (
      <section className="space-y-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </section>
    )
  }

  if (error || !selectedCourse) {
    return (
      <section className="space-y-4">
        <Link href={`/${locale}/courses`} className="text-sm text-muted-foreground hover:underline">
          ← {t('detail.backToCatalog')}
        </Link>
        <p className="text-sm text-destructive">{t('errors.detailLoadFailed')}</p>
      </section>
    )
  }

  const percentValue = courseProgress ? Number(courseProgress.percent) : 0

  const statusLabel =
    selectedCourse.status === ContentStatus.Published
      ? t('labels.statusPublished')
      : selectedCourse.status === ContentStatus.Draft
        ? t('labels.statusDraft')
        : t('labels.statusArchived')

  return (
    <section className="space-y-6">
      <Link href={`/${locale}/courses`} className="text-sm text-muted-foreground hover:underline">
        ← {t('detail.backToCatalog')}
      </Link>

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold md:text-4xl">{selectedCourse.title}</h1>
          <Badge variant={STATUS_VARIANT[selectedCourse.status]}>{statusLabel}</Badge>
        </div>
        {selectedCourse.description ? (
          <p className="text-muted-foreground">{selectedCourse.description}</p>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('detail.treeTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <CourseTreePanel
              locale={locale}
              slug={slug}
              rootNodes={rootNodes}
              expandedNodeIds={expandedNodeIds}
              childrenByParentId={childrenByParentId}
              isTreeLoadingByNodeId={isTreeLoadingByNodeId}
              onToggleNode={(nodeId, isItem) => {
                void expandNode(slug, nodeId, isItem)
              }}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('detail.progressTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              {courseProgress ? (
                <dl className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">{t('labels.lessonCount')}</dt>
                    <dd className="font-medium">{courseProgress.lesson_count}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">{t('labels.completed')}</dt>
                    <dd className="font-medium">{courseProgress.completed}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">{t('labels.percent')}</dt>
                    <dd className="font-medium">{percentValue.toFixed(2)}%</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">{t('labels.noProgress')}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('detail.courseInfoTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">{t('labels.category')}</dt>
                  <dd className="font-medium">{selectedCourse.category?.name ?? '-'}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">{t('labels.learningPoint')}</dt>
                  <dd className="font-medium">{selectedCourse.learning_point}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">{t('labels.estimatedTime')}</dt>
                  <dd className="font-medium">{selectedCourse.estimated_time}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
