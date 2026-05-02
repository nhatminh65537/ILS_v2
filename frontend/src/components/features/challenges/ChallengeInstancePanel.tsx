'use client'

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

type ChallengeInstancePanelProps = {
  instanceStatus: InstanceState
  isInstanceLoading: boolean
  onStart: () => void
  onStop: () => void
}

export function ChallengeInstancePanel({
  instanceStatus,
  isInstanceLoading,
  onStart,
  onStop,
}: ChallengeInstancePanelProps) {
  const t = useTranslations('challenges')

  const running = isRunning(instanceStatus)
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
