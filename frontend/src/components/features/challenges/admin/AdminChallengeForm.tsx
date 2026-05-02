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
  ChallengeDifficulty,
  ChallengeSource,
  type Challenge,
  type ChallengeCategory,
  type ChallengeTag,
  type CreateChallengePayload,
  type UpdateChallengePayload,
} from '@/types/challenge.types'

type AdminChallengeFormProps = {
  mode: 'create' | 'edit'
  initialChallenge?: Challenge | null
  categories: ChallengeCategory[]
  tags: ChallengeTag[]
  isSubmitting: boolean
  submitLabel: string
  onSubmit: (payload: CreateChallengePayload | UpdateChallengePayload) => Promise<void> | void
}

type FormState = {
  title: string
  slug: string
  description: string
  status: 'draft' | 'published' | 'archived'
  difficulty: ChallengeDifficulty | ''
  categoryId: number | null
  tagIds: number[]
  challengePoint: number
  instanceRequired: boolean
}

const normalizeSlug = (value: string): string =>
  value.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')

const buildInitialState = (challenge?: Challenge | null): FormState => {
  if (!challenge) {
    return {
      title: '',
      slug: '',
      description: '',
      status: 'draft',
      difficulty: '',
      categoryId: null,
      tagIds: [],
      challengePoint: 100,
      instanceRequired: false,
    }
  }

  const category = challenge.category
  const categoryId = typeof category === 'number' ? category : (category as ChallengeCategory | null)?.id ?? null

  return {
    title: challenge.title,
    slug: challenge.slug,
    description: challenge.description ?? '',
    status: challenge.status,
    difficulty: challenge.difficulty ?? '',
    categoryId,
    tagIds: challenge.tags?.map((t) => t.id) ?? [],
    challengePoint: challenge.challenge_point,
    instanceRequired: challenge.instance_required,
  }
}

export function AdminChallengeForm({
  mode,
  initialChallenge,
  categories,
  tags,
  isSubmitting,
  submitLabel,
  onSubmit,
}: AdminChallengeFormProps) {
  const t = useTranslations('adminChallenges')
  const [form, setForm] = useState<FormState>(() => buildInitialState(initialChallenge))

  const isValid = useMemo(() => {
    if (!form.title.trim()) return false
    if (mode === 'create' && !form.slug.trim()) return false
    return true
  }, [form.slug, form.title, mode])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isValid || isSubmitting) return

    if (mode === 'create') {
      const payload: CreateChallengePayload = {
        title: form.title.trim(),
        slug: normalizeSlug(form.slug),
        description: form.description.trim(),
        status: form.status as 'draft' | 'published',
        difficulty: form.difficulty || undefined,
        category_id: form.categoryId ?? undefined,
        tag_ids: form.tagIds,
        source: ChallengeSource.Manual,
        challenge_point: Math.max(0, Number(form.challengePoint || 0)),
        instance_required: form.instanceRequired,
      }
      await onSubmit(payload)
    } else {
      const payload: UpdateChallengePayload = {
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        difficulty: form.difficulty || undefined,
        category_id: form.categoryId,
        tag_ids: form.tagIds,
        challenge_point: Math.max(0, Number(form.challengePoint || 0)),
        instance_required: form.instanceRequired,
      }
      await onSubmit(payload)
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <Label htmlFor={`admin-challenge-title-${mode}`}>{t('form.titleLabel')}</Label>
        <Input
          id={`admin-challenge-title-${mode}`}
          value={form.title}
          placeholder={t('form.titlePlaceholder')}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor={`admin-challenge-slug-${mode}`}>{t('form.slugLabel')}</Label>
        <Input
          id={`admin-challenge-slug-${mode}`}
          readOnly={mode === 'edit'}
          value={form.slug}
          placeholder={t('form.slugPlaceholder')}
          onChange={(e) => setForm((prev) => ({ ...prev, slug: normalizeSlug(e.target.value) }))}
        />
        {mode === 'edit' ? <p className="text-xs text-muted-foreground">{t('form.slugImmutableHint')}</p> : null}
      </div>

      <div className="space-y-1">
        <Label htmlFor={`admin-challenge-desc-${mode}`}>{t('form.descriptionLabel')}</Label>
        <textarea
          id={`admin-challenge-desc-${mode}`}
          className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          value={form.description}
          placeholder={t('form.descriptionPlaceholder')}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <Label>{t('form.statusLabel')}</Label>
          <Select value={form.status} onValueChange={(v) => setForm((prev) => ({ ...prev, status: v as FormState['status'] }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">{t('status.draft')}</SelectItem>
              <SelectItem value="published">{t('status.published')}</SelectItem>
              <SelectItem value="archived">{t('status.archived')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>{t('form.difficultyLabel')}</Label>
          <Select value={form.difficulty || 'none'} onValueChange={(v) => setForm((prev) => ({ ...prev, difficulty: v === 'none' ? '' : v as ChallengeDifficulty }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('form.difficultyNone')}</SelectItem>
              <SelectItem value={ChallengeDifficulty.Easy}>{t('difficulty.easy')}</SelectItem>
              <SelectItem value={ChallengeDifficulty.Medium}>{t('difficulty.medium')}</SelectItem>
              <SelectItem value={ChallengeDifficulty.Hard}>{t('difficulty.hard')}</SelectItem>
              <SelectItem value={ChallengeDifficulty.Insane}>{t('difficulty.insane')}</SelectItem>
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
          <Label htmlFor={`admin-challenge-point-${mode}`}>{t('form.challengePointLabel')}</Label>
          <Input
            id={`admin-challenge-point-${mode}`}
            type="number"
            min={0}
            step={1}
            value={String(form.challengePoint)}
            onChange={(e) => setForm((prev) => ({ ...prev, challengePoint: Math.max(0, Number(e.target.value || 0)) }))}
          />
        </div>

        <div className="flex items-end gap-3 pb-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={form.instanceRequired}
              onCheckedChange={(v) => setForm((prev) => ({ ...prev, instanceRequired: Boolean(v) }))}
            />
            <span>{t('form.instanceRequiredLabel')}</span>
          </label>
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
                      if (next) { set.add(tag.id) } else { set.delete(tag.id) }
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

      <Button type="submit" disabled={!isValid || isSubmitting}>
        {isSubmitting ? t('status.saving') : submitLabel}
      </Button>
    </form>
  )
}
