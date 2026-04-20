'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { BellIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNotifications } from '@/hooks/useNotifications'
import type { Notification } from '@/types/notification.types'

type NotificationBellProps = {
  locale: string
}

const formatDateTime = (value: string, locale: string): string => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }

  return parsed.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const truncate = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 1)}...`
}

export function NotificationBell({ locale }: NotificationBellProps) {
  const t = useTranslations('notifications')
  const {
    notifications,
    unreadCount,
    loadNotifications,
    refreshUnreadCount,
    markNotificationAsRead,
    socketErrorKey,
  } = useNotifications({ enableRealtime: true })

  useEffect(() => {
    void loadNotifications({ limit: 5 })
    void refreshUnreadCount()
  }, [loadNotifications, refreshUnreadCount])

  const latestFive = useMemo(() => notifications.slice(0, 5), [notifications])

  const handleMarkRead = async (notification: Notification) => {
    if (notification.is_read) {
      return
    }

    const isSuccess = await markNotificationAsRead(notification.id)
    if (isSuccess) {
      await refreshUnreadCount()
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label={t('openInbox')} className="relative" size="icon-sm" variant="ghost">
          <BellIcon />
          {unreadCount > 0 ? (
            <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] leading-none" variant="destructive">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 min-w-80">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>{t('title')}</span>
          {unreadCount > 0 ? <Badge variant="secondary">{t('unreadCount', { count: unreadCount })}</Badge> : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {socketErrorKey ? (
          <DropdownMenuItem disabled>{t(socketErrorKey as Parameters<typeof t>[0])}</DropdownMenuItem>
        ) : null}

        {latestFive.length === 0 ? (
          <DropdownMenuItem disabled>{t('empty')}</DropdownMenuItem>
        ) : (
          latestFive.map((notification) => (
            <DropdownMenuItem key={notification.id} onSelect={() => void handleMarkRead(notification)}>
              <div className="flex w-full flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{truncate(notification.title, 44)}</span>
                  {!notification.is_read ? (
                    <Badge className="h-4 px-1 text-[10px]" variant="secondary">
                      {t('unread')}
                    </Badge>
                  ) : null}
                </div>
                <p className="text-muted-foreground">{truncate(notification.message, 80)}</p>
                <span className="text-[11px] text-muted-foreground">
                  {formatDateTime(notification.created_at, locale)}
                </span>
              </div>
            </DropdownMenuItem>
          ))
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/${locale}/notifications`}>{t('openInbox')}</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
