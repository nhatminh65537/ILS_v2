'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Server } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { InstanceStatus, type ChallengeInstance } from '@/types/challenge.types'

type InstanceState = ChallengeInstance | { status: 'none' } | null

function isRunning(state: InstanceState): state is ChallengeInstance & { status: InstanceStatus.Running } {
  return state !== null && 'id' in state && state.status === InstanceStatus.Running
}

/**
 * Internal instance_info keys that must never be shown to the player (deploy
 * server bookkeeping). The API intentionally still returns them for admins.
 */
const HIDDEN_INSTANCE_INFO_KEYS = new Set(['deploy_instance_id'])

function visibleInstanceInfo(info: Record<string, unknown>): [string, unknown][] {
  return Object.entries(info).filter(([key]) => !HIDDEN_INSTANCE_INFO_KEYS.has(key))
}

/** Live countdown to expires_at. Returns remaining seconds (0 once expired). */
function useRemainingSeconds(expiresAt?: string): number | null {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!expiresAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [expiresAt])
  if (!expiresAt) return null
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000))
}

function formatRemaining(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

type ChallengeInstancePanelProps = {
  instanceStatus: InstanceState
  isInstanceLoading: boolean
  /** Inline error/detail from the last instance action (e.g. BE extend 400). */
  error?: string | null
  onStart: () => void
  onStop: () => void
  onExtend?: () => void
}

export function ChallengeInstancePanel({
  instanceStatus,
  isInstanceLoading,
  error,
  onStart,
  onStop,
  onExtend,
}: ChallengeInstancePanelProps) {
  const t = useTranslations('challenges')

  const running = isRunning(instanceStatus)
  const expiresAt = running ? instanceStatus.expires_at : undefined
  const remaining = useRemainingSeconds(expiresAt)
  // Extend is always offered while running; the backend is the source of truth
  // and rejects (HTTP 400 with a detail message) when it is still too early.
  const canExtend = running && onExtend !== undefined
  const noInstance = instanceStatus === null || (instanceStatus !== null && 'status' in instanceStatus && instanceStatus.status === 'none')

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">{t('instance.title')}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
        ) : null}
        {isInstanceLoading ? (
          <Skeleton className="h-8 w-full" />
        ) : running ? (
          <>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm text-green-600 dark:text-green-400">{t('instance.running')}</span>
            </div>
            {instanceStatus.instance_info ? (
              <div className="rounded-md bg-muted px-3 py-2 font-mono text-xs">
                {visibleInstanceInfo(instanceStatus.instance_info).map(([k, v]) => (
                  <div key={k}>
                    <span className="text-muted-foreground">{k}: </span>
                    <span>{String(v)}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {remaining !== null ? (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t('instance.timeLeft')}</span>
                <span className={`font-mono ${remaining < 60 ? 'text-red-500' : ''}`}>
                  {formatRemaining(remaining)}
                </span>
              </div>
            ) : null}
            {canExtend ? (
              <Button variant="outline" size="sm" onClick={onExtend} className="w-full">
                {t('instance.extend')}
              </Button>
            ) : null}
            <Button variant="destructive" size="sm" onClick={onStop} className="w-full">
              {t('instance.stop')}
            </Button>
          </>
        ) : noInstance ? (
          <>
            <p className="text-sm text-muted-foreground">{t('instance.noInstance')}</p>
            <Button size="sm" onClick={onStart} className="w-full">
              {t('instance.start')}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{t('instance.stopped')}</p>
            <Button size="sm" onClick={onStart} className="w-full">
              {t('instance.restart')}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
