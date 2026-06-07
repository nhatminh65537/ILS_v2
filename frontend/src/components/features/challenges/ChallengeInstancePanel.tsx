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
  /** Only allow extend when remaining time is below this many minutes (config). */
  extendThresholdMinutes?: number
  onStart: () => void
  onStop: () => void
  onExtend?: () => void
}

export function ChallengeInstancePanel({
  instanceStatus,
  isInstanceLoading,
  extendThresholdMinutes = 10,
  onStart,
  onStop,
  onExtend,
}: ChallengeInstancePanelProps) {
  const t = useTranslations('challenges')

  const running = isRunning(instanceStatus)
  const expiresAt = running ? instanceStatus.expires_at : undefined
  const remaining = useRemainingSeconds(expiresAt)
  const canExtend =
    running && onExtend !== undefined && remaining !== null && remaining < extendThresholdMinutes * 60
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
                {Object.entries(instanceStatus.instance_info).map(([k, v]) => (
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
