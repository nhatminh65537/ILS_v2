'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useChallenges } from '@/hooks/useChallenges'
import { ChallengeDifficulty } from '@/types/challenge.types'
import { ChallengeProgressCard } from './ChallengeProgressCard'
import { ChallengeInstancePanel } from './ChallengeInstancePanel'
import { FlagSubmitForm } from './FlagSubmitForm'

type ChallengeDetailClientProps = {
  locale: string
  slug: string
}

const DIFFICULTY_CLASS: Record<ChallengeDifficulty, string> = {
  [ChallengeDifficulty.Easy]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [ChallengeDifficulty.Medium]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  [ChallengeDifficulty.Hard]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  [ChallengeDifficulty.Insane]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export function ChallengeDetailClient({ locale, slug }: ChallengeDetailClientProps) {
  const t = useTranslations('challenges')
  const {
    selectedChallenge,
    challengeProgress,
    instanceStatus,
    submitResult,
    isLoading,
    isSubmitting,
    isInstanceLoading,
    error,
    loadChallengeDetail,
    loadChallengeProgress,
    loadInstanceStatus,
    submitFlag,
    startInstance,
    stopInstance,
  } = useChallenges()

  useEffect(() => {
    void Promise.all([
      loadChallengeDetail(slug),
      loadChallengeProgress(slug),
      loadInstanceStatus(slug),
    ])
  }, [loadChallengeDetail, loadChallengeProgress, loadInstanceStatus, slug])

  if (isLoading && !selectedChallenge) {
    return (
      <section className="space-y-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Skeleton className="h-48 w-full" />
          <div className="space-y-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </section>
    )
  }

  if (error || !selectedChallenge) {
    return (
      <section className="space-y-4">
        <Link href={`/${locale}/challenges`} className="text-sm text-muted-foreground hover:underline">
          ← {t('detail.backToCatalog')}
        </Link>
        <p className="text-sm text-destructive">{t('errors.detailLoadFailed')}</p>
      </section>
    )
  }

  const challenge = selectedChallenge

  return (
    <section className="space-y-6">
      <Link href={`/${locale}/challenges`} className="text-sm text-muted-foreground hover:underline">
        ← {t('detail.backToCatalog')}
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold">{challenge.title}</h1>
          {challenge.difficulty ? (
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${DIFFICULTY_CLASS[challenge.difficulty]}`}>
              {t(`difficulty.${challenge.difficulty}`)}
            </span>
          ) : null}
        </div>
        {challenge.tags && challenge.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {challenge.tags.map((tag) => (
              <Badge key={tag.id} variant="outline" className="text-xs">
                {tag.name}
              </Badge>
            ))}
          </div>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('detail.descriptionTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {challenge.description ? (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{challenge.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{t('detail.noDescription')}</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {challengeProgress ? (
            <ChallengeProgressCard progress={challengeProgress} />
          ) : null}

          <FlagSubmitForm
            isSubmitting={isSubmitting}
            submitResult={submitResult}
            onSubmit={(flag) => { void submitFlag(slug, flag) }}
          />

          {challenge.instance_required ? (
            <ChallengeInstancePanel
              instanceStatus={instanceStatus}
              isInstanceLoading={isInstanceLoading}
              onStart={() => { void startInstance(slug) }}
              onStop={() => { void stopInstance(slug) }}
            />
          ) : null}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('detail.infoTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">{t('labels.points')}</dt>
                  <dd className="font-medium">{challenge.challenge_point}</dd>
                </div>
                {challenge.difficulty ? (
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">{t('filter.difficulty')}</dt>
                    <dd className="font-medium">{t(`difficulty.${challenge.difficulty}`)}</dd>
                  </div>
                ) : null}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
