'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { findNeighborLessons, flattenLessonNodes } from '@/lib/learn-navigation'
import { deriveMarkdownSignal } from '@/lib/lesson-completion'
import { useCourses } from '@/hooks/useCourses'
import { LessonType } from '@/types/course.types'
import type { LessonCompletionSignal } from '@/types/lesson.types'
import { LessonCourseTreeSidebar } from './LessonCourseTreeSidebar'
import { LessonMarkdownContent } from './LessonMarkdownContent'
import { LessonMiniQuizContent } from './LessonMiniQuizContent'
import { LessonProgressSidebar } from './LessonProgressSidebar'
import { LessonVideoContent } from './LessonVideoContent'

type LessonViewerClientProps = {
  locale: string
  slug: string
  lessonId: number
}

export function LessonViewerClient({ locale, slug, lessonId }: LessonViewerClientProps) {
  const t = useTranslations('courses.lessonViewer')
  const {
    selectedCourse,
    courseProgress,
    rootNodes,
    childrenByParentId,
    activeLesson,
    lessonQuestions,
    isLessonQuestionsLoading,
    isLessonProgressSubmitting,
    lessonError,
    isCompleted,
    loadCourseDetail,
    loadCourseProgress,
    loadAllCourseNodesForNavigation,
    loadLessonById,
    loadLessonQuestions,
    startLesson,
    completeLesson,
    resetLessonState,
  } = useCourses()

  const [signal, setSignal] = useState<LessonCompletionSignal>(deriveMarkdownSignal(0))
  // Single guard for the parallel initial fetch so we never flash the error
  // state while the lesson exists but the navigation tree is still loading.
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false)

  useEffect(() => {
    resetLessonState(lessonId)
    setIsInitialLoading(true)

    let cancelled = false

    const run = async () => {
      const [, , , lessonLoaded] = await Promise.all([
        loadCourseDetail(slug),
        loadCourseProgress(slug),
        loadAllCourseNodesForNavigation(slug),
        loadLessonById(lessonId),
      ])

      // Auto-start the lesson on open (start endpoint is idempotent and also
      // hydrates existing progress so completed lessons render as done).
      if (lessonLoaded && !cancelled) {
        await startLesson(lessonId)
      }

      if (!cancelled) {
        setIsInitialLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [
    lessonId,
    loadAllCourseNodesForNavigation,
    loadCourseDetail,
    loadCourseProgress,
    loadLessonById,
    resetLessonState,
    startLesson,
    slug,
  ])

  useEffect(() => {
    // Guard against a stale activeLesson from the previous route: only load
    // questions when the active lesson actually matches the current lessonId.
    if (!activeLesson || activeLesson.id !== lessonId) {
      return
    }

    if (activeLesson.lesson_type === LessonType.MiniQuiz) {
      void loadLessonQuestions(lessonId)
    }
  }, [activeLesson, lessonId, loadLessonQuestions])

  const flattenedLessons = useMemo(
    () => flattenLessonNodes(rootNodes, childrenByParentId),
    [childrenByParentId, rootNodes]
  )

  const neighbors = useMemo(
    () => findNeighborLessons(flattenedLessons, lessonId),
    [flattenedLessons, lessonId]
  )

  const handleComplete = async () => {
    if (isCompleted) {
      return
    }

    const completed = await completeLesson(lessonId)
    if (completed) {
      await loadCourseProgress(slug)
    }
  }

  if (isInitialLoading) {
    return (
      <section className="space-y-4">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-80 w-full" />
      </section>
    )
  }

  if (lessonError || !activeLesson || activeLesson.id !== lessonId) {
    return (
      <section className="space-y-4">
        <Link href={`/${locale}/courses/${slug}`} className="text-sm text-muted-foreground underline">
          {t('backToCourse')}
        </Link>
        <p className="text-sm text-destructive">{t('errors.lessonLoadFailed')}</p>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <Link href={`/${locale}/courses/${slug}`} className="text-sm text-muted-foreground underline">
          {t('backToCourse')}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold md:text-3xl">{activeLesson.title}</h1>
          <Badge variant="outline">{activeLesson.lesson_type}</Badge>
          <Badge variant="secondary">
            {t('learningPointLabel')}: {activeLesson.learning_point}
          </Badge>
          {isCompleted ? <Badge>{t('completed')}</Badge> : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {selectedCourse ? selectedCourse.title : t('courseUnavailable')}
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardContent className="space-y-4 pt-6">
            {activeLesson.lesson_type === LessonType.Markdown ? (
              <LessonMarkdownContent
                content={activeLesson.content_md ?? ''}
                onSignalChange={setSignal}
              />
            ) : null}

            {activeLesson.lesson_type === LessonType.Video ? (
              activeLesson.video_url ? (
                <LessonVideoContent videoUrl={activeLesson.video_url} onSignalChange={setSignal} />
              ) : (
                <p className="text-sm text-muted-foreground">{t('errors.videoUrlMissing')}</p>
              )
            ) : null}

            {activeLesson.lesson_type === LessonType.MiniQuiz ? (
              isLessonQuestionsLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <LessonMiniQuizContent mappings={lessonQuestions} onSignalChange={setSignal} />
              )
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4 xl:sticky xl:top-24 xl:h-fit">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-base">{t('treeTitle')}</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsTreeCollapsed((prev) => !prev)}
                aria-expanded={!isTreeCollapsed}
                aria-label={isTreeCollapsed ? t('expandPanel') : t('collapsePanel')}
              >
                {isTreeCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            </CardHeader>
            {!isTreeCollapsed ? (
              <CardContent>
                <LessonCourseTreeSidebar
                  locale={locale}
                  slug={slug}
                  rootNodes={rootNodes}
                  childrenByParentId={childrenByParentId}
                  currentLessonId={lessonId}
                />
              </CardContent>
            ) : null}
          </Card>

          <LessonProgressSidebar
            locale={locale}
            slug={slug}
            isCompleted={isCompleted}
            isSubmitting={isLessonProgressSubmitting}
            signal={signal}
            courseProgress={courseProgress}
            previousLesson={
              neighbors.previous
                    ? {
                        lessonId: neighbors.previous.lessonId,
                        title: neighbors.previous.title,
                      }
                    : null
                }
            nextLesson={
              neighbors.next
                ? {
                    lessonId: neighbors.next.lessonId,
                    title: neighbors.next.title,
                  }
                : null
            }
            onComplete={handleComplete}
          />
        </div>
      </div>
    </section>
  )
}
