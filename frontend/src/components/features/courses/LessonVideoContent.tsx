'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { deriveVideoSignal } from '@/lib/lesson-completion'
import type { LessonCompletionSignal } from '@/types/lesson.types'

type LessonVideoContentProps = {
  videoUrl: string
  onSignalChange: (signal: LessonCompletionSignal) => void
}

const MEDIA_FILE_PATTERN = /\.(mp4|webm|ogg)(\?.*)?$/i

const toEmbedUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url)

    if (parsed.hostname.includes('youtube.com')) {
      const videoId = parsed.searchParams.get('v')
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`
      }
    }

    if (parsed.hostname.includes('youtu.be')) {
      const videoId = parsed.pathname.replace('/', '').trim()
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`
      }
    }

    if (parsed.hostname.includes('vimeo.com')) {
      const segments = parsed.pathname.split('/').filter(Boolean)
      const videoId = segments[segments.length - 1]
      if (videoId) {
        return `https://player.vimeo.com/video/${videoId}`
      }
    }

    return null
  } catch {
    return null
  }
}

export function LessonVideoContent({ videoUrl, onSignalChange }: LessonVideoContentProps) {
  const t = useTranslations('courses.lessonViewer')
  const [progress, setProgress] = useState(0)

  const isDirectMedia = MEDIA_FILE_PATTERN.test(videoUrl)
  const embedUrl = toEmbedUrl(videoUrl)
  const signal = useMemo(() => deriveVideoSignal(progress), [progress])

  useEffect(() => {
    onSignalChange(signal)
  }, [onSignalChange, signal])

  if (isDirectMedia) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('videoHint')}</p>
        <video
          controls
          className="w-full rounded-md border"
          src={videoUrl}
          onTimeUpdate={(event) => {
            const media = event.currentTarget
            if (!media.duration || !Number.isFinite(media.duration)) {
              return
            }
            const percent = (media.currentTime / media.duration) * 100
            setProgress(percent)
          }}
        />
      </div>
    )
  }

  if (embedUrl) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('videoEmbedHint')}</p>
        <div className="aspect-video w-full overflow-hidden rounded-md border">
          <iframe
            src={embedUrl}
            title={t('videoFrameTitle')}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t('videoUnsupported')}</p>
      <a href={videoUrl} target="_blank" rel="noreferrer" className="text-sm underline">
        {videoUrl}
      </a>
    </div>
  )
}
