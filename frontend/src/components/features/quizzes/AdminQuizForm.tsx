'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ContentStatus, type AdminQuizMutationPayload, type Quiz } from '@/types/quiz.types'

type AdminQuizFormProps = {
  mode: 'create' | 'edit'
  initialQuiz?: Quiz | null
  isSubmitting: boolean
  submitLabel: string
  onSubmit: (payload: AdminQuizMutationPayload) => Promise<void> | void
}

const DEFAULT_FORM: AdminQuizMutationPayload = {
  title: '',
  description: '',
  status: ContentStatus.Draft,
  quiz_point: 10,
  time_limit_sec: 0,
}

const buildInitialForm = (initialQuiz?: Quiz | null): AdminQuizMutationPayload => {
  if (!initialQuiz) {
    return { ...DEFAULT_FORM }
  }

  return {
    title: initialQuiz.title,
    description: initialQuiz.description ?? '',
    status: initialQuiz.status,
    quiz_point: initialQuiz.quiz_point,
    time_limit_sec: initialQuiz.time_limit_sec ?? 0,
  }
}

export function AdminQuizForm({
  mode,
  initialQuiz,
  isSubmitting,
  submitLabel,
  onSubmit,
}: AdminQuizFormProps) {
  const t = useTranslations('adminQuizzes')
  const [form, setForm] = useState<AdminQuizMutationPayload>(() => buildInitialForm(initialQuiz))

  const isValid = form.title.trim().length > 0

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isValid || isSubmitting) {
      return
    }

    await onSubmit({
      title: form.title.trim(),
      description: form.description?.trim() || '',
      status: form.status,
      quiz_point: Math.max(0, Number(form.quiz_point ?? 0)),
      time_limit_sec: Math.max(0, Number(form.time_limit_sec ?? 0)),
    })
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <Label htmlFor={`quiz-title-${mode}`}>{t('form.titleLabel')}</Label>
        <Input
          id={`quiz-title-${mode}`}
          placeholder={t('form.titlePlaceholder')}
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor={`quiz-description-${mode}`}>{t('form.descriptionLabel')}</Label>
        <textarea
          id={`quiz-description-${mode}`}
          className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          placeholder={t('form.descriptionPlaceholder')}
          value={form.description ?? ''}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <Label>{t('form.statusLabel')}</Label>
          <Select
            value={form.status}
            onValueChange={(value) =>
              setForm((prev) => ({ ...prev, status: value as ContentStatus }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t('form.statusLabel')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ContentStatus.Draft}>{t('status.draft')}</SelectItem>
              <SelectItem value={ContentStatus.Published}>{t('status.published')}</SelectItem>
              <SelectItem value={ContentStatus.Archived}>{t('status.archived')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor={`quiz-point-${mode}`}>{t('form.quizPointLabel')}</Label>
          <Input
            id={`quiz-point-${mode}`}
            min={0}
            step={1}
            type="number"
            value={String(form.quiz_point ?? 0)}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                quiz_point: Number(event.target.value || 0),
              }))
            }
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor={`quiz-time-limit-${mode}`}>{t('form.timeLimitLabel')}</Label>
          <Input
            id={`quiz-time-limit-${mode}`}
            min={0}
            step={30}
            type="number"
            value={String(form.time_limit_sec ?? 0)}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                time_limit_sec: Number(event.target.value || 0),
              }))
            }
          />
          <p className="text-xs text-muted-foreground">{t('form.timeLimitHint')}</p>
        </div>
      </div>

      <div className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
        {t('form.categoryTagInlineHint')}
      </div>

      <Button disabled={!isValid || isSubmitting} type="submit">
        {isSubmitting ? t('status.saving') : submitLabel}
      </Button>
    </form>
  )
}
