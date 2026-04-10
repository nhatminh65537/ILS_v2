'use client'

import { useTranslations } from 'next-intl'
import type { ActivityEvent } from '@/types/user.types'

type ActivityTimelineProps = {
  events: ActivityEvent[]
}

function formatRelativeTime(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHour = Math.floor(diffMs / 3_600_000)
  const diffDay = Math.floor(diffMs / 86_400_000)

  if (diffMin < 1) return 'vừa xong'
  if (diffMin < 60) return `${diffMin} phút trước`
  if (diffHour < 24) return `${diffHour} giờ trước`
  if (diffDay < 30) return `${diffDay} ngày trước`
  return new Date(timestamp).toLocaleDateString('vi-VN')
}

const typeIcon: Record<ActivityEvent['type'], string> = {
  lesson_complete: '📖',
  challenge_solve: '🚩',
  quiz_complete: '✅',
}

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  const t = useTranslations('profile')

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('activityEmpty')}</p>
  }

  return (
    <ol className="space-y-3">
      {events.map((event, index) => (
        <li key={index} className="flex items-start gap-3 text-sm">
          <span className="mt-0.5 text-base leading-none">{typeIcon[event.type]}</span>
          <div className="min-w-0 flex-1">
            <span className="font-medium">{t(`activityTypes.${event.type}` as Parameters<typeof t>[0])}</span>
            {event.item_title && (
              <span className="text-muted-foreground"> — {event.item_title}</span>
            )}
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeTime(event.timestamp)}</span>
        </li>
      ))}
    </ol>
  )
}
