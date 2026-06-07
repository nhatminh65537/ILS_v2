'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { mapChallengeAdminErrorToMessageKey } from '@/lib/challenge-admin-error-map'
import { syncChallengeGitlab } from '@/services/challenges.service'
import type { Challenge } from '@/types/challenge.types'

type AdminChallengeGitlabTabProps = {
  slug: string
  challenge: Challenge
  onSynced?: () => void
}

/**
 * GitLab tab for an *existing* challenge: sync-only.
 *
 * Importing a brand-new GitLab project is a create action and lives on the
 * explorer ("Import from GitLab"), not here — running an import inside an
 * existing challenge's editor would create a duplicate challenge.
 */
export function AdminChallengeGitlabTab({ slug, challenge, onSynced }: AdminChallengeGitlabTabProps) {
  const t = useTranslations('adminChallenges')

  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  const isGitlab = challenge.source === 'gitlab'
  const gitlab = challenge.gitlab

  const handleSync = async () => {
    setIsSyncing(true)
    setErrorKey(null)
    try {
      await syncChallengeGitlab(slug)
      onSynced?.()
    } catch (error) {
      setErrorKey(mapChallengeAdminErrorToMessageKey(error, 'errors.syncGitlabFailed'))
    } finally {
      setIsSyncing(false)
    }
  }

  if (!isGitlab) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('gitlab.syncTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('gitlab.notLinkedHint')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {errorKey ? <p className="text-sm text-destructive">{t(errorKey as never)}</p> : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('gitlab.syncTitle')}</CardTitle>
          <Button disabled={isSyncing} onClick={() => void handleSync()}>
            {isSyncing ? t('gitlab.syncing') : t('actions.syncGitlab')}
          </Button>
        </CardHeader>
        <CardContent>
          <dl className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">{t('gitlab.project')}</dt>
              <dd className="font-mono">{challenge.gitlab_path || '—'}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">{t('gitlab.lastCommit')}</dt>
              <dd className="font-mono">{gitlab?.last_commit_sha?.slice(0, 10) || '—'}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">{t('gitlab.lastSynced')}</dt>
              <dd>{gitlab?.last_synced_at ? new Date(gitlab.last_synced_at).toLocaleString() : '—'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
