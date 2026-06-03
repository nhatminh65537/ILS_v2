'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LessonSource, LessonType, type AdminLearnNodeCreatePayload } from '@/types/course.types'

/** Default markdown scaffold so new lessons never start blank (_-05). */
export const DEFAULT_LESSON_MARKDOWN = `# Tiêu đề bài học

## Mục tiêu

- ...

## Nội dung

Viết nội dung bài học ở đây.
`

type NodeKind = 'folder' | 'lesson'

type AdminLearnNodeCreateDialogProps = {
  open: boolean
  /** Parent folder id the new node is created under (null = root). */
  parentId: number | null
  /** Display label of the parent (for the dialog description). */
  parentLabel: string
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (payload: AdminLearnNodeCreatePayload) => Promise<boolean>
}

const EMPTY_STATE = {
  kind: 'folder' as NodeKind,
  title: '',
  lessonType: LessonType.Markdown,
  contentMd: DEFAULT_LESSON_MARKDOWN,
  videoUrl: '',
  learningPoint: '0',
  learningTime: '',
}

export function AdminLearnNodeCreateDialog({
  open,
  parentId,
  parentLabel,
  isSubmitting,
  onOpenChange,
  onCreate,
}: AdminLearnNodeCreateDialogProps) {
  const t = useTranslations('adminLearn')
  const [form, setForm] = useState(EMPTY_STATE)
  const [prevOpen, setPrevOpen] = useState(open)

  // Reset the form each time the dialog opens (adjust state during render).
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setForm(EMPTY_STATE)
    }
  }

  const isLesson = form.kind === 'lesson'

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      return
    }

    // The single shared title fills both node.title and lesson.title; the
    // backend mirrors lesson.title from the node title when omitted.
    const payload: AdminLearnNodeCreatePayload = isLesson
      ? {
          title: form.title.trim(),
          parent_id: parentId,
          is_item: true,
          lesson: {
            title: form.title.trim(),
            lesson_type: form.lessonType,
            source: LessonSource.Manual,
            content_md:
              form.lessonType === LessonType.Markdown ? form.contentMd : undefined,
            video_url: form.lessonType === LessonType.Video ? form.videoUrl.trim() : undefined,
            learning_point: Number(form.learningPoint) || 0,
            learning_time: form.learningTime.trim() ? Number(form.learningTime) : null,
          },
        }
      : {
          title: form.title.trim(),
          parent_id: parentId,
          is_item: false,
        }

    const ok = await onCreate(payload)
    if (ok) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('tree.createNodeTitle')}</DialogTitle>
          <DialogDescription>{t('tree.createNodeUnder', { parent: parentLabel })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">{t('tree.nodeKindLabel')}</label>
            <Select
              value={form.kind}
              onValueChange={(value) => setForm((prev) => ({ ...prev, kind: value as NodeKind }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="folder">{t('tree.badgeFolder')}</SelectItem>
                <SelectItem value="lesson">{t('tree.badgeLesson')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">{t('tree.titleLabel')}</label>
            <Input
              value={form.title}
              autoFocus
              placeholder={t('tree.titlePlaceholder')}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
          </div>

          {isLesson ? (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">{t('tree.lessonTypeLabel')}</label>
                <Select
                  value={form.lessonType}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, lessonType: value as LessonType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={LessonType.Markdown}>{t('lessonTypes.markdown')}</SelectItem>
                    <SelectItem value={LessonType.Video}>{t('lessonTypes.video')}</SelectItem>
                    <SelectItem value={LessonType.MiniQuiz}>{t('lessonTypes.miniquiz')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">{t('metadata.learningPointLabel')}</label>
                  <Input
                    type="number"
                    min={0}
                    value={form.learningPoint}
                    onChange={(event) => setForm((prev) => ({ ...prev, learningPoint: event.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">{t('metadata.learningTimeLabel')}</label>
                  <Input
                    type="number"
                    min={0}
                    value={form.learningTime}
                    placeholder={t('metadata.optionalPlaceholder')}
                    onChange={(event) => setForm((prev) => ({ ...prev, learningTime: event.target.value }))}
                  />
                </div>
              </div>

              {form.lessonType === LessonType.Markdown ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">{t('tabs.markdown')}</label>
                  <textarea
                    className="min-h-32 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                    value={form.contentMd}
                    onChange={(event) => setForm((prev) => ({ ...prev, contentMd: event.target.value }))}
                  />
                </div>
              ) : null}

              {form.lessonType === LessonType.Video ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">{t('tabs.video')}</label>
                  <Input
                    value={form.videoUrl}
                    placeholder={t('tree.videoUrlPlaceholder')}
                    onChange={(event) => setForm((prev) => ({ ...prev, videoUrl: event.target.value }))}
                  />
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
            {t('actions.cancel')}
          </Button>
          <Button disabled={isSubmitting || !form.title.trim()} onClick={() => void handleSubmit()}>
            {t('actions.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
