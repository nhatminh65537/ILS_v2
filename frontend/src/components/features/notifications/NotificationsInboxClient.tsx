'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotifications } from '@/hooks/useNotifications'

type NotificationsInboxClientProps = {
  locale: string
}

const PAGE_SIZE = 20

const formatDateTime = (value: string, locale: string): string => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }

  return parsed.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function NotificationsInboxClient({ locale }: NotificationsInboxClientProps) {
  const t = useTranslations('notifications')
  const [offset, setOffset] = useState(0)

  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    loadNotifications,
    refreshUnreadCount,
    markNotificationAsRead,
    markEveryNotificationAsRead,
  } = useNotifications({ enableRealtime: false })

  useEffect(() => {
    void loadNotifications({ limit: PAGE_SIZE, offset })
    void refreshUnreadCount()
  }, [loadNotifications, offset, refreshUnreadCount])

  const canGoPrevious = offset > 0
  const canGoNext = notifications.length === PAGE_SIZE

  const unreadItems = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  )

  const handleMarkRead = async (id: number) => {
    const isSuccess = await markNotificationAsRead(id)
    if (isSuccess) {
      await refreshUnreadCount()
    }
  }

  const handleMarkAllRead = async () => {
    const isSuccess = await markEveryNotificationAsRead()
    if (isSuccess) {
      await refreshUnreadCount()
    }
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold md:text-3xl">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary">{t('unreadCount', { count: unreadCount })}</Badge>
          <Button
            size="sm"
            variant="outline"
            disabled={unreadItems === 0 || isLoading}
            onClick={() => void handleMarkAllRead()}
          >
            {t('markAllRead')}
          </Button>
        </div>
      </header>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{t(error as Parameters<typeof t>[0])}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>{t('inboxTitle')}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!canGoPrevious || isLoading}
              onClick={() => setOffset((previous) => Math.max(0, previous - PAGE_SIZE))}
            >
              {t('previous')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!canGoNext || isLoading}
              onClick={() => setOffset((previous) => previous + PAGE_SIZE)}
            >
              {t('next')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('empty')}</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="space-y-2 border border-border p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-xs text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(notification.created_at, locale)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notification.is_read ? (
                        <Badge variant="secondary">{t('unread')}</Badge>
                      ) : (
                        <Badge variant="outline">{t('read')}</Badge>
                      )}
                      {!notification.is_read ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleMarkRead(notification.id)}
                        >
                          {t('markRead')}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
