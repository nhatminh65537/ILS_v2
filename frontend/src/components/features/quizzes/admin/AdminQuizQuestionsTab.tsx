'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAdminQuizQuestions } from '@/hooks/useAdminQuizQuestions'
import type { AdminQuizQuestionMutationPayload, QuizQuestion } from '@/types/quiz.types'
import { AdminQuizQuestionFormDialog } from '../AdminQuizQuestionFormDialog'
import { AdminQuizQuestionPreviewCard } from '../AdminQuizQuestionPreviewCard'

type AdminQuizQuestionsTabProps = {
  quizId: number
}

/**
 * Questions manager rendered inside the quiz editor's "Questions" tab.
 * This is the former /admin/quizzes/[id]/questions page body, minus the page
 * header + cross-navigation links (which the Tabs now provide).
 */
export function AdminQuizQuestionsTab({ quizId }: AdminQuizQuestionsTabProps) {
  const t = useTranslations('adminQuizzes')
  const {
    questionsState,
    isMutating,
    mutationErrorKey,
    loadQuestions,
    submitCreateQuestion,
    submitUpdateQuestion,
    submitDeleteQuestion,
    submitReorderQuestions,
  } = useAdminQuizQuestions()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null)
  const [previewQuestionId, setPreviewQuestionId] = useState<number | null>(null)
  const [dialogKey, setDialogKey] = useState(0)

  useEffect(() => {
    void loadQuestions(quizId)
  }, [loadQuestions, quizId])

  const sortedQuestions = useMemo(
    () => [...questionsState.data].sort((a, b) => a.position - b.position),
    [questionsState.data]
  )

  const previewQuestion = sortedQuestions.find((question) => question.id === previewQuestionId) ?? null

  const handleSubmitCreate = async (payload: AdminQuizQuestionMutationPayload): Promise<boolean> =>
    submitCreateQuestion(quizId, payload)

  const handleSubmitUpdate = async (payload: AdminQuizQuestionMutationPayload): Promise<boolean> => {
    if (!editingQuestion) {
      return false
    }
    return submitUpdateQuestion(quizId, editingQuestion.id, payload)
  }

  const handleDelete = async (question: QuizQuestion) => {
    const confirmed = window.confirm(t('questions.confirmDelete'))
    if (!confirmed) {
      return
    }
    await submitDeleteQuestion(quizId, question.id)
  }

  const handleMove = async (questionId: number, direction: 'up' | 'down') => {
    const ids = sortedQuestions.map((question) => question.id)
    const currentIndex = ids.findIndex((id) => id === questionId)
    if (currentIndex < 0) {
      return
    }
    const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (nextIndex < 0 || nextIndex >= ids.length) {
      return
    }
    const nextIds = [...ids]
    ;[nextIds[currentIndex], nextIds[nextIndex]] = [nextIds[nextIndex], nextIds[currentIndex]]
    await submitReorderQuestions(quizId, nextIds)
  }

  return (
    <div className="space-y-4">
      {questionsState.errorMessageKey ? (
        <p className="text-sm text-destructive">{t(questionsState.errorMessageKey as Parameters<typeof t>[0])}</p>
      ) : null}
      {mutationErrorKey ? <p className="text-sm text-destructive">{t(mutationErrorKey as Parameters<typeof t>[0])}</p> : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('questions.listTitle')}</CardTitle>
          <Button
            onClick={() => {
              setEditingQuestion(null)
              setDialogKey((prev) => prev + 1)
              setDialogOpen(true)
            }}
          >
            {t('questions.actions.addQuestion')}
          </Button>
        </CardHeader>
        <CardContent>
          {questionsState.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : sortedQuestions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('questions.empty')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('questions.columns.position')}</TableHead>
                  <TableHead>{t('questions.columns.type')}</TableHead>
                  <TableHead>{t('questions.columns.score')}</TableHead>
                  <TableHead>{t('questions.columns.content')}</TableHead>
                  <TableHead className="text-right">{t('questions.columns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedQuestions.map((question, index) => (
                  <TableRow key={question.id}>
                    <TableCell>{question.position}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{t(`questions.type.${question.question_type}` as Parameters<typeof t>[0])}</Badge>
                    </TableCell>
                    <TableCell>{question.score}</TableCell>
                    <TableCell className="max-w-md truncate">{String(question.content?.text ?? '')}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          disabled={index === 0 || isMutating}
                          size="sm"
                          variant="outline"
                          onClick={() => void handleMove(question.id, 'up')}
                        >
                          {t('questions.actions.moveUp')}
                        </Button>
                        <Button
                          disabled={index === sortedQuestions.length - 1 || isMutating}
                          size="sm"
                          variant="outline"
                          onClick={() => void handleMove(question.id, 'down')}
                        >
                          {t('questions.actions.moveDown')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewQuestionId((prev) => (prev === question.id ? null : question.id))}
                        >
                          {t('questions.actions.preview')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingQuestion(question)
                            setDialogKey((prev) => prev + 1)
                            setDialogOpen(true)
                          }}
                        >
                          {t('actions.edit')}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => void handleDelete(question)}>
                          {t('actions.delete')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {previewQuestion ? <AdminQuizQuestionPreviewCard question={previewQuestion} /> : null}

      <AdminQuizQuestionFormDialog
        key={dialogKey}
        defaultPosition={sortedQuestions.length + 1}
        initialQuestion={editingQuestion}
        isSubmitting={isMutating}
        mode={editingQuestion ? 'edit' : 'create'}
        onOpenChange={setDialogOpen}
        onSubmit={editingQuestion ? handleSubmitUpdate : handleSubmitCreate}
        open={dialogOpen}
      />
    </div>
  )
}
