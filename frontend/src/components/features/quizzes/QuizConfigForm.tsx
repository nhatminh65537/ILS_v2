'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getQuizConfig, saveQuizConfig } from '@/services/quizzes.service'
import {
  QuizQuestionFilter,
  type QuizConfig,
  type QuizConfigUpdatePayload,
} from '@/types/quiz.types'

type Props = {
  quizId: number
}

type FormState = {
  randomQuestion: boolean
  randomOption: boolean
  immediateFeedback: boolean
  questionFilter: QuizQuestionFilter
  totalQuestions: number // 0 = all
  timeLimitSec: number // 0 = no limit
}

const fromConfig = (config: QuizConfig): FormState => ({
  randomQuestion: config.random_question,
  randomOption: config.random_option,
  immediateFeedback: config.immediate_feedback,
  questionFilter: config.question_filter,
  totalQuestions: config.total_questions ?? 0,
  timeLimitSec: config.time_limit_sec ?? 0,
})

const toPayload = (form: FormState): QuizConfigUpdatePayload => ({
  random_question: form.randomQuestion,
  random_option: form.randomOption,
  immediate_feedback: form.immediateFeedback,
  question_filter: form.questionFilter,
  total_questions: form.totalQuestions > 0 ? form.totalQuestions : null,
  time_limit_sec: form.timeLimitSec > 0 ? form.timeLimitSec : null,
})

/**
 * Per-user practice configuration for a quiz, persisted via PUT /config/.
 * The saved config is snapshotted into the attempt when the next session starts,
 * so the member must save here before starting to apply changes.
 */
export function QuizConfigForm({ quizId }: Props) {
  const t = useTranslations('quizzes')
  const [form, setForm] = useState<FormState | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const config = await getQuizConfig(quizId)
        if (active) setForm(fromConfig(config))
      } catch {
        if (active) setError(true)
      }
    })()
    return () => {
      active = false
    }
  }, [quizId])

  const handleSave = async () => {
    if (!form) return
    setIsSaving(true)
    setSavedAt(null)
    setError(false)
    try {
      const updated = await saveQuizConfig(quizId, toPayload(form))
      setForm(fromConfig(updated))
      setSavedAt(Date.now())
    } catch {
      setError(true)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('config.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {form === null ? (
          <p className="text-sm text-muted-foreground">{t('config.loading')}</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.randomQuestion}
                  onCheckedChange={(v) => setForm((f) => f && { ...f, randomQuestion: Boolean(v) })}
                />
                {t('config.randomQuestion')}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.randomOption}
                  onCheckedChange={(v) => setForm((f) => f && { ...f, randomOption: Boolean(v) })}
                />
                {t('config.randomOption')}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.immediateFeedback}
                  onCheckedChange={(v) => setForm((f) => f && { ...f, immediateFeedback: Boolean(v) })}
                />
                {t('config.immediateFeedback')}
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>{t('config.questionFilter')}</Label>
                <Select
                  value={form.questionFilter}
                  onValueChange={(v) =>
                    setForm((f) => f && { ...f, questionFilter: v as QuizQuestionFilter })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={QuizQuestionFilter.All}>{t('config.filter.all')}</SelectItem>
                    <SelectItem value={QuizQuestionFilter.Unsolved}>{t('config.filter.unsolved')}</SelectItem>
                    <SelectItem value={QuizQuestionFilter.Solved}>{t('config.filter.solved')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="quiz-config-count">{t('config.totalQuestions')}</Label>
                <Input
                  id="quiz-config-count"
                  min={0}
                  step={1}
                  type="number"
                  value={String(form.totalQuestions)}
                  onChange={(e) =>
                    setForm((f) => f && { ...f, totalQuestions: Math.max(0, Number(e.target.value || 0)) })
                  }
                />
                <p className="text-xs text-muted-foreground">{t('config.totalQuestionsHint')}</p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="quiz-config-time">{t('config.timeLimit')}</Label>
                <Input
                  id="quiz-config-time"
                  min={0}
                  step={30}
                  type="number"
                  value={String(form.timeLimitSec)}
                  onChange={(e) =>
                    setForm((f) => f && { ...f, timeLimitSec: Math.max(0, Number(e.target.value || 0)) })
                  }
                />
                <p className="text-xs text-muted-foreground">{t('config.timeLimitHint')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button disabled={isSaving} onClick={handleSave}>
                {isSaving ? t('config.saving') : t('config.save')}
              </Button>
              {savedAt ? <span className="text-sm text-muted-foreground">{t('config.saved')}</span> : null}
              {error ? <span className="text-sm text-destructive">{t('config.saveFailed')}</span> : null}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
