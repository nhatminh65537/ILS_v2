'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type AdminLearnLessonVideoTabProps = {
  initialVideoUrl: string
  isSubmitting: boolean
  onSave: (videoUrl: string) => Promise<boolean>
}

const isDirectMedia = (url: string) => /\.(mp4|webm|ogg)(\?.*)?$/i.test(url)

export function AdminLearnLessonVideoTab({
  initialVideoUrl,
  isSubmitting,
  onSave,
}: AdminLearnLessonVideoTabProps) {
  const t = useTranslations('adminLearn')
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl)

  const sanitizedUrl = useMemo(() => videoUrl.trim(), [videoUrl])

  return (
    <div className="space-y-3">
      <Input
        value={videoUrl}
        placeholder={t('lesson.videoUrlPlaceholder')}
        onChange={(event) => setVideoUrl(event.target.value)}
      />

      {sanitizedUrl ? (
        isDirectMedia(sanitizedUrl) ? (
          <video className="max-h-80 w-full rounded-md border border-border" controls src={sanitizedUrl} />
        ) : (
          <iframe
            className="h-80 w-full rounded-md border border-border"
            title="lesson-video-preview"
            src={sanitizedUrl}
          />
        )
      ) : (
        <p className="text-sm text-muted-foreground">{t('lesson.videoPreviewEmpty')}</p>
      )}

      <Button disabled={isSubmitting} onClick={() => void onSave(sanitizedUrl)}>
        {t('actions.save')}
      </Button>
    </div>
  )
}
