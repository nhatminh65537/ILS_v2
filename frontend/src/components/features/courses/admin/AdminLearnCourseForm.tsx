'use client'

import { useMemo, useState } from 'react'
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
  type AdminLearnCourseMutationPayload,
  type Course,
  type CourseCategory,
  type CourseTag,
} from '@/types/course.types'

type AdminLearnCourseFormProps = {
  mode: 'create' | 'edit'
  initialCourse?: Course | null
  categories: CourseCategory[]
  tags: CourseTag[]
  isSubmitting: boolean
  submitLabel: string
  onSubmit: (payload: AdminLearnCourseMutationPayload) => Promise<void> | void
}

type FormState = {
  title: string
  slug: string
  description: string
  status: ContentStatus
  categoryId: number | null
  tagIds: number[]
  learningPoint: number
  estimatedTime: number
}

const buildInitialState = (initialCourse?: Course | null): FormState => {
  if (!initialCourse) {
    return {
      title: '',
      slug: '',
      description: '',
      status: ContentStatus.Draft,
      categoryId: null,
      tagIds: [],
      learningPoint: 0,
      estimatedTime: 60,
    }
  }

  return {
    title: initialCourse.title,
    slug: initialCourse.slug,
    description: initialCourse.description ?? '',
    status: initialCourse.status,
    categoryId: initialCourse.category?.id ?? null,
    tagIds: initialCourse.tags.map((tag) => tag.id),
    learningPoint: initialCourse.learning_point,
    estimatedTime: initialCourse.estimated_time,
  }
}

const normalizeSlug = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

export function AdminLearnCourseForm({
  mode,
  initialCourse,
  categories,
  tags,
  isSubmitting,
  submitLabel,
  onSubmit,
}: AdminLearnCourseFormProps) {
  const t = useTranslations('adminLearn')
  const [form, setForm] = useState<FormState>(() => buildInitialState(initialCourse))

  const isValid = useMemo(() => {
    if (!form.title.trim()) {
      return false
    }

    if (mode === 'create' && !form.slug.trim()) {
      return false
    }

    return true
  }, [form.slug, form.title, mode])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isValid || isSubmitting) {
      return
    }

    const payload: AdminLearnCourseMutationPayload = {
      title: form.title.trim(),
      slug: mode === 'create' ? normalizeSlug(form.slug) : initialCourse?.slug,
      description: form.description.trim(),
      status: form.status,
      category_id: form.categoryId,
      tag_ids: form.tagIds,
      learning_point: Math.max(0, Number(form.learningPoint || 0)),
      estimated_time: Math.max(0, Number(form.estimatedTime || 0)),
    }

    await onSubmit(payload)
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <Label htmlFor={`admin-learn-title-${mode}`}>{t('form.titleLabel')}</Label>
        <Input
          id={`admin-learn-title-${mode}`}
          value={form.title}
          placeholder={t('form.titlePlaceholder')}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor={`admin-learn-slug-${mode}`}>{t('form.slugLabel')}</Label>
        <Input
          id={`admin-learn-slug-${mode}`}
          readOnly={mode === 'edit'}
          value={form.slug}
          placeholder={t('form.slugPlaceholder')}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              slug: normalizeSlug(event.target.value),
            }))
          }
        />
        {mode === 'edit' ? <p className="text-xs text-muted-foreground">{t('form.slugImmutableHint')}</p> : null}
      </div>

      <div className="space-y-1">
        <Label htmlFor={`admin-learn-description-${mode}`}>{t('form.descriptionLabel')}</Label>
        <textarea
          id={`admin-learn-description-${mode}`}
          className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          value={form.description}
          placeholder={t('form.descriptionPlaceholder')}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label>{t('form.statusLabel')}</Label>
          <Select
            value={form.status}
            onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as ContentStatus }))}
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
            onValueChange={(value) =>
              setForm((prev) => ({
                ...prev,
                categoryId: value === 'none' ? null : Number(value),
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t('form.categoryPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('form.categoryNone')}</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={String(category.id)}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`admin-learn-point-${mode}`}>{t('form.learningPointLabel')}</Label>
          <Input
            id={`admin-learn-point-${mode}`}
            type="number"
            readOnly
            value={String(form.learningPoint)}
          />
          <p className="text-xs text-muted-foreground">{t('form.learningPointAutoHint')}</p>
        </div>

        <div className="space-y-1">
          <Label htmlFor={`admin-learn-time-${mode}`}>{t('form.estimatedTimeLabel')}</Label>
          <Input
            id={`admin-learn-time-${mode}`}
            type="number"
            min={0}
            step={1}
            value={String(form.estimatedTime)}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                estimatedTime: Math.max(0, Number(event.target.value || 0)),
              }))
            }
          />
        </div>
      </div>

      <div className="space-y-2 rounded-md border border-border p-3">
        <p className="text-sm font-medium">{t('form.tagsLabel')}</p>
        {tags.length === 0 ? <p className="text-sm text-muted-foreground">{t('empty.noTags')}</p> : null}
        <div className="grid gap-2 md:grid-cols-2">
          {tags.map((tag) => {
            const checked = form.tagIds.includes(tag.id)
            return (
              <label key={tag.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(nextChecked) => {
                    setForm((prev) => {
                      const next = new Set(prev.tagIds)
                      if (nextChecked) {
                        next.add(tag.id)
                      } else {
                        next.delete(tag.id)
                      }
                      return {
                        ...prev,
                        tagIds: [...next],
                      }
                    })
                  }}
                />
                <span>{tag.name}</span>
              </label>
            )
          })}
        </div>
      </div>

      <Button type="submit" disabled={!isValid || isSubmitting}>
        {isSubmitting ? t('status.saving') : submitLabel}
      </Button>
    </form>
  )
}
