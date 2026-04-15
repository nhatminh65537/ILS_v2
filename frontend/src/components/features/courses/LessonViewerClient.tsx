'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
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
    isLessonLoading,
    isLessonQuestionsLoading,
    isLessonProgressSubmitting,
    lessonError,
    isStarted,
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

  useEffect(() => {
    resetLessonState()

    const run = async () => {
      await Promise.all([
        loadCourseDetail(slug),
        loadCourseProgress(slug),
        loadAllCourseNodesForNavigation(slug),
        loadLessonById(lessonId),
      ])
    }

    void run()
  }, [
    lessonId,
    loadAllCourseNodesForNavigation,
    loadCourseDetail,
    loadCourseProgress,
    loadLessonById,
    resetLessonState,
    slug,
  ])

  useEffect(() => {
    if (!activeLesson) {
      return
    }

    if (activeLesson.lesson_type === LessonType.MiniQuiz) {
      void loadLessonQuestions(lessonId)
      return
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

  const isLessonInCourseTree = useMemo(
    () => flattenedLessons.some((entry) => entry.lessonId === lessonId),
    [flattenedLessons, lessonId]
  )

  const handleStart = async () => {
    await startLesson(lessonId)
  }

  const handleComplete = async () => {
    if (!isStarted) {
      const started = await startLesson(lessonId)
      if (!started) {
        return
      }
    }

    const completed = await completeLesson(lessonId)
    if (completed) {
      await loadCourseProgress(slug)
    }
  }

  if (isLessonLoading && !activeLesson) {
    return (
      <section className="space-y-4">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-80 w-full" />
      </section>
    )
  }

  if (lessonError || !activeLesson || !isLessonInCourseTree) {
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
        </div>
        <p className="text-sm text-muted-foreground">
          {selectedCourse ? selectedCourse.title : t('courseUnavailable')}
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_300px]">
        <Card className="xl:sticky xl:top-24 xl:h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('treeTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <LessonCourseTreeSidebar
              locale={locale}
              slug={slug}
              rootNodes={rootNodes}
              childrenByParentId={childrenByParentId}
              currentLessonId={lessonId}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
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

        <div className="xl:sticky xl:top-24 xl:h-fit">
          <LessonProgressSidebar
            locale={locale}
            slug={slug}
            isStarted={isStarted}
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
            onStart={handleStart}
            onComplete={handleComplete}
          />
        </div>
      </div>
    </section>
  )
}
