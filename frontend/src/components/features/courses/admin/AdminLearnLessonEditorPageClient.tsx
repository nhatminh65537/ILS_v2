'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAdminLearnLessonEditor } from '@/hooks/useAdminLearnLessonEditor'
import { LessonType } from '@/types/course.types'
import { AdminLearnLessonMarkdownTab } from './AdminLearnLessonMarkdownTab'
import { AdminLearnLessonMetadataTab } from './AdminLearnLessonMetadataTab'
import { AdminLearnLessonMiniQuizTab } from './AdminLearnLessonMiniQuizTab'
import { AdminLearnLessonVideoTab } from './AdminLearnLessonVideoTab'

type AdminLearnLessonEditorPageClientProps = {
  locale: string
  lessonId: number
}

export function AdminLearnLessonEditorPageClient({ locale, lessonId }: AdminLearnLessonEditorPageClientProps) {
  const t = useTranslations('adminLearn')
  const {
    lessonState,
    mappingsState,
    quizState,
    quizQuestionState,
    isMutating,
    mutationErrorKey,
    isMiniQuiz,
    loadLesson,
    loadLessonMappings,
    loadQuizOptions,
    loadQuizQuestionOptions,
    submitLessonUpdate,
    submitAttachMapping,
    submitDeleteMapping,
    submitReorderMapping,
  } = useAdminLearnLessonEditor()

  useEffect(() => {
    void loadLesson(lessonId)
  }, [lessonId, loadLesson])

  const [mappingDeleteTarget, setMappingDeleteTarget] = useState<number | null>(null)

  useEffect(() => {
    if (isMiniQuiz) {
      void loadLessonMappings(lessonId)
      void loadQuizOptions({ status: 'all' })
    }
  }, [isMiniQuiz, lessonId, loadLessonMappings, loadQuizOptions])

  const handleDeleteMapping = async (mappingId: number): Promise<boolean> => {
    // Open the confirm dialog; the actual delete happens on confirm.
    setMappingDeleteTarget(mappingId)
    return false
  }

  const handleConfirmMappingDelete = async () => {
    if (mappingDeleteTarget == null) {
      return
    }
    await submitDeleteMapping(lessonId, mappingDeleteTarget)
    setMappingDeleteTarget(null)
  }

  const courseSlug = lessonState.data?.course_slug ?? null
  const courseTitle = lessonState.data?.course_title ?? null

  return (
    <section className="space-y-6 p-6">
      <header className="space-y-2">
        <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Link className="hover:text-foreground hover:underline" href={`/${locale}/admin/learn/courses`}>
            {t('navigation.backToList')}
          </Link>
          {courseSlug ? (
            <>
              <span>/</span>
              <Link
                className="hover:text-foreground hover:underline"
                href={`/${locale}/admin/learn/courses/${courseSlug}`}
              >
                {courseTitle ?? courseSlug}
              </Link>
            </>
          ) : null}
          <span>/</span>
          <span className="text-foreground">{lessonState.data?.title ?? t('lessonEditor.title')}</span>
        </nav>
        <h1 className="text-3xl font-semibold">{t('lessonEditor.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('lessonEditor.subtitle')}</p>
      </header>

      {lessonState.errorMessageKey ? <p className="text-sm text-destructive">{t(lessonState.errorMessageKey as never)}</p> : null}
      {mappingsState.errorMessageKey ? <p className="text-sm text-destructive">{t(mappingsState.errorMessageKey as never)}</p> : null}
      {quizState.errorMessageKey ? <p className="text-sm text-destructive">{t(quizState.errorMessageKey as never)}</p> : null}
      {quizQuestionState.errorMessageKey ? <p className="text-sm text-destructive">{t(quizQuestionState.errorMessageKey as never)}</p> : null}
      {mutationErrorKey ? <p className="text-sm text-destructive">{t(mutationErrorKey as never)}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>{lessonState.data ? lessonState.data.title : t('lessonEditor.loadingTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {lessonState.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : lessonState.data ? (
            <Tabs defaultValue="metadata" className="space-y-4">
              <TabsList>
                <TabsTrigger value="metadata">{t('tabs.metadata')}</TabsTrigger>
                <TabsTrigger value="markdown">{t('tabs.markdown')}</TabsTrigger>
                <TabsTrigger value="video">{t('tabs.video')}</TabsTrigger>
                <TabsTrigger value="miniquiz">{t('tabs.miniquiz')}</TabsTrigger>
                <TabsTrigger value="outline">{t('tabs.outline')}</TabsTrigger>
              </TabsList>

              <TabsContent value="metadata">
                <AdminLearnLessonMetadataTab
                  lessonType={lessonState.data.lesson_type}
                  initialTitle={lessonState.data.title}
                  initialLearningPoint={lessonState.data.learning_point}
                  initialLearningTime={lessonState.data.learning_time ?? null}
                  initialVideoDuration={lessonState.data.video_duration ?? null}
                  isSubmitting={isMutating}
                  onSave={(payload) => submitLessonUpdate(lessonId, payload)}
                />
              </TabsContent>

              <TabsContent value="markdown">
                {lessonState.data.lesson_type === LessonType.Markdown ? (
                  <AdminLearnLessonMarkdownTab
                    initialContent={lessonState.data.content_md ?? ''}
                    isSubmitting={isMutating}
                    onSave={(contentMd) => submitLessonUpdate(lessonId, { content_md: contentMd })}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{t('lesson.notMarkdown')}</p>
                )}
              </TabsContent>

              <TabsContent value="video">
                {lessonState.data.lesson_type === LessonType.Video ? (
                  <AdminLearnLessonVideoTab
                    initialVideoUrl={lessonState.data.video_url ?? ''}
                    isSubmitting={isMutating}
                    onSave={(videoUrl) => submitLessonUpdate(lessonId, { video_url: videoUrl })}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{t('lesson.notVideo')}</p>
                )}
              </TabsContent>

              <TabsContent value="miniquiz">
                {lessonState.data.lesson_type === LessonType.MiniQuiz ? (
                  <AdminLearnLessonMiniQuizTab
                    mappings={mappingsState.data}
                    quizItems={quizState.data.map((quiz) => ({ id: quiz.id, title: quiz.title, status: quiz.status }))}
                    quizQuestionItems={quizQuestionState.data.map((question) => ({
                      id: question.id,
                      label: `${question.id} - ${String(question.content?.text ?? question.question_type)}`,
                      question,
                    }))}
                    isLoadingMappings={mappingsState.isLoading}
                    isLoadingQuizzes={quizState.isLoading}
                    isLoadingQuizQuestions={quizQuestionState.isLoading}
                    isMutating={isMutating}
                    onLoadQuizzes={loadQuizOptions}
                    onLoadQuizQuestions={loadQuizQuestionOptions}
                    onAttach={(payload, selectedQuizId) => submitAttachMapping(lessonId, payload, selectedQuizId)}
                    onDelete={handleDeleteMapping}
                    onReorder={(orderedIds) => submitReorderMapping(lessonId, orderedIds)}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{t('lesson.notMiniQuiz')}</p>
                )}
              </TabsContent>

              <TabsContent value="outline">
                <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                  {t('outline.deferredMessage')}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <p className="text-sm text-muted-foreground">{t('empty.noLesson')}</p>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={mappingDeleteTarget !== null}
        title={t('confirm.deleteMappingTitle')}
        description={t('confirm.deleteMapping')}
        confirmLabel={t('actions.delete')}
        cancelLabel={t('actions.cancel')}
        variant="destructive"
        isLoading={isMutating}
        onConfirm={handleConfirmMappingDelete}
        onOpenChange={(open) => !open && setMappingDeleteTarget(null)}
      />
    </section>
  )
}
