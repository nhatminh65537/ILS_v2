'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { type LearnLessonQuestionMapping } from '@/types/lesson.types'
import { type QuizQuestion } from '@/types/quiz.types'

type AdminLearnLessonMiniQuizTabProps = {
  mappings: LearnLessonQuestionMapping[]
  quizItems: Array<{ id: number; title: string; status: string }>
  quizQuestionItems: Array<{ id: number; label: string; question: QuizQuestion }>
  isLoadingMappings: boolean
  isLoadingQuizzes: boolean
  isLoadingQuizQuestions: boolean
  isMutating: boolean
  onLoadQuizzes: (params?: { search?: string; status?: string }) => Promise<void>
  onLoadQuizQuestions: (quizId: number) => Promise<void>
  onAttach: (payload: { question_id: number; position?: number }, selectedQuizId?: number) => Promise<boolean>
  onDelete: (mappingId: number) => Promise<boolean>
  onReorder: (orderedMappingIds: number[]) => Promise<boolean>
}

export function AdminLearnLessonMiniQuizTab({
  mappings,
  quizItems,
  quizQuestionItems,
  isLoadingMappings,
  isLoadingQuizzes,
  isLoadingQuizQuestions,
  isMutating,
  onLoadQuizzes,
  onLoadQuizQuestions,
  onAttach,
  onDelete,
  onReorder,
}: AdminLearnLessonMiniQuizTabProps) {
  const t = useTranslations('adminLearn')
  const [quizSearch, setQuizSearch] = useState('')
  const [quizStatus, setQuizStatus] = useState('all')
  const [selectedQuizId, setSelectedQuizId] = useState<string>('none')
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('none')

  useEffect(() => {
    void onLoadQuizzes({ status: 'all' })
  }, [onLoadQuizzes])

  const sortedMappings = useMemo(
    () => [...mappings].sort((a, b) => (a.position !== b.position ? a.position - b.position : a.id - b.id)),
    [mappings]
  )

  const handleQuizSelect = async (value: string) => {
    setSelectedQuizId(value)
    setSelectedQuestionId('none')
    if (value !== 'none') {
      await onLoadQuizQuestions(Number(value))
    }
  }

  const handleAttach = async () => {
    if (selectedQuestionId === 'none') {
      return
    }

    const ok = await onAttach(
      {
        question_id: Number(selectedQuestionId),
        position: sortedMappings.length,
      },
      selectedQuizId === 'none' ? undefined : Number(selectedQuizId)
    )

    if (ok) {
      setSelectedQuestionId('none')
    }
  }

  const handleMove = async (mappingId: number, direction: 'up' | 'down') => {
    const ids = sortedMappings.map((mapping) => mapping.id)
    const currentIndex = ids.findIndex((id) => id === mappingId)
    if (currentIndex < 0) {
      return
    }

    const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (nextIndex < 0 || nextIndex >= ids.length) {
      return
    }

    const nextIds = [...ids]
    ;[nextIds[currentIndex], nextIds[nextIndex]] = [nextIds[nextIndex], nextIds[currentIndex]]
    await onReorder(nextIds)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-md border border-border p-3">
        <p className="text-sm font-medium">{t('lesson.quizSelectorTitle')}</p>
        <div className="grid gap-2 md:grid-cols-3">
          <Input value={quizSearch} placeholder={t('lesson.quizSearchPlaceholder')} onChange={(event) => setQuizSearch(event.target.value)} />
          <Select value={quizStatus} onValueChange={setQuizStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('toolbar.statusAll')}</SelectItem>
              <SelectItem value="draft">{t('status.draft')}</SelectItem>
              <SelectItem value="published">{t('status.published')}</SelectItem>
              <SelectItem value="archived">{t('status.archived')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => void onLoadQuizzes({ search: quizSearch.trim(), status: quizStatus })}>
            {t('actions.filterQuiz')}
          </Button>
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          <Select value={selectedQuizId} onValueChange={(value) => void handleQuizSelect(value)}>
            <SelectTrigger>
              <SelectValue placeholder={t('lesson.quizSelectPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('lesson.quizSelectPlaceholder')}</SelectItem>
              {quizItems.map((quiz) => (
                <SelectItem key={quiz.id} value={String(quiz.id)}>{quiz.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedQuestionId} onValueChange={setSelectedQuestionId} disabled={selectedQuizId === 'none'}>
            <SelectTrigger>
              <SelectValue placeholder={t('lesson.questionSelectPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('lesson.questionSelectPlaceholder')}</SelectItem>
              {quizQuestionItems.map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            disabled={isMutating || selectedQuizId === 'none' || selectedQuestionId === 'none'}
            onClick={() => void handleAttach()}
          >
            {t('actions.attachQuestion')}
          </Button>
        </div>

        {(isLoadingQuizzes || isLoadingQuizQuestions) ? (
          <p className="text-xs text-muted-foreground">{t('status.loading')}</p>
        ) : null}
      </div>

      {isLoadingMappings ? (
        <p className="text-sm text-muted-foreground">{t('status.loading')}</p>
      ) : sortedMappings.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty.noMappings')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columns.position')}</TableHead>
              <TableHead>{t('columns.question')}</TableHead>
              <TableHead>{t('columns.type')}</TableHead>
              <TableHead className="text-right">{t('columns.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMappings.map((mapping, index) => (
              <TableRow key={mapping.id}>
                <TableCell>{mapping.position}</TableCell>
                <TableCell>{String(mapping.question.content?.text ?? `Q${mapping.question.id}`)}</TableCell>
                <TableCell>{mapping.question.question_type}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" disabled={isMutating || index === 0} onClick={() => void handleMove(mapping.id, 'up')}>
                      {t('actions.moveUp')}
                    </Button>
                    <Button size="sm" variant="outline" disabled={isMutating || index === sortedMappings.length - 1} onClick={() => void handleMove(mapping.id, 'down')}>
                      {t('actions.moveDown')}
                    </Button>
                    <Button size="sm" variant="destructive" disabled={isMutating} onClick={() => void onDelete(mapping.id)}>
                      {t('actions.delete')}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <p className="text-xs text-muted-foreground">{t('lesson.miniQuizHelp')}</p>
    </div>
  )
}
