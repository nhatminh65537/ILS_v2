'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LessonType } from '@/types/course.types'
import type { AdminLearnLessonUpdatePayload } from '@/types/lesson.types'

type AdminLearnLessonMetadataTabProps = {
  lessonType: LessonType
  initialTitle: string
  initialLearningPoint: number
  initialLearningTime: number | null
  initialVideoDuration: number | null
  isSubmitting: boolean
  onSave: (payload: AdminLearnLessonUpdatePayload) => Promise<boolean>
}

const toNumberOrNull = (value: string): number | null => {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function AdminLearnLessonMetadataTab({
  lessonType,
  initialTitle,
  initialLearningPoint,
  initialLearningTime,
  initialVideoDuration,
  isSubmitting,
  onSave,
}: AdminLearnLessonMetadataTabProps) {
  const t = useTranslations('adminLearn')
  const [title, setTitle] = useState(initialTitle)
  const [learningPoint, setLearningPoint] = useState(String(initialLearningPoint ?? 0))
  const [learningTime, setLearningTime] = useState(
    initialLearningTime != null ? String(initialLearningTime) : ''
  )
  const [videoDuration, setVideoDuration] = useState(
    initialVideoDuration != null ? String(initialVideoDuration) : ''
  )

  const handleSave = async () => {
    const payload: AdminLearnLessonUpdatePayload = {
      title: title.trim(),
      learning_point: toNumberOrNull(learningPoint) ?? 0,
      learning_time: toNumberOrNull(learningTime),
    }
    if (lessonType === LessonType.Video) {
      payload.video_duration = toNumberOrNull(videoDuration)
    }
    await onSave(payload)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium">{t('metadata.titleLabel')}</label>
        <Input value={title} onChange={(event) => setTitle(event.target.value)} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium">{t('metadata.learningPointLabel')}</label>
          <Input
            type="number"
            min={0}
            value={learningPoint}
            onChange={(event) => setLearningPoint(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">{t('metadata.learningTimeLabel')}</label>
          <Input
            type="number"
            min={0}
            value={learningTime}
            placeholder={t('metadata.optionalPlaceholder')}
            onChange={(event) => setLearningTime(event.target.value)}
          />
        </div>
      </div>

      {lessonType === LessonType.Video ? (
        <div className="space-y-1.5">
          <label className="text-xs font-medium">{t('metadata.videoDurationLabel')}</label>
          <Input
            type="number"
            min={0}
            value={videoDuration}
            placeholder={t('metadata.optionalPlaceholder')}
            onChange={(event) => setVideoDuration(event.target.value)}
          />
        </div>
      ) : null}

      <Button disabled={isSubmitting || !title.trim()} onClick={() => void handleSave()}>
        {t('actions.save')}
      </Button>
    </div>
  )
}
