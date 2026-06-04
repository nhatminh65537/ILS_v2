'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
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
import {
  ContentStatus,
  type AdminQuizMutationPayload,
  type Quiz,
  type QuizCategory,
  type QuizTag,
} from '@/types/quiz.types'

type AdminQuizFormProps = {
  mode: 'create' | 'edit'
  initialQuiz?: Quiz | null
  categories?: QuizCategory[]
  tags?: QuizTag[]
  isSubmitting: boolean
  submitLabel: string
  onSubmit: (payload: AdminQuizMutationPayload) => Promise<void> | void
}

type FormState = {
  title: string
  description: string
  status: ContentStatus
  time_limit_sec: number
  categoryId: number | null
  tagIds: number[]
}

const DEFAULT_FORM: FormState = {
  title: '',
  description: '',
  status: ContentStatus.Draft,
  time_limit_sec: 0,
  categoryId: null,
  tagIds: [],
}

const buildInitialForm = (initialQuiz?: Quiz | null): FormState => {
  if (!initialQuiz) {
    return { ...DEFAULT_FORM }
  }

  const category = initialQuiz.category
  const categoryId = typeof category === 'number' ? category : (category as QuizCategory | null)?.id ?? null

  return {
    title: initialQuiz.title,
    description: initialQuiz.description ?? '',
    status: initialQuiz.status,
    time_limit_sec: initialQuiz.time_limit_sec ?? 0,
    categoryId,
    tagIds: initialQuiz.tags?.map((tag) => tag.id) ?? [],
  }
}

export function AdminQuizForm({
  mode,
  initialQuiz,
  categories = [],
  tags = [],
  isSubmitting,
  submitLabel,
  onSubmit,
}: AdminQuizFormProps) {
  const t = useTranslations('adminQuizzes')
  const [form, setForm] = useState<FormState>(() => buildInitialForm(initialQuiz))

  const isValid = form.title.trim().length > 0

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isValid || isSubmitting) {
      return
    }

    // quiz_point is derived server-side (sum of question scores) — not sent.
    await onSubmit({
      title: form.title.trim(),
      description: form.description?.trim() || '',
      status: form.status,
      time_limit_sec: Math.max(0, Number(form.time_limit_sec ?? 0)),
      category_id: form.categoryId,
      tag_ids: form.tagIds,
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

      <div className="grid gap-4 md:grid-cols-2">
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
          <Label>{t('form.categoryLabel')}</Label>
          <Select
            value={form.categoryId != null ? String(form.categoryId) : 'none'}
            onValueChange={(v) => setForm((prev) => ({ ...prev, categoryId: v === 'none' ? null : Number(v) }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('form.categoryNone')}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label>{t('form.quizPointLabel')}</Label>
          <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm">
            {initialQuiz?.quiz_point ?? 0}
          </div>
          <p className="text-xs text-muted-foreground">{t('form.quizPointHint')}</p>
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

      <div className="space-y-2 rounded-md border border-border p-3">
        <p className="text-sm font-medium">{t('form.tagsLabel')}</p>
        {tags.length === 0 ? <p className="text-sm text-muted-foreground">{t('empty.noTags')}</p> : null}
        <div className="grid gap-2 md:grid-cols-2">
          {tags.map((tag) => {
            const checked = form.tagIds.includes(tag.id)
            return (
              <label key={tag.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(next) => {
                    setForm((prev) => {
                      const set = new Set(prev.tagIds)
                      if (next) {
                        set.add(tag.id)
                      } else {
                        set.delete(tag.id)
                      }
                      return { ...prev, tagIds: [...set] }
                    })
                  }}
                />
                <span>{tag.name}</span>
              </label>
            )
          })}
        </div>
      </div>

      <Button disabled={!isValid || isSubmitting} type="submit">
        {isSubmitting ? t('status.saving') : submitLabel}
      </Button>
    </form>
  )
}
