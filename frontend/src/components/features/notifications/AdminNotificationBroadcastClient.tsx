'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAdminNotifications } from '@/hooks/useAdminNotifications'
import { NotificationType, type BroadcastNotificationPayload } from '@/types/notification.types'

type AdminNotificationBroadcastClientProps = {
  locale: string
}

type FormState = {
  type: NotificationType
  title: string
  message: string
  metadataText: string
}

const INITIAL_FORM: FormState = {
  type: NotificationType.System,
  title: '',
  message: '',
  metadataText: '',
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

const truncate = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value
  }
  return `${value.slice(0, maxLength - 1)}...`
}

export function AdminNotificationBroadcastClient({ locale }: AdminNotificationBroadcastClientProps) {
  const t = useTranslations('adminNotifications')

  const {
    listState,
    pagination,
    isSubmitting,
    mutationErrorKey,
    lastSubmitResult,
    loadHistory,
    loadPage,
    submitBroadcast,
    resetMutationState,
  } = useAdminNotifications()

  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [formErrorKey, setFormErrorKey] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    void loadHistory({ limit: PAGE_SIZE, offset: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canGoPrevious = pagination.hasPrevious
  const canGoNext = pagination.hasNext

  const broadcastTypeOptions = useMemo(
    () => [
      { value: NotificationType.System, label: t('typeOptions.system') },
      { value: NotificationType.Achievement, label: t('typeOptions.achievement') },
      { value: NotificationType.Course, label: t('typeOptions.course') },
      { value: NotificationType.Challenge, label: t('typeOptions.challenge') },
      { value: NotificationType.Quiz, label: t('typeOptions.quiz') },
    ],
    [t]
  )

  const validateAndBuildPayload = (): BroadcastNotificationPayload | null => {
    if (!form.title.trim() || !form.message.trim()) {
      setFormErrorKey('errors.requiredFields')
      return null
    }

    let metadata: Record<string, unknown> | null = null
    const trimmedMetadata = form.metadataText.trim()

    if (trimmedMetadata) {
      try {
        const parsed = JSON.parse(trimmedMetadata) as unknown
        if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
          setFormErrorKey('errors.invalidMetadata')
          return null
        }
        metadata = parsed as Record<string, unknown>
      } catch {
        setFormErrorKey('errors.invalidMetadata')
        return null
      }
    }

    setFormErrorKey(null)
    return {
      type: form.type,
      title: form.title.trim(),
      message: form.message.trim(),
      metadata,
    }
  }

  const handleOpenConfirm = () => {
    const payload = validateAndBuildPayload()
    if (!payload) {
      return
    }

    resetMutationState()
    setConfirmOpen(true)
  }

  const handleSubmitConfirmed = async () => {
    const payload = validateAndBuildPayload()
    if (!payload) {
      setConfirmOpen(false)
      return
    }

    const result = await submitBroadcast(payload)
    setConfirmOpen(false)

    if (result) {
      setForm(INITIAL_FORM)
    }
  }

  return (
    <section className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </header>

      {(formErrorKey || mutationErrorKey) && (
        <Alert variant="destructive">
          <AlertDescription>{t((formErrorKey ?? mutationErrorKey) as Parameters<typeof t>[0])}</AlertDescription>
        </Alert>
      )}

      {lastSubmitResult && (
        <Alert>
          <AlertDescription>
            {t('result.sent', { recipientCount: lastSubmitResult.recipient_count })}{' '}
            <span className="font-mono text-xs">{lastSubmitResult.broadcast_batch_key}</span>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('form.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notif-type">{t('fields.type')}</Label>
            <Select
              value={form.type}
              onValueChange={(value) => setForm((prev) => ({ ...prev, type: value as NotificationType }))}
            >
              <SelectTrigger id="notif-type" className="w-full max-w-sm">
                <SelectValue placeholder={t('fields.type')} />
              </SelectTrigger>
              <SelectContent>
                {broadcastTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notif-title">{t('fields.title')}</Label>
            <Input
              id="notif-title"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder={t('fields.titlePlaceholder')}
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notif-message">{t('fields.message')}</Label>
            <textarea
              id="notif-message"
              className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.message}
              onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
              placeholder={t('fields.messagePlaceholder')}
              maxLength={5000}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notif-metadata">{t('fields.metadata')}</Label>
            <textarea
              id="notif-metadata"
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
              value={form.metadataText}
              onChange={(event) => setForm((prev) => ({ ...prev, metadataText: event.target.value }))}
              placeholder={t('fields.metadataPlaceholder')}
            />
            <p className="text-xs text-muted-foreground">{t('fields.metadataHint')}</p>
          </div>

          <div className="flex justify-end">
            <Button disabled={isSubmitting} onClick={handleOpenConfirm}>
              {isSubmitting ? t('actions.sending') : t('actions.send')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>{t('history.title')}</CardTitle>
          <Button variant="outline" size="sm" onClick={() => void loadHistory()} disabled={listState.isLoading}>
            {t('history.refresh')}
          </Button>
        </CardHeader>
        <CardContent>
          {listState.errorMessageKey ? (
            <Alert variant="destructive">
              <AlertDescription>{t(listState.errorMessageKey as Parameters<typeof t>[0])}</AlertDescription>
            </Alert>
          ) : null}

          {listState.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : listState.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('history.empty')}</p>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('history.columns.sentAt')}</TableHead>
                    <TableHead>{t('history.columns.title')}</TableHead>
                    <TableHead>{t('history.columns.type')}</TableHead>
                    <TableHead>{t('history.columns.sender')}</TableHead>
                    <TableHead>{t('history.columns.recipients')}</TableHead>
                    <TableHead>{t('history.columns.batch')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listState.data.map((item) => (
                    <TableRow key={item.broadcast_batch_key}>
                      <TableCell>{formatDateTime(item.sent_at, locale)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{truncate(item.message, 96)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.type}</Badge>
                      </TableCell>
                      <TableCell>{item.sender?.username ?? t('history.systemSender')}</TableCell>
                      <TableCell>{item.recipient_count}</TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">{item.broadcast_batch_key}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t('history.total', { total: pagination.count })}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canGoPrevious || listState.isLoading}
                    onClick={() => void loadPage(pagination.page - 1)}
                  >
                    {t('history.previous')}
                  </Button>
                  <span className="text-sm">{t('history.page', { page: pagination.page })}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canGoNext || listState.isLoading}
                    onClick={() => void loadPage(pagination.page + 1)}
                  >
                    {t('history.next')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirm.title')}</DialogTitle>
            <DialogDescription>{t('confirm.description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {t('confirm.cancel')}
            </Button>
            <Button disabled={isSubmitting} onClick={() => void handleSubmitConfirmed()}>
              {isSubmitting ? t('actions.sending') : t('confirm.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
