'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
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
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getOtherSessionIds } from '@/lib/auth-sessions'
import { useAuthSessions } from '@/hooks/useAuthSessions'
import type { AuthSessionListItem } from '@/types/user.types'

type ProfileSessionsViewProps = {
  locale: string
}

const formatDateTime = (value: string | undefined, locale: string, fallback: string): string => {
  if (!value) {
    return fallback
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return fallback
  }

  return parsed.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ProfileSessionsView({ locale }: ProfileSessionsViewProps) {
  const t = useTranslations('profile')
  const {
    sessionsState,
    currentSessionId,
    isMutating,
    mutationErrorKey,
    mutationSuccessKey,
    loadSessions,
    revokeSessionById,
    revokeAllOtherSessions,
  } = useAuthSessions()

  const [sessionToRevoke, setSessionToRevoke] = useState<AuthSessionListItem | null>(null)
  const [revokeAllOpen, setRevokeAllOpen] = useState(false)

  useEffect(() => {
    void loadSessions()
  }, [loadSessions])

  const otherSessionIds = useMemo(
    () => getOtherSessionIds(sessionsState.data),
    [sessionsState.data]
  )

  const handleConfirmRevokeOne = async () => {
    if (!sessionToRevoke) {
      return
    }

    const result = await revokeSessionById(sessionToRevoke.id)
    if (result.ok) {
      setSessionToRevoke(null)
    }
  }

  const handleConfirmRevokeAll = async () => {
    const result = await revokeAllOtherSessions()
    if (result.ok) {
      setRevokeAllOpen(false)
    }
  }

  return (
    <div className="space-y-4">
      {mutationSuccessKey && (
        <div className="rounded-md bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
          {t(mutationSuccessKey as Parameters<typeof t>[0])}
        </div>
      )}

      {mutationErrorKey && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {t(mutationErrorKey as Parameters<typeof t>[0])}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base font-medium">{t('sessions.sectionTitle')}</CardTitle>
          <Button
            size="sm"
            variant="outline"
            disabled={isMutating || otherSessionIds.length === 0}
            onClick={() => setRevokeAllOpen(true)}
          >
            {t('sessions.actions.revokeAllOther')}
          </Button>
        </CardHeader>
        <CardContent>
          {sessionsState.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : sessionsState.errorMessageKey ? (
            <p className="text-sm text-destructive">
              {t(sessionsState.errorMessageKey as Parameters<typeof t>[0])}
            </p>
          ) : sessionsState.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('sessions.empty.noSessions')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('sessions.columns.device')}</TableHead>
                  <TableHead>{t('sessions.columns.createdAt')}</TableHead>
                  <TableHead>{t('sessions.columns.lastUsedAt')}</TableHead>
                  <TableHead>{t('sessions.columns.expiresAt')}</TableHead>
                  <TableHead>{t('sessions.columns.status')}</TableHead>
                  <TableHead className="text-right">{t('sessions.columns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionsState.data.map((session) => {
                  const isCurrent = session.id === currentSessionId

                  return (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">
                        {session.device_info?.trim() || t('sessions.fallback.unknownDevice')}
                      </TableCell>
                      <TableCell>
                        {formatDateTime(
                          session.created_at,
                          locale,
                          t('sessions.fallback.notAvailable')
                        )}
                      </TableCell>
                      <TableCell>
                        {formatDateTime(
                          session.last_used_at,
                          locale,
                          t('sessions.fallback.notAvailable')
                        )}
                      </TableCell>
                      <TableCell>
                        {formatDateTime(
                          session.expires_at,
                          locale,
                          t('sessions.fallback.notAvailable')
                        )}
                      </TableCell>
                      <TableCell>
                        {isCurrent ? (
                          <Badge>{t('sessions.status.current')}</Badge>
                        ) : (
                          <Badge variant="secondary">{t('sessions.status.active')}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isMutating || isCurrent}
                          onClick={() => setSessionToRevoke(session)}
                        >
                          {t('sessions.actions.revokeOne')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={sessionToRevoke !== null} onOpenChange={(open) => !open && setSessionToRevoke(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('sessions.confirm.revokeOneTitle')}</DialogTitle>
            <DialogDescription>
              {t('sessions.confirm.revokeOneDescription', {
                device: sessionToRevoke?.device_info?.trim() || t('sessions.fallback.unknownDevice'),
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionToRevoke(null)}>
              {t('sessions.confirm.cancel')}
            </Button>
            <Button variant="destructive" disabled={isMutating} onClick={handleConfirmRevokeOne}>
              {t('sessions.confirm.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={revokeAllOpen} onOpenChange={setRevokeAllOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('sessions.confirm.revokeAllTitle')}</DialogTitle>
            <DialogDescription>{t('sessions.confirm.revokeAllDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeAllOpen(false)}>
              {t('sessions.confirm.cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={isMutating || otherSessionIds.length === 0}
              onClick={handleConfirmRevokeAll}
            >
              {t('sessions.confirm.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
