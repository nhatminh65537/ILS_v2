import { useTranslations } from 'next-intl'
import { CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ChallengeProgressDetailResponse } from '@/types/challenge.types'

type ChallengeProgressCardProps = {
  progress: ChallengeProgressDetailResponse
}

export function ChallengeProgressCard({ progress }: ChallengeProgressCardProps) {
  const t = useTranslations('challenges')

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{t('detail.progressTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {progress.is_solved ? (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">{t('labels.solved')}</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('labels.notSolved')}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {t('labels.attemptCount', { count: progress.attempt_count })}
        </p>
      </CardContent>
    </Card>
  )
}
